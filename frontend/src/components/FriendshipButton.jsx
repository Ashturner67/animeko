import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
            const response = await fetch(`/api/friends/status/${targetUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStatus(data.status);
                if (onStatusChange) {
                    onStatusChange(data.status);
                }
            }
        } catch (err) {
            console.error('Error fetching friendship status:', err);
        }
    };

    const handleAction = async (action) => {
        setLoading(true);
        setError('');

        try {
            let response;
            
            switch (action) {
                case 'send_request':
                    response = await fetch('/api/friends/requests', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ addresseeId: parseInt(targetUserId) })
                    });
                    break;

                case 'cancel_request':
                    response = await fetch(`/api/friends/requests/${targetUserId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'accept_request':
                    response = await fetch(`/api/friends/requests/${targetUserId}/accept`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'reject_request':
                    response = await fetch(`/api/friends/requests/${targetUserId}/reject`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                case 'unfriend':
                    // Show confirmation dialog for unfriend action
                    if (!window.confirm('Are you sure you want to unfriend this user?')) {
                        setLoading(false);
                        return;
                    }
                    response = await fetch(`/api/friends/${targetUserId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    break;

                default:
                    throw new Error('Invalid action');
            }

            if (response.ok) {
                // Refresh friendship status
                await fetchFriendshipStatus();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Action failed');
            }
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
