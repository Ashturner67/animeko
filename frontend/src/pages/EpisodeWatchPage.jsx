// src/pages/EpisodeWatchPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import YouTubePlayer from '../components/YouTubePlayer';
import '../styles/EpisodeWatchPage.css';

function EpisodeWatchPage() {
    const { animeId, episodeNumber } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [episode, setEpisode] = useState(null);
    const [anime, setAnime] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initialPosition, setInitialPosition] = useState(0);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Fetch anime details
                const animeResponse = await apiFetch(`/api/anime/${animeId}`);
                if (!animeResponse.ok) throw new Error('Failed to fetch anime');
                const animeData = await animeResponse.json();
                setAnime(animeData);

                // Fetch all episodes for this anime
                const episodesResponse = await apiFetch(`/api/episodes/anime/${animeId}`);
                if (!episodesResponse.ok) throw new Error('Failed to fetch episodes');
                const episodesData = await episodesResponse.json();
                setEpisodes(episodesData);

                // Fetch specific episode with authentication if user is logged in
                const headers = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const episodeResponse = await apiFetch(`/api/episodes/anime/${animeId}/episode/${episodeNumber}`, {
                    headers
                });
                if (!episodeResponse.ok) {
                    if (episodeResponse.status === 403) {
                        const errorData = await episodeResponse.json();
                        if (errorData.premiumRequired) {
                            if (errorData.requiresLogin) {
                                throw new Error('This episode requires a premium subscription. Please log in to continue.');
                            } else if (errorData.requiresSubscription) {
                                throw new Error('This episode requires a premium subscription. Please upgrade your account.');
                            } else {
                                throw new Error('This episode requires a premium subscription');
                            }
                        }
                    }
                    throw new Error('Failed to fetch episode');
                }
                const currentEpisode = await episodeResponse.json();
                
                if (!currentEpisode.episode_url_yt_id) {
                    throw new Error('Episode video not available');
                }

                setEpisode(currentEpisode);

                // Fetch user's progress for this episode if authenticated
                if (user && token) {
                    await fetchEpisodeProgress(currentEpisode.episode_id);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [animeId, episodeNumber, user, token]);

    const fetchEpisodeProgress = async (episodeId) => {
        if (!user || !token) return;
        
        try {
            const response = await apiFetch(`/api/watch/progress/${episodeId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                const progress = await response.json();
                if (progress.timestamp_position > 0) {
                    setInitialPosition(progress.timestamp_position);
                }
            }
        } catch (err) {
            console.error('Error fetching episode progress:', err);
        }
    };

    const handleProgress = (timestampPosition, watchedPercentage, completed) => {
        // Progress tracking handled internally
    };

    const handleComplete = () => {
        // Episode completed - no action needed
        // Progress is already tracked by the YouTube player component
    };

    const handleEpisodeChange = (newEpisodeNumber) => {
        navigate(`/anime/${animeId}/episode/${newEpisodeNumber}`);
    };

    const getNextEpisode = () => {
        const currentIndex = episodes.findIndex(ep => ep.episode_number === parseInt(episodeNumber));
        for (let i = currentIndex + 1; i < episodes.length; i++) {
            if (episodes[i].has_video) {
                return episodes[i];
            }
        }
        return null;
    };

    const getPreviousEpisode = () => {
        const currentIndex = episodes.findIndex(ep => ep.episode_number === parseInt(episodeNumber));
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (episodes[i].has_video) {
                return episodes[i];
            }
        }
        return null;
    };

    const getWatchableEpisodes = () => {
        return episodes.filter(ep => ep.has_video);
    };

    if (loading) {
        return (
            <div className="episode-watch-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading episode...</p>
                </div>
            </div>
        );
    }

    if (error) {
        const isPremiumError = error.includes('premium subscription');
        const needsLogin = error.includes('Please log in');
        const needsSubscription = error.includes('upgrade your account');

        return (
            <div className="episode-watch-page">
                <div className="error-container">
                    <h2>Episode Access Restricted</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        {needsLogin && (
                            <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="action-button primary">
                                Log In
                            </Link>
                        )}
                        {needsSubscription && user && (
                            <Link to="/subscription" className="action-button primary">
                                Upgrade to Premium
                            </Link>
                        )}
                        <Link to={`/anime/${animeId}`} className="action-button secondary">
                            Back to Anime
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const nextEpisode = getNextEpisode();
    const previousEpisode = getPreviousEpisode();
    const watchableEpisodes = getWatchableEpisodes();

    return (
        <div className="episode-watch-page">
            {/* Header */}
            <div className="episode-header">
                <div className="breadcrumb">
                    <Link to={`/anime/${animeId}`} className="anime-link">
                        {anime?.title}
                    </Link>
                    <span className="separator">›</span>
                    <span className="current-episode">Episode {episodeNumber}</span>
                </div>
                
                {episode?.title && (
                    <h1 className="episode-title">{episode.title}</h1>
                )}
            </div>

            {/* Video Player */}
            <div className="video-section">
                <div className="video-container">
                    <YouTubePlayer
                        videoId={episode.episode_url_yt_id}
                        episodeId={episode.episode_id}
                        onProgress={handleProgress}
                        onComplete={handleComplete}
                        initialPosition={initialPosition}
                    />
                </div>
            </div>

            {/* Episode Controls */}
            <div className="episode-controls">
                <div className="navigation-controls">
                    <button
                        className="nav-button prev-button"
                        onClick={() => handleEpisodeChange(previousEpisode.episode_number)}
                        disabled={!previousEpisode}
                    >
                        ← Previous Episode
                    </button>

                    <div className="episode-selector">
                        <label htmlFor="episode-select">Jump to Episode:</label>
                        <select
                            id="episode-select"
                            value={episodeNumber}
                            onChange={(e) => handleEpisodeChange(e.target.value)}
                        >
                            {watchableEpisodes.map((ep) => (
                                <option key={ep.episode_id} value={ep.episode_number}>
                                    Episode {ep.episode_number}
                                    {ep.title ? ` - ${ep.title}` : ''}
                                    {ep.premium_only ? ' (PRO)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="nav-button next-button"
                        onClick={() => handleEpisodeChange(nextEpisode.episode_number)}
                        disabled={!nextEpisode}
                    >
                        Next Episode →
                    </button>
                </div>
            </div>

            {/* Episode Info */}
            <div className="episode-info">
                <div className="episode-details">
                    <div className="detail-item">
                        <span className="label">Episode:</span>
                        <span className="value">{episode.episode_number}</span>
                    </div>
                    {episode.duration_seconds && (
                        <div className="detail-item">
                            <span className="label">Duration:</span>
                            <span className="value">
                                {Math.floor(episode.duration_seconds / 60)}:
                                {(episode.duration_seconds % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}
                    {episode.air_date && (
                        <div className="detail-item">
                            <span className="label">Air Date:</span>
                            <span className="value">
                                {new Date(episode.air_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    )}
                    {episode.premium_only && (
                        <div className="detail-item">
                            <span className="premium-tag">PRO EPISODE</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EpisodeWatchPage;
