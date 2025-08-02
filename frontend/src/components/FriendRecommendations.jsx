import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'react-feather';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/FriendRecommendations.css';

const FriendRecommendations = ({ limit = 10 }) => {
    const { user, token } = useAuth();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || !token) {
            setRecommendations([]);
            return;
        }

        fetchRecommendations();
    }, [user, token]);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);

        try {
            let endpoint = '/api/recommendations/received';
            if (limit) {
                endpoint += `?limit=${limit}`;
            }

            const data = await apiFetch(endpoint, {
                method: 'GET'
            });

            setRecommendations(data);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const dismissRecommendation = async (recommendationId) => {
        try {
            await apiFetch(`/api/recommendations/${recommendationId}/dismiss`, {
                method: 'PUT'
            });

            // Remove the dismissed recommendation from the list
            setRecommendations(prev => 
                prev.filter(rec => rec.recommendation_id !== recommendationId)
            );
        } catch (err) {
            console.error('Error dismissing recommendation:', err);
        }
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks}w ago`;
    };

    if (loading) {
        return (
            <div className="friend-recommendations">
                <h3>Recommended by Friends</h3>
                <div className="friend-recommendations-loading">
                    <div className="spinner"></div>
                    <p>Loading recommendations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="friend-recommendations">
                <h3>Recommended by Friends</h3>
                <div className="friend-recommendations-error">
                    <p>Error loading recommendations: {error}</p>
                </div>
            </div>
        );
    }

    // Don't render if no recommendations
    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div className="friend-recommendations">
            <h3>Recommended by Friends</h3>
            <div className="friend-recommendations-grid">
                {recommendations.map((recommendation) => (
                    <div key={recommendation.recommendation_id} className="friend-recommendation-card">
                        <Link 
                            to={`/anime/${recommendation.anime_id}`}
                            className="recommendation-link"
                        >
                            <div className="anime-poster">
                                {recommendation.poster_url ? (
                                    <img 
                                        src={recommendation.poster_url} 
                                        alt={recommendation.title}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="placeholder-poster">
                                        <span>{recommendation.title.charAt(0)}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                        <div className="recommendation-info">
                            <h4 className="anime-title">
                                <Link to={`/anime/${recommendation.anime_id}`}>
                                    {recommendation.title}
                                </Link>
                            </h4>
                            <p className="recommender">
                                by <Link 
                                    to={`/profile/${recommendation.sender_id}`} 
                                    className="friend-name"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {recommendation.sender_display_name || recommendation.sender_username}
                                </Link>
                            </p>
                            <p className="recommendation-time">
                                {formatTimeAgo(recommendation.recommended_at)}
                            </p>
                            {recommendation.message && (
                                <p className="recommendation-message">
                                    "{recommendation.message}"
                                </p>
                            )}
                        </div>
                        <button 
                            className="dismiss-button"
                            onClick={(e) => {
                                e.preventDefault();
                                dismissRecommendation(recommendation.recommendation_id);
                            }}
                            title="Dismiss recommendation"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FriendRecommendations;
