// server.js

import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import youtubedl from 'youtube-dl-exec';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';

// __dirname is not available in ES modules, so we need to define it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Specify the full path to FFmpeg
const ffmpegPath = 'C:\\ffmpeg\\bin\\ffmpeg.exe'; // Change this to your actual FFmpeg path

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

// POST /download endpoint
app.post('/download', async (req, res) => {
    try {
        const { url, startTime, endTime } = req.body;

        // Basic validation
        if (!url || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Extract video ID for naming
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL.' });
        }
        console.log("videoId:", videoId);


        const videoFileName = `${videoId}.mp4`;
        const outputFileName = `output_${videoId}_${startTime}_${endTime}.mp4`;
        const videoFilePath = path.join(__dirname, "/input/", videoFileName);
        console.log("videoFilePath", videoFilePath);

        const outputFilePath = path.join(__dirname, outputFileName);

        // Check if output file already exists
        if (fs.existsSync(outputFilePath)) {
            return res.json({ downloadUrl: `http://localhost:5000/${outputFileName}` });
        }

        // Download video using youtube-dl-exec
        console.log(`Downloading video: ${url}`);
        await youtubedl(url, {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
            output: videoFilePath,
        });
        console.log('Download completed. Starting video clipping.');
        console.log("videoFilePath", videoFilePath);

        // Use FFmpeg to clip the video
        // await new Promise((resolve, reject) => {
        //     const ffmpegCommand = `"${ffmpegPath}" -i "${videoFilePath}" -ss ${startTime} -to ${endTime} -c copy "${outputFilePath}"`;
        //     exec(ffmpegCommand, (error, stdout, stderr) => {
        //         if (error) {
        //             console.error(`FFmpeg error: ${error.message}`);
        //             reject(error);
        //         } else {
        //             console.log('Video clipping completed.');
        //             resolve();
        //         }
        //     });
        // });


        // HERE INTRODUCE THE NEW WAY TO CLIP THE DOWNLOADED VIDEO

        // Set the path to your FFmpeg binary if it's not in your PATH
        ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe'); // Adjust this path

        function cutVideo(inputFilePath, outputFilePath, startTime, endTime) {
            ffmpeg(inputFilePath)
                .setStartTime(startTime)
                .setDuration(endTime - startTime)
                .output(outputFilePath)
                .on('end', () => {
                    console.log('Video cut successfully');
                })
                .on('error', (err) => {
                    console.error('Error:', err);
                })
                .run();
        }
        // const inputFile = './input/input_video_1.mp4';
        const basePathName = path.basename(videoFilePath).replace(/\.mp4$/, '');
        const inputFile = videoFilePath;
        console.log("inputFile", inputFile);
        const outputFile = `./output/${basePathName}.mp4`;
        // const start = '2';
        // const end = '10';

        cutVideo(inputFile, outputFile, startTime, endTime);




        // Optionally, delete the original downloaded video to save space
        // fs.unlink(videoFilePath, (err) => {
        //     if (err) {
        //         console.error(`Error deleting original video file: ${err.message}`);
        //     } else {
        //         console.log('Original video file deleted.');
        //     }
        // });

        // Send the download URL back to the client
        res.json({ downloadUrl: `http://localhost:5000/${outputFileName}` });
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
