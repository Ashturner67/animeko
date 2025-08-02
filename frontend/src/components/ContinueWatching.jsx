import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/ContinueWatching.css';

const ContinueWatching = ({ limit = 10 }) => {
    const { user, token } = useAuth();
    const [continueWatching, setContinueWatching] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || !token) {
            setContinueWatching([]);
            return;
        }

        fetchContinueWatching();
    }, [user, token]);

    const fetchContinueWatching = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch('/api/watch/continue-watching', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch continue watching');
            }

            const data = await response.json();
            setContinueWatching(data.slice(0, limit));
        } catch (err) {
            console.error('Error fetching continue watching:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const removeFromContinueWatching = async (episodeId) => {
        try {
            const response = await apiFetch(`/api/watch/continue-watching/${episodeId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                setContinueWatching(prev => prev.filter(item => item.episode_id !== episodeId));
            }
        } catch (err) {
            console.error('Error removing from continue watching:', err);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatProgress = (watchedPercentage) => {
        return `${Math.round(watchedPercentage)}%`;
    };

    if (!user) {
        return null;
    }

    if (loading) {
        return (
            <div className="continue-watching">
                <h3>Continue Watching</h3>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="continue-watching">
                <h3>Continue Watching</h3>
                <div className="error-message">
                    <p>Failed to load continue watching: {error}</p>
                    <button onClick={fetchContinueWatching}>Retry</button>
                </div>
            </div>
        );
    }

    if (continueWatching.length === 0) {
        return null; // Don't render anything if no continue watching entries
    }

    return (
        <div className="continue-watching">
            <h3>Continue Watching</h3>
            <div className="continue-watching-grid">
                {continueWatching.map((item) => (
                    <div key={item.episode_id} className="continue-watching-card">
                        <Link 
                            to={`/anime/${item.anime_id}/episode/${item.episode_number}`}
                            className="continue-watching-link"
                        >
                            <div className="anime-poster">
                                {item.anime_image_url ? (
                                    <img 
                                        src={item.anime_image_url} 
                                        alt={item.anime_title}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="placeholder-poster">
                                        <span>{item.anime_title.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="progress-overlay">
                                    <div 
                                        className="progress-bar"
                                        style={{ width: `${item.watched_percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                            </Link>
                        <div className="episode-info">
                            <h4 className="anime-title">
                                <Link to={`/anime/${item.anime_id}`}>{item.anime_title}</Link>
                            </h4>
                            <p className="episode-details">
                                Episode {item.episode_number}
                                {item.episode_title && ` - ${item.episode_title}`}
                            </p>
                        </div>
                        <button 
                            className="remove-button"
                            onClick={(e) => {
                                e.preventDefault();
                                removeFromContinueWatching(item.episode_id);
                            }}
                            title="Remove from continue watching"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContinueWatching;
