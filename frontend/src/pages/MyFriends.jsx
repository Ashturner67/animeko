import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { apiCall, apiPost, apiDelete } from '../utils/api';
import placeholderImg from '../images/image_not_available.jpg';
import defaultAvatar from '../images/default_avatar.svg';
import Recommendations from '../components/Recommendations';
import '../styles/MyFriends.css';

export default function MyFriends() {
    const { token } = useAuth();
    const navigate = useNavigate();
    
    // Main tab state
    const [activeMainTab, setActiveMainTab] = useState('friends');
    
    // Friend request and friends state
    const [incoming, setIncoming] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sendMessage, setSendMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch friend requests and friends list
    useEffect(() => {
        if (!token) return;

        const fetchFriendData = async () => {
            try {
                setLoading(true);
                setError('');

                const [incomingData, friendsData, sentData] = await Promise.all([
                    apiCall('/friends/requests', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    apiCall('/friends', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    apiCall('/friends/requests/sent', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                setIncoming(Array.isArray(incomingData) ? incomingData : []);
                setFriends(Array.isArray(friendsData) ? friendsData : []);
                setSentRequests(Array.isArray(sentData) ? sentData : []);
            } catch (err) {
                console.error('Error fetching friend data:', err);
                setError(err.message || 'Failed to load friend data');
            } finally {
                setLoading(false);
            }
        };

        fetchFriendData();
    }, [token]);

    // Search users
    useEffect(() => {
        let isMounted = true;
        
        const searchUsers = async () => {
            const query = searchQuery.trim();
            if (!query) {
                setSearchResults([]);
                return;
            }

            try {
                const data = await apiCall(`/users/search?q=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!isMounted) return;
                
                if (!Array.isArray(data)) {
                    console.error('Invalid search results format:', data);
                    setError('Invalid response format from server');
                    setSearchResults([]);
                    return;
                }
                
                setSearchResults(data);
            } catch (error) {
                if (!isMounted) return;
                console.error('Search error:', error);
                setError('Failed to connect to server');
                setSearchResults([]);
            }
        };

        const debounceTimer = setTimeout(() => {
            searchUsers();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(debounceTimer);
        };
    }, [searchQuery, token]);

    // Handle friend request response
    const respondRequest = async (requesterId, action) => {
        try {
            await apiPost(`/friends/requests/${requesterId}/${action}`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            // Update UI to remove the request
            setIncoming(prev => prev.filter(r => r.user_id !== requesterId));

            // If request was accepted, update friends list
            if (action === 'accept') {
                try {
                    const friendsData = await apiCall('/friends', {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                        },
                        credentials: 'include'
                    });
                    
                    setFriends(friendsData);
                } catch (error) {
                    console.error('Error refreshing friends list:', error);
                }
            }
        } catch (error) {
            console.error('Error responding to friend request:', error);
            setError(error.message || 'Failed to respond to friend request');
        }
    };

    // Send friend request
    const sendFriendRequest = async (toUserId) => {
        try {
            await apiPost('/friends/requests', {
                addresseeId: toUserId
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include'
            });

            // Update UI to show request sent
            setSearchResults(prev => 
                prev.map(user => 
                    user.user_id === toUserId 
                        ? { ...user, friendship_status: 'request_sent' } 
                        : user
                )
            );

            setSendMessage('Friend request sent!');
            setTimeout(() => setSendMessage(''), 3000);
        } catch (error) {
            console.error('Error sending friend request:', error);
            setError(error.message || 'Failed to send friend request');
        }
    };

    // Remove friend
    const removeFriend = async (friendId) => {
        if (!window.confirm('Are you sure you want to remove this friend?')) {
            return;
        }

        try {
            await apiDelete(`/friends/${friendId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            // Update friends list
            try {
                const friendsData = await apiCall('/friends', {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                    },
                    credentials: 'include'
                });

                setFriends(friendsData);
                setSendMessage('Friend removed successfully');
                setTimeout(() => setSendMessage(''), 3000);
            } catch (error) {
                console.error('Error refreshing friends list:', error);
            }
        } catch (error) {
            console.error('Remove friend failed:', error);
            setError(error.message || 'Failed to remove friend');
        }
    };

    // Cancel friend request
    const cancelFriendRequest = async (addresseeId) => {
        if (!window.confirm('Are you sure you want to cancel this friend request?')) {
            return;
        }

        try {
            await apiDelete(`/friends/requests/${addresseeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            // Update UI to reflect cancellation
            setSearchResults(prev => 
                prev.map(user => 
                    user.user_id === addresseeId 
                        ? { ...user, friendship_status: 'none' } 
                        : user
                )
            );
            setSentRequests(prev => prev.filter(request => request.user_id !== addresseeId));
            setSendMessage('Friend request canceled successfully!');
            setTimeout(() => setSendMessage(''), 3000);

        } catch (error) {
            console.error('Error canceling friend request:', error);
            setError(error.message || 'Failed to cancel friend request');
        }
    };

    // Get appropriate button for search result user
    const getButtonForUser = (searchUser) => {
        switch (searchUser.friendship_status) {
            case 'friend':
                return <span className="status-badge friend">Friends</span>;
            case 'request_sent':
                return (
                    <button
                        className="btn-small reject" // Using reject style for cancel
                        onClick={() => cancelFriendRequest(searchUser.user_id)}
                    >
                        Cancel Request
                    </button>
                );
            case 'request_received':
                return (
                    <div>
                        <button
                            className="btn-small accept"
                            onClick={() => respondRequest(searchUser.user_id, 'accept')}
                        >
                            Accept
                        </button>
                        <button
                            className="btn-small reject"
                            onClick={() => respondRequest(searchUser.user_id, 'reject')}
                        >
                            Reject
                        </button>
                    </div>
                );
            default:
                return (
                    <button 
                        onClick={() => sendFriendRequest(searchUser.user_id)}
                        className="btn-small"
                    >
                        Add Friend
                    </button>
                );
        }
    };

    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="my-friends-page">
            <h1>My Friends</h1>

            {/* Main Tab Navigation */}
            <div className="main-tab-navigation">
                <button
                    className={`main-tab-button ${activeMainTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('friends')}
                >
                    Friends & Requests
                </button>
                <button
                    className={`main-tab-button ${activeMainTab === 'recommendations' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('recommendations')}
                >
                    Recommendations
                </button>
            </div>

            {/* Tab Content */}
            {activeMainTab === 'friends' && (
                <div className="friends-tab-content">
                    {/* Incoming Friend Requests */}
                    <section className="friend-requests">
                        <h2>Incoming Friend Requests</h2>
                        <div className="scroll-box incoming-requests-grid">
                            {incoming.length > 0 ? (
                                incoming.map((request) => (
                                    <div key={request.user_id} className="friend-request">
                                        <div className="request-info">
                                            <img
                                                src={request.profile_picture_url || defaultAvatar}
                                                alt={request.display_name || 'User'}
                                                className="friend-avatar"
                                            />
                                            <div>
                                                <div className="user-name">
                                                    {request.display_name}
                                                </div>
                                                <div className="user-username">
                                                    <Link to={`/profile/${request.user_id}`} className="username-link">@{request.username}</Link>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="request-actions">
                                            <button
                                                className="btn-small accept"
                                                onClick={() => respondRequest(request.user_id, 'accept')}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="btn-small reject"
                                                onClick={() => respondRequest(request.user_id, 'reject')}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No pending friend requests</p>
                            )}
                        </div>
                    </section>

                    {/* Sent Friend Requests */}
                    <section className="friend-requests">
                        <h2>Sent Friend Requests</h2>
                        <div className="scroll-box sent-requests-grid">
                            {sentRequests.length > 0 ? (
                                sentRequests.map((request) => (
                                    <div key={request.user_id} className="friend-request">
                                        <div className="request-info">
                                            <img
                                                src={request.profile_picture_url || defaultAvatar}
                                                alt={request.display_name || 'User'}
                                                className="friend-avatar"
                                            />
                                            <div>
                                                <div className="user-name">
                                                    {request.display_name}
                                                </div>
                                                <div className="user-username">
                                                    <Link to={`/profile/${request.user_id}`} className="username-link">@{request.username}</Link>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="request-actions">
                                            <button
                                                className="btn-small reject"
                                                onClick={() => cancelFriendRequest(request.user_id)}
                                            >
                                                Cancel Request
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No sent friend requests</p>
                            )}
                        </div>
                    </section>

                    {/* Friends List */}
                    <section className="friends-list-section">
                        <h2>Your Friends</h2>
                        <div className="scroll-box friends-grid">
                            {friends.length > 0 ? (
                                friends.map((friend) => (
                                    <div key={friend.user_id} className="friend-card">
                                        <div className="friend-avatar-container">
                                            <img
                                                src={friend.profile_picture_url || defaultAvatar}
                                                alt={friend.display_name || 'Friend'}
                                                className="friend-avatar"
                                            />
                                        </div>
                                        <div className="friend-info">
                                            <h3>{friend.display_name || friend.username}</h3>
                                            <p><Link to={`/profile/${friend.user_id}`} className="username-link">@{friend.username}</Link></p>
                                        </div>
                                        <button
                                            className="btn-small unfriend"
                                            onClick={() => removeFriend(friend.user_id)}
                                        >
                                            Unfriend
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p>You don't have any friends yet</p>
                            )}
                        </div>
                    </section>

                    {/* Find Friends */}
                    <section className="find-friends">
                        <h2>Find Friends</h2>
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search by username or display name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {sendMessage && <div className="success-message">{sendMessage}</div>}
                        </div>
                        
                        {searchQuery && searchResults.length === 0 && (
                            <p className="no-results-message">No users found matching your search.</p>
                        )}

                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map((user) => (
                                    <div key={user.user_id} className="search-result-item">
                                        <div className="user-info">
                                            <img
                                                src={user.profile_picture_url || defaultAvatar}
                                                alt={user.display_name || 'User'}
                                                className="user-avatar"
                                            />
                                            <div>
                                                <div className="user-name">
                                                    {user.display_name || 'No display name'}
                                                </div>
                                                <div className="user-username">
                                                    <Link to={`/profile/${user.user_id}`} className="username-link">@{user.username}</Link>
                                                </div>
                                            </div>
                                        </div>
                                        {getButtonForUser(user)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Recommendations Tab */}
            {activeMainTab === 'recommendations' && (
                <div className="recommendations-tab-content">
                    <Recommendations />
                </div>
            )}
        </div>
    );
}
