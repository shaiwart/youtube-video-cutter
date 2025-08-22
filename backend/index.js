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


// __dirname is not available in ES modules, so we need to define it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Specify the full path to FFmpeg
// const ffmpegPath = 'C:\\ffmpeg\\bin\\ffmpeg.exe'; // Change this to your actual FFmpeg path

// Check FFmpeg version (for debugging purposes)
exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`FFmpeg version: ${stdout}`);
});

// Middleware
app.use(cors());
app.use(express.json());



// FUNCTIONS //
function getVideoIdByURL(url) {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    if (!videoId) {
        return null;
    }
    return videoId;
}

function generateOriginalVideoFilePath(videoId) {
    const fileName = `${videoId}.mp4`;
    const filePath = path.join(__dirname, "/input/", fileName);
    const folderPath = path.join(__dirname, "/input/");
    console.log("---->", folderPath);

    return filePath;
}

async function downloadVideo(url) {
    // downloads the video and returns file path
    console.log(`... Stared downloading video ...`);


    // create original video file path
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
    // Read files in the specified folder
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(`Error reading folder: ${err.message}`);
            return;
        }

        // Filter files that contain the videoId
        const matchedFiles = files.filter(file => file.includes(videoId));

        matchedFiles.forEach(file => {
            const filePath = path.join(folderPath, file);
            const ext = path.extname(file);  // Get the file extension (.mp4 or .m4a)

            // Create the new file name by removing any suffix after the videoId
            const newFileName = `${videoId}${ext}`;
            const newFilePath = path.join(folderPath, newFileName);

            // Rename the file
            fs.rename(filePath, newFilePath, (err) => {
                if (err) {
                    console.error(`Error renaming file ${file}: ${err.message}`);
                } else {
                    console.log(`Renamed ${file} to ${newFileName}`);
                }
            });
        });
    });
}

async function mergeFiles(mp4FilePath, m4aFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(mp4FilePath)
            .input(m4aFilePath)
            .audioCodec('aac')   // Re-encode audio to AAC
            .videoCodec('libx264') // Re-encode video to H.264 codec
            .outputOptions('-preset', 'fast')
            .output(outputFilePath)
            .on('end', () => {
                console.log('Merging completed!');
                resolve();  // Resolve the promise when merging is complete
            })
            .on('error', (err) => {
                console.error('Error merging files: ', err);
                reject(err);  // Reject the promise if an error occurs
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
                '-map 0:v:0',      // Maps the first video stream
                '-map 0:a:0',      // Maps the first audio stream
                '-c:v libx264',    // Specifies video codec
                '-c:a aac',        // Specifies audio codec
                '-strict experimental' // Allows AAC codec usage
            ])
            .output(outputFilePath)
            .on('end', () => {
                console.log('Video and audio successfully clipped and saved.');
                resolve();  // Resolve the promise when cutting is complete
            })
            .on('error', (err) => {
                console.error('Error:', err);
                reject(err);  // Reject the promise if an error occurs
            })
            .run();
    });
}




// POST /download endpoint
app.post('/download', async (req, res) => {
    try {
        const { url, startTime, endTime } = req.body;

        // Basic validation
        if (!url || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Extract video ID for naming
        const videoId = getVideoIdByURL(url);
        if (videoId === null) {
            return res.status(400).json({ error: 'Invalid YouTube URL.' });
        }

        const outputFileName = `output_${videoId}_${startTime}_${endTime}.mp4`;
        const outputFilePath = path.join(__dirname, outputFileName);
        // Check if output file already exists
        if (fs.existsSync(outputFilePath)) {
            return res.json({ downloadUrl: `http://localhost:5000/${outputFileName}` });
        }


        const videoFilePath = await downloadVideo(url);
        /*
            1. download the video in separate video and audio format
            2. merge the audio and video file
            3. 
        */

        // Rename files
        const folderPath = path.join(__dirname, '/input/');
        await renameFiles(folderPath, videoId);


        const audioFilePath = videoFilePath.replace('.mp4', '.m4a');
        console.log('videoFilePath', videoFilePath);
        console.log('audioFilePath', audioFilePath);


        // Merging the video and audio
        // const mergedFilePath = await mergeMp4AndM4a(videoFilePath, audioFilePath, videoId);


        // const mergedVideoName = 'mergedVideo.mp4';
        const mergedVideoPath = path.join(__dirname, '/merged-videos/', `${videoId}-merged.mp4`);

        console.log("... start mergin ...");
        await mergeFiles(videoFilePath, audioFilePath, mergedVideoPath);
        console.log("... completing merging ...");



        // Edit the video
        const inputFile = mergedVideoPath;
        const outputFile = `./output/result.mp4`;

        console.log("... start editing ...");
        await cutVideo(inputFile, outputFile, startTime, endTime);
        console.log("... completing editing ...");


        // Send the download URL for the processed video
        // http://localhost:5000//output/result.mp4
        res.json({ downloadUrl: `http://localhost:5000//output/result.mp4` });

    } catch (error) {
        console.error(`Error in /download: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Serve static files (downloadable videos)
app.use(express.static(__dirname));

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
