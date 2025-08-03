import React, { useState, useEffect } from 'react';
import { AiOutlineLike, AiOutlineDislike, AiFillLike, AiFillDislike } from 'react-icons/ai';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import './ReviewReactionButtons.css';

const ReviewReactionButtons = ({ reviewId, initialLikes = 0, initialDislikes = 0, userReaction = null, onReactionChange = null }) => {
    const { token, user } = useAuth();
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [dislikeCount, setDislikeCount] = useState(initialDislikes);
    const [currentUserReaction, setCurrentUserReaction] = useState(userReaction);
    const [isLoading, setIsLoading] = useState(false);

    // Update state when props change
    useEffect(() => {
        setLikeCount(initialLikes);
        setDislikeCount(initialDislikes);
        setCurrentUserReaction(userReaction);
    }, [initialLikes, initialDislikes, userReaction]);

    const handleReaction = async (reactionType) => {
        if (!token || !user) {
            // Could show a login prompt or toast here
            return;
        }

        if (isLoading) return;

        setIsLoading(true);

        try {
            let response;
            
            // If clicking the same reaction type, remove it
            if (currentUserReaction === reactionType) {
                response = await apiFetch(`/api/reviews/${reviewId}/react`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                // Add or update reaction
                response = await apiFetch(`/api/reviews/${reviewId}/react`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reactionType })
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update reaction');
            }

            const data = await response.json();
            
            // Update local state
            setLikeCount(data.data.likeCount);
            setDislikeCount(data.data.dislikeCount);
            setCurrentUserReaction(data.data.userReaction);

            // Notify parent component if callback provided
            if (onReactionChange) {
                onReactionChange({
                    reviewId,
                    likeCount: data.data.likeCount,
                    dislikeCount: data.data.dislikeCount,
                    userReaction: data.data.userReaction
                });
            }

        } catch (error) {
            console.error('Error updating reaction:', error);
            // Could show an error toast here
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = () => handleReaction('like');
    const handleDislike = () => handleReaction('dislike');

    return (
        <div className="review-reaction-buttons">
            <button
                className={`reaction-btn like-btn ${currentUserReaction === 'like' ? 'active' : ''}`}
                onClick={handleLike}
                disabled={!user || isLoading}
                title={user ? 'Like this review' : 'Login to react'}
            >
                {currentUserReaction === 'like' ? <AiFillLike /> : <AiOutlineLike />}
                <span className="reaction-count">{likeCount}</span>
            </button>

            <button
                className={`reaction-btn dislike-btn ${currentUserReaction === 'dislike' ? 'active' : ''}`}
                onClick={handleDislike}
                disabled={!user || isLoading}
                title={user ? 'Dislike this review' : 'Login to react'}
            >
                {currentUserReaction === 'dislike' ? <AiFillDislike /> : <AiOutlineDislike />}
                <span className="reaction-count">{dislikeCount}</span>
            </button>
        </div>
    );
};

export default ReviewReactionButtons;
