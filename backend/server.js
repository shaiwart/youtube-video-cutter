import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import youtubedl from 'youtube-dl-exec';

const app = express();
app.use(cors());
app.use(express.json());


import ffmpeg from 'fluent-ffmpeg';

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

// Example usage
// const inputFile = './input/input_video_1.mp4'; // ./zBjJUV-lzHo.f606.mp4
const inputFile = './zBjJUV-lzHo.f606.mp4'; // ./zBjJUV-lzHo.f606.mp4 ./zBjJUV-lzHo.mp4
const outputFile = './output/output-video.mp4';

const start = '2';
const end = '10';

cutVideo(inputFile, outputFile, start, end);





app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});