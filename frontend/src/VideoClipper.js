import React, { useState, useEffect} from 'react';
import axios from 'axios';
import './VideoClipper.css';
const SERVER_URL = process.env.REACT_APP_SERVER_URL;
const LOCAL_STORAGE_KEY = 'last_10_links';

const VideoClipper = () => {
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('audio'); // 'audio' or 'video'
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [savedLinks, setSavedLinks] = useState([]);

    // Load saved links on component mount
    useEffect(() => {
        const storedLinks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
        setSavedLinks(storedLinks);
    }, []);

    // Save the current url to localStorage and state
    const saveLink = (newUrl) => {
        if (!newUrl.trim()) return;

        setSavedLinks(prevLinks => {
        // Remove if already exists to avoid duplicates
        const deduped = prevLinks.filter(link => link !== newUrl);

        // Add new link at front
        const updated = [newUrl, ...deduped].slice(0, 10);

        // Update localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
        });
    };

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
            // const SERVER_URL_1 = "http://localhost:5000/";
            // const SERVER_URL_2 = "http://192.168.1.5:5000/";
            const response = await axios.post(`${SERVER_URL}/${endpoint}`, payload);
            setDownloadUrl(response.data.downloadUrl);

            // Save current URL on successful download
            saveLink(url);
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

            <div className="saved-links">
                <h3>Last 10 Links</h3>
                <ul>
                {savedLinks.map((link, idx) => (
                    <li key={idx}>
                    <button
                        type="button"
                        className="saved-link-button"
                        onClick={() => setUrl(link)}
                    >
                        {link}
                    </button>
                    </li>
                ))}
                </ul>
            </div>

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
