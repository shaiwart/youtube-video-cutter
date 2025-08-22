// server.js
import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import youtubedl from 'youtube-dl-exec';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Point ffmpeg for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Check FFmpeg version (debugging)
exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
    if (error) return console.error(`Error: ${error.message}`);
    if (stderr) return console.error(`stderr: ${stderr}`);
    console.log(`FFmpeg version: ${stdout}`);
});

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------- COMMON FUNCTIONS -------------------------
function getVideoIdByURL(url) {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    return videoId || null;
}

// ------------------------- VIDEO + AUDIO FUNCTIONS -------------------------
function generateOriginalVideoFilePath(videoId) {
    return path.join(__dirname, "input", `${videoId}.mp4`);
}

async function downloadVideo(url) {
    console.log(`... Started downloading video ...`);
    const videoFilePath = generateOriginalVideoFilePath(getVideoIdByURL(url));
    await youtubedl(url, {
        format: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4',
        output: videoFilePath,
        postprocessorArgs: ['-f', 'mp4', '-c', 'copy'],
    });
    console.log('... Download completed ...');
    return videoFilePath;
}

async function renameFiles(folderPath, videoId) {
    fs.readdir(folderPath, (err, files) => {
        if (err) return console.error(`Error reading folder: ${err.message}`);
        const matchedFiles = files.filter(file => file.includes(videoId));
        matchedFiles.forEach(file => {
            const filePath = path.join(folderPath, file);
            const ext = path.extname(file);
            const newFilePath = path.join(folderPath, `${videoId}${ext}`);
            fs.rename(filePath, newFilePath, (err) => {
                if (err) console.error(`Error renaming file ${file}: ${err.message}`);
                else console.log(`Renamed ${file} -> ${videoId}${ext}`);
            });
        });
    });
}

async function mergeFiles(mp4FilePath, m4aFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(mp4FilePath)
            .input(m4aFilePath)
            .audioCodec('aac')
            .videoCodec('libx264')
            .outputOptions('-preset', 'fast')
            .output(outputFilePath)
            .on('end', () => {
                console.log('... Merging completed ...');
                resolve();
            })
            .on('error', (err) => {
                console.error('Error merging files:', err);
                reject(err);
            })
            .run();
    });
}

async function cutVideo(inputFilePath, outputFilePath, startTime, endTime) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .setStartTime(startTime)
            .setDuration(endTime - startTime)
            .outputOptions([
                '-map 0:v:0',
                '-map 0:a:0',
                '-c:v libx264',
                '-c:a aac',
                '-strict experimental'
            ])
            .output(outputFilePath)
            .on('end', () => {
                console.log('Video and audio successfully clipped and saved.');
                resolve();
            })
            .on('error', (err) => {
                console.error('Error cutting video:', err);
                reject(err);
            })
            .run();
    });
}

// ------------------------- AUDIO ONLY FUNCTIONS -------------------------
function generateOriginalAudioFilePath(videoId) {
    return path.join(__dirname, "input", `${videoId}.m4a`);
}

async function downloadAudio(url) {
    console.log(`... Started downloading audio ...`);
    const audioFilePath = generateOriginalAudioFilePath(getVideoIdByURL(url));
    await youtubedl(url, {
        extractAudio: true,
        audioFormat: 'm4a',
        output: audioFilePath,
    });
    console.log('... Audio download completed ...');
    return audioFilePath;
}

async function cutAudio(inputFilePath, outputFilePath, startTime, endTime) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .setStartTime(startTime)
            .setDuration(endTime - startTime)
            .outputOptions([
                '-c:a aac',
                '-vn'
            ])
            .output(outputFilePath)
            .on('end', () => {
                console.log('Audio successfully clipped and saved.');
                resolve();
            })
            .on('error', (err) => {
                console.error('Error cutting audio:', err);
                reject(err);
            })
            .run();
    });
}

// ------------------------- ENDPOINTS -------------------------

// 🎥 Download Video + Audio
app.post('/download-video', async (req, res) => {
    try {
        const { url, startTime, endTime } = req.body;
        if (!url || !startTime || !endTime)
            return res.status(400).json({ error: 'Missing required fields.' });

        const videoId = getVideoIdByURL(url);
        if (!videoId)
            return res.status(400).json({ error: 'Invalid YouTube URL.' });

        const outputFileName = `output_${videoId}_${startTime}_${endTime}.mp4`;
        const outputFilePath = path.join(__dirname, "output", outputFileName);

        if (fs.existsSync(outputFilePath)) {
            return res.json({ downloadUrl: `http://localhost:5000/output/${outputFileName}` });
        }

        const videoFilePath = await downloadVideo(url);
        const folderPath = path.join(__dirname, 'input');
        await renameFiles(folderPath, videoId);

        const audioFilePath = videoFilePath.replace('.mp4', '.m4a');
        const mergedVideoPath = path.join(__dirname, 'merged-videos', `${videoId}-merged.mp4`);

        console.log("... Merging started ...");
        await mergeFiles(videoFilePath, audioFilePath, mergedVideoPath);

        console.log("... Cutting started ...");
        await cutVideo(mergedVideoPath, outputFilePath, startTime, endTime);

        res.json({ downloadUrl: `http://localhost:5000/output/${outputFileName}` });

    } catch (error) {
        console.error(`Error in /download: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// 🎵 Download Audio Only
app.post('/download-audio-only', async (req, res) => {
    try {
        const { url, startTime, endTime } = req.body;
        if (!url || !startTime || !endTime)
            return res.status(400).json({ error: 'Missing required fields.' });

        const videoId = getVideoIdByURL(url);
        if (!videoId)
            return res.status(400).json({ error: 'Invalid YouTube URL.' });

        const outputFileName = `audio_${videoId}_${startTime}_${endTime}.m4a`;
        const outputFilePath = path.join(__dirname, "output", outputFileName);

        if (fs.existsSync(outputFilePath)) {
            return res.json({ downloadUrl: `http://localhost:5000/output/${outputFileName}` });
        }

        const audioFilePath = await downloadAudio(url);

        console.log("... Cutting audio ...");
        await cutAudio(audioFilePath, outputFilePath, startTime, endTime);

        res.json({ downloadUrl: `http://localhost:5000/output/${outputFileName}` });

    } catch (error) {
        console.error(`Error in /download-audio: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// ------------------------- STATIC + SERVER -------------------------
app.use(express.static(__dirname));

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🎥 POST /download (video+audio)`);
    console.log(`🎵 POST /download-audio (audio only)`);
});
