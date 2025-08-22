import React, { useState } from 'react';
import axios from 'axios';
import './VideoClipper.css';

const VideoClipper = () => {
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');

    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/download', {
                url,
                startTime,
                endTime,
            });
            setDownloadUrl(response.data.downloadUrl);
        } catch (error) {
            console.error('Error downloading video:', error);
        }
    };

    return (
        <div className="video-clipper">
            <h1>YouTube Video Clipper</h1>
            <form className="video-form" onSubmit={handleDownload}>
                <div className="form-group">
                    <label>Video URL:</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Start Time (seconds):</label>
                    <input
                        type="number"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>End Time (seconds):</label>
                    <input
                        type="number"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="submit-btn">
                    Download and Clip Video
                </button>
            </form>
            {downloadUrl && (
                <div className="download-section">
                    <h2>Download your video here:</h2>
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-link"
                    >
                        Download Video
                    </a>
                </div>
            )}
        </div>
    );
};

export default VideoClipper;
