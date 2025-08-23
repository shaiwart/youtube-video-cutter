import React, { useState, useEffect} from 'react';
import axios from 'axios';
import './VideoClipper.css';
const SERVER_URL = process.env.REACT_APP_SERVER_URL;
const LOCAL_STORAGE_KEY = 'last_10_links';

// Helper to fetch video title from YouTube oEmbed API
const fetchYouTubeTitle = async (videoUrl) => {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
    if (!res.ok) throw new Error('Could not fetch video title');
    const data = await res.json();
    return data.title;
  } catch (err) {
    return ''; // fallback if fetch fails
  }
};

const VideoClipper = () => {
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('audio'); // 'audio' or 'video'
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [savedVideos, setSavedVideos] = useState([]);
    const [currentVideoTitle, setCurrentVideoTitle] = useState('');
    const [fetchingTitle, setFetchingTitle] = useState(false);


    // Load saved links on component mount
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
        setSavedVideos(stored);
    }, []);

    useEffect(() => {
        // Avoid fetching if empty or non-youtube URL
        if (!url || !/^https?:\/\/(www\.)?youtube\.com|youtu\.be/.test(url)) {
            setCurrentVideoTitle('');
            return;
        }

        let cancelled = false;
        setFetchingTitle(true);

        fetchYouTubeTitle(url)
            .then(title => {
                if (!cancelled) setCurrentVideoTitle(title);
            })
            .catch(() => {
                if (!cancelled) setCurrentVideoTitle('');
            })
            .finally(() => {
                if (!cancelled) setFetchingTitle(false);
            });

        return () => { cancelled = true; };
    }, [url]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const setMainUrl = (url) => {
        scrollToTop();

        // adding delay just to show something is happening
        setTimeout(() => {
            setUrl(url);
        }, 500);
    };

    const saveVideo = async (videoUrl) => {
        if (!videoUrl.trim()) return;

        const title = await fetchYouTubeTitle(videoUrl);

        setSavedVideos(prevVideos => {
            // Remove duplicates by url
            const filtered = prevVideos.filter(item => item.url !== videoUrl);

            // Add new link at front
            const updated = [{ title, url: videoUrl }, ...filtered].slice(0, 10);

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
            const response = await axios.post(`${SERVER_URL}/${endpoint}`, payload);
            setDownloadUrl(response.data.downloadUrl);

            // Save current URL on successful download
            await saveVideo(url);
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

                { url && (
                <div className="video-title-preview">
                    {fetchingTitle
                    ? <span>Fetching video title...</span>
                    : currentVideoTitle
                        ? <span>Video Title: <strong>{currentVideoTitle}</strong></span>
                        : <span style={{color:'#888'}}>No title found or invalid link.</span>
                    }
                </div>
                )}


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

            <div className="saved-videos">
                <h3>Last 10 Videos</h3>
                <table>
                    <thead>
                    <tr>
                        <th>Video Title</th>
                        <th>Video Link</th>
                    </tr>
                    </thead>
                    <tbody>
                    {savedVideos.map((item, idx) => (
                        <tr key={idx}>
                        <td>{item.title || 'Unknown'}</td>
                        <td>
                            <button
                                type="button"
                                className="saved-link-button"
                                onClick={() => setMainUrl(item.url)}
                                title={item.url}
                            >
                            Use URL
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default VideoClipper;
