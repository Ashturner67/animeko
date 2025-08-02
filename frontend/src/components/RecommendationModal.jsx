import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import defaultAvatar from '../images/default_avatar.svg';
import '../styles/RecommendationModal.css';

const RecommendationModal = ({ anime, onClose, onRecommendationSent }) => {
    const { token } = useAuth();
    const [friends, setFriends] = useState([]);
    const [selectedFriendId, setSelectedFriendId] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Fetch friends list
    useEffect(() => {
        if (!token) return;

        const fetchFriends = async () => {
            try {
                setLoading(true);
                const response = await apiFetch('/api/friends', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Failed to load friends');
                }

                const friendsData = await response.json();
                setFriends(Array.isArray(friendsData) ? friendsData : []);
            } catch (err) {
                console.error('Error fetching friends:', err);
                setError('Failed to load friends list');
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedFriendId) {
            setError('Please select a friend to recommend to');
            return;
        }

        // Debug logging
        console.log('Submitting recommendation:', {
            selectedFriendId,
            anime,
            animeId: anime?.id || anime?.anime_id,
            receiverId: parseInt(selectedFriendId),
            imageUrl: anime?.imageUrl
        });

        // Get anime ID - check multiple possible field names
        const animeId = anime?.id || anime?.anime_id;
        if (!animeId) {
            console.error('No anime ID found in anime object:', anime);
            setError('Invalid anime data. Please try again.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const requestBody = {
                receiverId: parseInt(selectedFriendId),
                animeId: parseInt(animeId),
                message: message.trim() || null
            };

            console.log('Request body:', requestBody);

            const response = await apiFetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send recommendation');
            }

            // Call the success callback
            if (onRecommendationSent) {
                onRecommendationSent();
            }

            onClose();
        } catch (error) {
            console.error('Error sending recommendation:', error);
            setError(error.message || 'Failed to send recommendation');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!anime) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Recommend Anime">
            <div className="modal-content recommendation-modal" onClick={(e) => e.stopPropagation()}>
                <button 
                    className="close-button" 
                    onClick={onClose}
                    aria-label="Close recommendation modal"
                    type="button"
                >
                    ×
                </button>
                
                <div className="modal-header">
                    <h2>Recommend to Friend</h2>
                    <div className="anime-info">
                        <img 
                            src={
                                anime.imageUrl || 
                                anime.image_url ||
                                anime.poster_url || 
                                '/images/image_not_available.jpg'
                            } 
                            alt={anime.title}
                            className="recommendation-anime-poster"
                            onError={(e) => {
                                console.log('Image failed to load, using fallback');
                                e.target.src = '/images/image_not_available.jpg';
                            }}
                        />
                        <div className="anime-details">
                            <h3>{anime.title}</h3>
                            <p className="anime-synopsis">
                                {anime.synopsis ? 
                                    (anime.synopsis.length > 200 ? 
                                        anime.synopsis.substring(0, 200) + '...' : 
                                        anime.synopsis
                                    ) : 
                                    'No synopsis available'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="recommendation-form">
                    {error && <div className="error-message">{error}</div>}
                    
                    {loading ? (
                        <div className="loading-message">Loading friends...</div>
                    ) : friends.length === 0 ? (
                        <div className="no-friends-message">
                            You don't have any friends to recommend to yet. 
                            Add some friends first!
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="friend-select">Select Friend:</label>
                                <select
                                    id="friend-select"
                                    value={selectedFriendId}
                                    onChange={(e) => setSelectedFriendId(e.target.value)}
                                    required
                                    className="friend-select"
                                >
                                    <option value="">Choose a friend...</option>
                                    {friends.map((friend) => (
                                        <option key={friend.user_id} value={friend.user_id}>
                                            {friend.display_name || friend.username} (@{friend.username})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="message">Message (optional):</label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Add a personal message about why you're recommending this anime..."
                                    rows={3}
                                    maxLength={500}
                                    className="message-textarea"
                                />
                                <small className="character-count">
                                    {message.length}/500 characters
                                </small>
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="btn-secondary"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={submitting || !selectedFriendId}
                                >
                                    {submitting ? 'Sending...' : 'Send Recommendation'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RecommendationModal;
