import React, { useState } from 'react';
import axios from 'axios';
import './VideoClipper.css';

const VideoClipper = () => {
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('audio'); // 'audio' or 'video'
    const [audioFormat, setAudioFormat] = useState('mp3');

    const handleDownload = async (e) => {
        e.preventDefault();
        setLoading(true);
        setDownloadUrl('');

        try {
            const endpoint = type === 'video' ? 'download-video' : 'download-audio-only';
            const payload = { url, startTime, endTime };
            if (type === 'audio') {
                payload.audioFormat = audioFormat;
            }
            const response = await axios.post(`http://localhost:5000/${endpoint}`, payload);
            setDownloadUrl(response.data.downloadUrl);
        } catch (error) {
            console.error('Error downloading video/audio:', error);
        } finally {
            setLoading(false);
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

                <div className="form-group">
                    <label>Select Output Type:</label>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                value="audio"
                                checked={type === 'audio'}
                                onChange={() => setType('audio')}
                            />
                            Audio Only
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="video"
                                checked={type === 'video'}
                                onChange={() => setType('video')}
                            />
                            Video + Audio
                        </label>
                    </div>
                </div>

                {type === 'audio' && (
                    <div className="form-group">
                        <label>Select Audio Format:</label>
                        <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)}>
                            <option value="mp3">MP3</option>
                            <option value="m4a">M4A</option>
                        </select>
                    </div>
                )}

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading
                        ? type === 'video'
                            ? 'Processing Video...'
                            : 'Processing Audio...'
                        : type === 'video'
                        ? 'Download Video + Audio'
                        : 'Download Audio Only'}
                </button>
            </form>

            {loading && (
                <div className="loader-container">
                    <div className="loader"></div>
                    <p>{type === 'video' ? 'Clipping video...' : 'Clipping audio...'} Please wait...</p>
                </div>
            )}

            {downloadUrl && !loading && (
                <div className="download-section">
                    <h2>Download your {type === 'video' ? 'video' : 'audio'} here:</h2>
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-link"
                    >
                        Download {type === 'video' ? 'Video + Audio' : 'Audio Only'}
                    </a>
                </div>
            )}
        </div>
    );
};

export default VideoClipper;
