import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiCall, apiPost, apiDelete } from '../utils/api';
import '../styles/FriendshipButton.css';

const FriendshipButton = ({ targetUserId, size = 'normal', onStatusChange }) => {
    const { user, token } = useAuth();
    const [status, setStatus] = useState('none');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Don't show button for own profile or when not authenticated
    if (!user || !token || parseInt(targetUserId) === user.user_id) {
        return null;
    }

    useEffect(() => {
        fetchFriendshipStatus();
    }, [targetUserId, token]);

    const fetchFriendshipStatus = async () => {
        try {
            const data = await apiCall(`/friends/status/${targetUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus(data.status);
            if (onStatusChange) {
                onStatusChange(data.status);
            }
        } catch (err) {
            console.error('Error fetching friendship status:', err);
        }
    };

    const handleAction = async (action) => {
        setLoading(true);
        setError('');

        try {
            let responseData;
            
            switch (action) {
                case 'send_request':
                    responseData = await apiPost('/friends/requests', {
                        addresseeId: parseInt(targetUserId)
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    break;

                case 'cancel_request':
                    responseData = await apiDelete(`/friends/requests/${targetUserId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'accept_request':
                    responseData = await apiPost(`/friends/requests/${targetUserId}/accept`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'reject_request':
                    responseData = await apiPost(`/friends/requests/${targetUserId}/reject`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'unfriend':
                    // Show confirmation dialog for unfriend action
                    if (!window.confirm('Are you sure you want to unfriend this user?')) {
                        setLoading(false);
                        return;
                    }
                    responseData = await apiDelete(`/friends/${targetUserId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                default:
                    throw new Error('Invalid action');
            }

            // Success - update status based on action
            // Refresh friendship status
            await fetchFriendshipStatus();
        } catch (err) {
            console.error('Error performing friendship action:', err);
            setError(err.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    const renderButton = () => {
        const baseClass = `friendship-btn ${size}`;
        
        switch (status) {
            case 'none':
                return (
                    <button 
                        className={`${baseClass} add-friend`}
                        onClick={() => handleAction('send_request')}
                        disabled={loading}
                    >
                        {loading ? '...' : '👤+ Add Friend'}
                    </button>
                );

            case 'request_sent':
                return (
                    <button 
                        className={`${baseClass} cancel-request`}
                        onClick={() => handleAction('cancel_request')}
                        disabled={loading}
                    >
                        {loading ? '...' : '⏳ Cancel Request'}
                    </button>
                );

            case 'request_received':
                return (
                    <div className="friendship-actions">
                        <button 
                            className={`${baseClass} accept-request`}
                            onClick={() => handleAction('accept_request')}
                            disabled={loading}
                        >
                            {loading ? '...' : '✓ Accept'}
                        </button>
                        <button 
                            className={`${baseClass} reject-request`}
                            onClick={() => handleAction('reject_request')}
                            disabled={loading}
                        >
                            {loading ? '...' : '✕ Reject'}
                        </button>
                    </div>
                );

            case 'friends':
                return (
                    <button 
                        className={`${baseClass} unfriend`}
                        onClick={() => handleAction('unfriend')}
                        disabled={loading}
                    >
                        {loading ? '...' : '👥 Unfriend'}
                    </button>
                );

            default:
                return null;
        }
    };

    return (
        <div className="friendship-button-container">
            {renderButton()}
            {error && <div className="friendship-error">{error}</div>}
        </div>
    );
};

export default FriendshipButton;
