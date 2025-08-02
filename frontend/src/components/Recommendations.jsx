import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import defaultAvatar from '../images/default_avatar.svg';
import placeholderImg from '../images/image_not_available.jpg';
import '../styles/Recommendations.css';

export default function Recommendations() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('received');
    const [sentRecommendations, setSentRecommendations] = useState([]);
    const [receivedRecommendations, setReceivedRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Fetch recommendations
    useEffect(() => {
        if (!token) return;

        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                setError('');

                const [sentRes, receivedRes] = await Promise.all([
                    apiFetch('/api/recommendations/sent', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    apiFetch('/api/recommendations/received', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (!sentRes.ok) throw new Error('Failed to load sent recommendations');
                if (!receivedRes.ok) throw new Error('Failed to load received recommendations');

                const [sentData, receivedData] = await Promise.all([
                    sentRes.json(),
                    receivedRes.json()
                ]);

                setSentRecommendations(Array.isArray(sentData) ? sentData : []);
                setReceivedRecommendations(Array.isArray(receivedData) ? receivedData : []);
            } catch (err) {
                console.error('Error fetching recommendations:', err);
                setError(err.message || 'Failed to load recommendations');
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [token]);

    // Dismiss a recommendation
    const dismissRecommendation = async (recommendationId) => {
        try {
            const response = await apiFetch(`/api/recommendations/${recommendationId}/dismiss`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to dismiss recommendation');
            }

            // Remove from received recommendations
            setReceivedRecommendations(prev => 
                prev.filter(rec => rec.recommendation_id !== recommendationId)
            );

            setMessage('Recommendation dismissed successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error dismissing recommendation:', error);
            setError(error.message || 'Failed to dismiss recommendation');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Recommend again (update existing recommendation)
    const recommendAgain = async (recommendation) => {
        try {
            const response = await apiFetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: recommendation.receiver_id,
                    animeId: recommendation.anime_id,
                    message: recommendation.message
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to recommend again');
            }

            setMessage('Recommendation sent again successfully');
            setTimeout(() => setMessage(''), 3000);

            // Refresh sent recommendations to show updated timestamp
            const sentRes = await apiFetch('/api/recommendations/sent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (sentRes.ok) {
                const sentData = await sentRes.json();
                setSentRecommendations(Array.isArray(sentData) ? sentData : []);
            }
        } catch (error) {
            console.error('Error recommending again:', error);
            setError(error.message || 'Failed to recommend again');
            setTimeout(() => setError(''), 3000);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="recommendations-container">
            <h2>Anime Recommendations</h2>

            {/* Success/Error Messages */}
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
                    onClick={() => setActiveTab('received')}
                >
                    Received ({receivedRecommendations.length})
                </button>
                <button
                    className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    Sent ({sentRecommendations.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'received' && (
                    <div className="received-recommendations">
                        {receivedRecommendations.length > 0 ? (
                            <div className="recommendations-list">
                                {receivedRecommendations.map((rec) => (
                                    <div key={rec.recommendation_id} className="recommendation-card-horizontal">
                                        <div className="anime-info-horizontal">
                                            <img
                                                src={rec.poster_url || placeholderImg}
                                                alt={rec.title}
                                                className="rec-anime-poster"
                                            />
                                            <div className="anime-details-horizontal">
                                                <Link to={`/anime/${rec.anime_id}`} className="anime-title-horizontal">
                                                    {rec.title}
                                                </Link>
                                                <p className="anime-synopsis-horizontal">
                                                    {rec.synopsis ? 
                                                        (rec.synopsis.length > 200 ? 
                                                            rec.synopsis.substring(0, 200) + '...' : 
                                                            rec.synopsis
                                                        ) : 
                                                        'No synopsis available'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="recommendation-meta-horizontal">
                                            <div className="sender-info-horizontal">
                                                <img
                                                    src={rec.sender_profile_picture_url || defaultAvatar}
                                                    alt={rec.sender_display_name || rec.sender_username}
                                                    className="sender-avatar-horizontal"
                                                />
                                                <div className="sender-details">
                                                    <div className="sender-name-horizontal">
                                                        Recommended by{' '}
                                                        <Link to={`/profile/${rec.sender_id}`} className="sender-link">
                                                            {rec.sender_display_name || rec.sender_username}
                                                        </Link>
                                                    </div>
                                                    <div className="recommendation-date-horizontal">
                                                        {formatDate(rec.recommended_at)}
                                                    </div>
                                                    {rec.message && (
                                                        <div className="recommendation-message-horizontal">
                                                            <strong>Message:</strong> {rec.message}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <button
                                                className="btn-small dismiss-btn"
                                                onClick={() => dismissRecommendation(rec.recommendation_id)}
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-recommendations">No recommendations received yet</p>
                        )}
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div className="sent-recommendations">
                        {sentRecommendations.length > 0 ? (
                            <div className="recommendations-list">
                                {sentRecommendations.map((rec) => (
                                    <div key={rec.recommendation_id} className="recommendation-card-horizontal">
                                        <div className="anime-info-horizontal">
                                            <img
                                                src={rec.poster_url || placeholderImg}
                                                alt={rec.title}
                                                className="rec-anime-poster"
                                            />
                                            <div className="anime-details-horizontal">
                                                <Link to={`/anime/${rec.anime_id}`} className="anime-title-horizontal">
                                                    {rec.title}
                                                </Link>
                                                <p className="anime-synopsis-horizontal">
                                                    {rec.synopsis ? 
                                                        (rec.synopsis.length > 200 ? 
                                                            rec.synopsis.substring(0, 200) + '...' : 
                                                            rec.synopsis
                                                        ) : 
                                                        'No synopsis available'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="recommendation-meta-horizontal">
                                            <div className="receiver-info-horizontal">
                                                <img
                                                    src={rec.receiver_profile_picture_url || defaultAvatar}
                                                    alt={rec.receiver_display_name || rec.receiver_username}
                                                    className="receiver-avatar-horizontal"
                                                />
                                                <div className="receiver-details">
                                                    <div className="receiver-name-horizontal">
                                                        Recommended to{' '}
                                                        <Link to={`/profile/${rec.receiver_id}`} className="receiver-link">
                                                            {rec.receiver_display_name || rec.receiver_username}
                                                        </Link>
                                                    </div>
                                                    <div className="recommendation-date-horizontal">
                                                        {formatDate(rec.recommended_at)}
                                                    </div>
                                                    {rec.message && (
                                                        <div className="recommendation-message-horizontal">
                                                            <strong>Message:</strong> {rec.message}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <button
                                                className="btn-small recommend-again-btn"
                                                onClick={() => recommendAgain(rec)}
                                            >
                                                Recommend Again
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-recommendations">No recommendations sent yet</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
