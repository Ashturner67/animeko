// src/pages/Profile.jsx
import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import VisibilityToggle from '../components/VisibilityToggle';
import VisibilityRestriction from '../components/VisibilityRestriction';
import FriendshipButton from '../components/FriendshipButton';
import { fetchUserProfile, fetchUserFavorites, VisibilityError, NotFoundError, apiFetch } from '../utils/api';
import placeholderImg from '../images/image_not_available.jpg';
import defaultAvatar from '../images/default_avatar.svg';
import '../styles/Profile.css';
import '../styles/AnimeImageInput.css';

export default function Profile() {
    const {userId} = useParams(); // If present, viewing someone else's profile
    const {user: currentUser, token, updateProfile, logout} = useAuth();
    const navigate = useNavigate();

    const isOwnProfile = !userId || userId === currentUser?.user_id?.toString();
    const viewingUserId = isOwnProfile ? currentUser?.user_id : userId;

    const [profileUser, setProfileUser] = useState(isOwnProfile ? currentUser : null);
    const [loading, setLoading] = useState(!isOwnProfile);
    const [error, setError] = useState('');

    // Profile‐edit state (own profile only)
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        display_name: '', profile_bio: '', profile_picture_url: '', visibility_level: 'public'
    });
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [editError, setEditError] = useState('');
    const [editMessage, setEditMessage] = useState('');

    // Favorites state
    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [favoritesError, setFavoritesError] = useState('');

    // Initialize form data when profileUser changes
    useEffect(() => {
        if (profileUser && isOwnProfile) {
            console.log('Setting form data from profileUser:', profileUser);
            setFormData({
                display_name: profileUser.display_name || '', 
                profile_bio: profileUser.profile_bio || '', 
                profile_picture_url: profileUser.profile_picture_url || '',
                visibility_level: profileUser.visibility_level || 'public'
            });
        }
    }, [profileUser, isOwnProfile]);

        // Fetch profile data (own or someone else's)
    useEffect(() => {
        // For viewing own profile, require authentication
        if (isOwnProfile && !token) {
            navigate('/login');
            return;
        }

        const fetchProfileData = async () => {
            try {
                setLoading(true);
                setError('');

                if (isOwnProfile) {
                    // For own profile, fetch fresh data to get latest visibility settings
                    const profileRes = await apiFetch('/api/auth/profile', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        console.log('Fetched profile data:', profileData);
                        setProfileUser(profileData);
                    } else {
                        console.log('Profile fetch failed, using currentUser:', currentUser);
                        setProfileUser(currentUser);
                    }
                } else {
                    // For other users' profiles, use API utility that handles visibility
                    try {
                        const userData = await fetchUserProfile(userId);
                        setProfileUser(userData);
                        
                        // If profile is restricted, clear error as we'll show minimal info
                        if (userData.restricted) {
                            setError('');
                        }
                    } catch (err) {
                        if (err instanceof VisibilityError) {
                            // This shouldn't happen anymore since backend returns minimal data
                            setError('visibility_restricted');
                        } else if (err instanceof NotFoundError) {
                            setError('User not found');
                        } else {
                            setError(err.message || 'Failed to load profile');
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [token, userId, currentUser, isOwnProfile, navigate]);

    // Fetch favorites for the profile being viewed (with visibility checks)
    useEffect(() => {
        if (!viewingUserId) return;
        
        const fetchFavorites = async () => {
            setFavoritesLoading(true);
            setFavoritesError('');
            
            try {
                if (isOwnProfile && token) {
                    // For own profile, use authenticated endpoint
                    const response = await apiFetch('/api/favorites', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        setFavorites(Array.isArray(data) ? data : []);
                    } else {
                        throw new Error('Failed to fetch favorites');
                    }
                } else {
                    // For other users' profiles, use the new API endpoint with visibility checks
                    const favoritesData = await fetchUserFavorites(viewingUserId);
                    setFavorites(Array.isArray(favoritesData) ? favoritesData : []);
                }
            } catch (error) {
                console.error('Error fetching favorites:', error);
                if (error instanceof VisibilityError) {
                    setFavoritesError('This user\'s favorites are private.');
                } else {
                    setFavoritesError('Failed to load favorites');
                }
                setFavorites([]);
            } finally {
                setFavoritesLoading(false);
            }
        };
        
        fetchFavorites();
    }, [viewingUserId, isOwnProfile, token]);

    // Profile edit handlers
    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((f) => ({...f, [name]: value}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditMessage('');

        try {
            setLoadingEdit(true);
            const response = await updateProfile(formData);

            setEditMessage('Profile updated successfully');
            setIsEditing(false);
            
            // Update the profile user with the latest data from the response
            if (response && response.user) {
                setProfileUser(response.user);
            }
        } catch (err) {
            setEditError(err.message || 'Failed to update profile');
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            display_name: profileUser.display_name || '', 
            profile_bio: profileUser.profile_bio || '',
            profile_picture_url: profileUser.profile_picture_url || '',
            visibility_level: profileUser.visibility_level || 'public'
        });
        setEditError('');
        setEditMessage('');
        setIsEditing(false);
    };

    // Loading/Error states
    if (loading) {
        return (
            <div className="spinner-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        if (error === 'visibility_restricted') {
            return (
                <div className="profile-page">
                    <div className="profile-card">
                        <VisibilityRestriction 
                            type="profile"
                            message={currentUser ? 
                                "This user's profile is private or only visible to friends." :
                                "This user's profile is private. Please log in if you're friends with this user."
                            }
                            showLoginButton={!currentUser}
                        />
                    </div>
                </div>
            );
        }
        
        return (
            <div className="profile-page">
                <div className="profile-card">
                    <div className="profile-error">{error}</div>
                    {isOwnProfile ? (
                        <button onClick={() => navigate('/login')}>
                            Please log in
                        </button>
                    ) : (
                        <p>Please try again later.</p>
                    )}
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="loading">
                {isOwnProfile ? 'Please log in to view your profile…' : 'No profile data found'}
            </div>
        );
    }

    const profileTitle = isOwnProfile ? 'My Profile' : `${profileUser.display_name || profileUser.username}'s Profile`;
    const favoritesPrefix = isOwnProfile ? 'Favorite' : 'Their Favorite';

    return (
        <div className="profile-page">
            {/* Back button if viewing someone else's profile */}
            

            {/* Profile Card */}
            <div className="profile-card">
                <h2>{profileTitle}</h2>
                <img
                    src={profileUser.profile_picture_url || defaultAvatar}
                    alt="Profile"
                    className="user-profile-pic"
                />

                {editError && <div className="profile-error">{editError}</div>}
                {editMessage && <div className="profile-success">{editMessage}</div>}

                {isOwnProfile && isEditing ? (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleChange}
                                disabled={loadingEdit}
                            />
                        </div>
                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="profile_bio"
                                value={formData.profile_bio}
                                onChange={handleChange}
                                rows="3"
                                disabled={loadingEdit}
                            />
                        </div>
                        <div className="form-group">
                            <label>Profile Picture URL</label>
                            <input
                                name="profile_picture_url"
                                value={formData.profile_picture_url}
                                onChange={handleChange}
                                disabled={loadingEdit}
                            />
                            <div className="anime-url-hint">
                                Paste a direct link to a profile image (JPG, PNG, WEBP)
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Profile Visibility</label>
                            <VisibilityToggle
                                value={formData.visibility_level}
                                onChange={(value) => setFormData(prev => ({...prev, visibility_level: value}))}
                                disabled={loadingEdit}
                            />
                        </div>
                        <div className="profile-buttons">
                            <button type="submit" disabled={loadingEdit}>
                                {loadingEdit ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={handleCancel} disabled={loadingEdit}>
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="profile-info">
                        {profileUser.restricted ? (
                            // Show minimal info for restricted profiles
                            <>
                                <p>
                                    <span className="profile-field-label">Username:</span>
                                    <span className="profile-field-value">{profileUser.username}</span>
                                </p>
                                <p>
                                    <span className="profile-field-label">Display Name:</span>
                                    <span className="profile-field-value">{profileUser.display_name || 'Not set'}</span>
                                </p>
                                <p>
                                    <span className="profile-field-label">Bio:</span>
                                    <span className="profile-field-value">{profileUser.profile_bio || 'No bio provided'}</span>
                                </p>
                                <div className="visibility-notice">
                                    <p className="restricted-message">
                                        🔒 {profileUser.message}
                                    </p>
                                </div>
                                <div className="profile-buttons">
                                    {currentUser && <FriendshipButton targetUserId={viewingUserId} />}
                                </div>
                            </>
                        ) : (
                            // Show full info for accessible profiles
                            <>
                                <p>
                                    <span className="profile-field-label">Username:</span>
                                    <span className="profile-field-value">{profileUser.username}</span>
                                </p>
                                {isOwnProfile && (
                                    <p>
                                        <span className="profile-field-label">Email:</span>
                                        <span className="profile-field-value">{profileUser.email}</span>
                                    </p>
                                )}
                                <p>
                                    <span className="profile-field-label">Display Name:</span>
                                    <span className="profile-field-value">{profileUser.display_name || 'Not set'}</span>
                                </p>
                                <p>
                                    <span className="profile-field-label">Bio:</span>
                                    <span className="profile-field-value">{profileUser.profile_bio || 'No bio provided'}</span>
                                </p>
                                {isOwnProfile && (
                                    <p>
                                        <span className="profile-field-label">Profile Visibility:</span>
                                        <span className="profile-field-value">
                                            {(profileUser.visibility_level === 'public' || !profileUser.visibility_level) && '🌍 Public'}
                                            {profileUser.visibility_level === 'friends_only' && '👥 Friends Only'}
                                            {profileUser.visibility_level === 'private' && '🔒 Private'}
                                        </span>
                                    </p>
                                )}
                                <p>
                                    <span className="profile-field-label">Member Since:</span>
                                    <span className="profile-field-value">{new Date(profileUser.created_at).toLocaleDateString()}</span>
                                </p>
                                <div className="profile-buttons">
                                    {isOwnProfile && (
                                        <button onClick={() => setIsEditing(true)}>
                                            Edit Profile
                                        </button>
                                    )}
                                    <button onClick={() => navigate(isOwnProfile ? '/anime-library' : `/anime-library/${viewingUserId}`)}>
                                        Anime Library
                                    </button>
                                    {!isOwnProfile && (
                                        <FriendshipButton targetUserId={viewingUserId} />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Favorites Section - Show for all users based on visibility */}
            <section className="favorites-section">
                <h3>Favorites</h3>
                {favoritesLoading ? (
                    <div className="favorites-loading">
                        <div className="spinner"></div>
                        <p>Loading favorites...</p>
                    </div>
                ) : favoritesError ? (
                    <div className="favorites-error">
                        <p>{favoritesError}</p>
                    </div>
                ) : (
                    ['anime', 'character', 'voice_actor'].map((type) => (
                        <div key={type} className="favorite-type-container">
                            <h4>
                                {favoritesPrefix} {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </h4>
                            <div className="scroll-box fav-grid">
                                {favorites.filter((f) => f.entityType === type).length > 0 ? (
                                    favorites
                                        .filter((f) => f.entityType === type)
                                        .map((f) => {
                                            const path = `/${type === 'voice_actor' ? 'va' : type}/${f.entityId}`;
                                            return (
                                                <div key={`${type}-${f.entityId}`} className="fav-item">
                                                    <Link to={path} className="fav-card">
                                                        <img
                                                            src={f.imageUrl || placeholderImg}
                                                            alt={f.name}
                                                            className="fav-image"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = placeholderImg;
                                                            }}
                                                        />
                                                        <span className="fav-name">{f.name}</span>
                                                    </Link>
                                                </div>
                                            );
                                        })
                                ) : (
                                    <p>No favorite {type}s yet</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
