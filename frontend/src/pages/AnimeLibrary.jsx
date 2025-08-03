import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiFetch, fetchUserLibrary, VisibilityError, NotFoundError } from '../utils/api';
import VisibilityRestriction from '../components/VisibilityRestriction';
import '../styles/AnimeLibrary.css';
import placeholder from '../images/image_not_available.jpg';

const validStatuses = ['All', 'Watching', 'Completed', 'Planned to Watch', 'Dropped', 'On Hold'];

function AnimeLibrary() {
    const { token, user: currentUser } = useContext(AuthContext);
    const { userId } = useParams();
    const navigate = useNavigate();

    const isOwnLibrary = !userId || userId === currentUser?.user_id?.toString();
    const targetUserId = isOwnLibrary ? currentUser?.user_id : userId;
    const [library, setLibrary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewedUsername, setViewedUsername] = useState('');

    useEffect(() => {
        const fetchLibrary = async () => {
            // For own library, require authentication
            if (isOwnLibrary && !token) {
                navigate('/login');
                return;
            }

            // For viewing other users' libraries, don't require authentication
            if (!targetUserId) {
                setError('Invalid user ID');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const statusFilter = filterStatus !== 'All' ? filterStatus : null;
                const responseData = await fetchUserLibrary(targetUserId, statusFilter);
                
                setLibrary(Array.isArray(responseData.library) ? responseData.library : []);
                // Set the username from the response data
                if (responseData.user && responseData.user.username) {
                    setViewedUsername(responseData.user.username);
                } else if (isOwnLibrary && currentUser) {
                    setViewedUsername(currentUser.username);
                }
            } catch (err) {
                console.error('Library fetch error:', err);
                if (err instanceof VisibilityError) {
                    setError('visibility_restricted');
                } else if (err instanceof NotFoundError) {
                    setError('User not found');
                } else {
                    setError(err.message || 'Failed to fetch library');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLibrary();
    }, [token, targetUserId, filterStatus, isOwnLibrary, currentUser, navigate]);

    const handleUpdateStatus = async (animeId, newStatus) => {
        if (!token || !isOwnLibrary) return;
        try {
            const response = await apiFetch(`/api/anime-library/${animeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update status');
            }

            // Update local state
            setLibrary((prevLibrary) =>
                prevLibrary.map((anime) =>
                    anime.anime_id === animeId ? { ...anime, status: newStatus } : anime
                )
            );
        } catch (err) {
            console.error('Error updating status:', err);
            alert(err.message);
        }
    };

    const handleRemoveAnime = async (animeId) => {
        if (!token || !isOwnLibrary) return;
        if (!window.confirm('Are you sure you want to remove this anime from your library?')) {
            return;
        }
        try {
            const response = await apiFetch(`/api/anime-library/${animeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to remove anime');
            }

            // Update local state
            setLibrary((prevLibrary) =>
                prevLibrary.filter((anime) => anime.anime_id !== animeId)
            );
        } catch (err) {
            console.error('Error removing anime:', err);
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="anime-library-container">
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p>Loading your library...</p>
                </div>
            </div>
        );
    }

    if (error) {
        if (error === 'visibility_restricted') {
            return (
                <div className="anime-library-container">
                    <VisibilityRestriction 
                        type="library"
                        message={currentUser ? 
                            "This user's anime library is private or only visible to friends." :
                            "This user's anime library is private. Please log in if you're friends with this user."
                        }
                        showLoginButton={!currentUser}
                    />
                </div>
            );
        }
        
        return (
            <div className="anime-library-container">
                <p className="error-message">{error}</p>
            </div>
        );
    }

    const filteredLibrary = library.filter(anime => {
        const matchesStatus = filterStatus === 'All' || anime.status === filterStatus;
        const matchesSearch = anime.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="anime-library-container">
            {isOwnLibrary && (
                <div className="refresh-notice">
                    ⚠️ To see status changes made here, refresh the page
                </div>
            )}
            
            <h2>{isOwnLibrary ? 'My Anime Library' : `${viewedUsername}'s Anime Library`}</h2>

            <div className="filter-controls">
                <div className="filter-group">
                    <label htmlFor="status-filter">Filter by Status:</label>
                    <select
                        id="status-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="anime-library-filter"
                    >
                        {validStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
                <input
                    type="text"
                    placeholder="Search anime by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {filteredLibrary.length === 0 ? (
                <p>No anime found.</p>
            ) : (
                <div className="library-grid">
                    {filteredLibrary.map((anime) => (
                        <div key={anime.anime_id} className="library-item-card">
                            <Link to={`/anime/${anime.anime_id}`}>
                                <img
                                    src={anime.image_url || placeholder}
                                    alt={`${anime.title} poster`}
                                    className="library-item-poster"
                                />
                                <h3>{anime.title}</h3>
                            </Link>
                            <p>Status: {anime.status}</p>
                            {isOwnLibrary && (
                                <div className="library-item-actions">
                                    <select
                                        value={anime.status}
                                        onChange={(e) => handleUpdateStatus(anime.anime_id, e.target.value)}
                                        className="anime-library-filter"
                                    >
                                        {validStatuses.filter(s => s !== 'All').map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleRemoveAnime(anime.anime_id)} className="remove-btn">
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AnimeLibrary;
