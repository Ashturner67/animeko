import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useParams } from 'react-router-dom';
import '../styles/AnimeLibrary.css';
import placeholder from '../images/image_not_available.jpg';

const validStatuses = ['All', 'Watching', 'Completed', 'Planned to Watch', 'Dropped', 'On Hold'];

function AnimeLibrary() {
    const { token, user: currentUser } = useContext(AuthContext);
    const { userId } = useParams();

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
            if (!token || !targetUserId) {
                setError('You must be logged in to view your library.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                let url = `/api/anime-library/user/${targetUserId}`;
                if (filterStatus !== 'All') {
                    url += `?status=${filterStatus}`;
                }
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch library');
                }

                const responseData = await response.json();
                setLibrary(Array.isArray(responseData.library) ? responseData.library : []);
                // Set the username from the response data
                if (responseData.user && responseData.user.username) {
                    setViewedUsername(responseData.user.username);
                } else {
                    setViewedUsername('User'); // Fallback if username is not provided
                }
            } catch (err) {
                console.error('Error fetching library:', err);
                setError(err.message || 'Failed to load your anime library.');
            } finally {
                setLoading(false);
            }
        };

        fetchLibrary();
    }, [token, filterStatus, targetUserId]);

    const handleUpdateStatus = async (animeId, newStatus) => {
        if (!token || !isOwnLibrary) return;
        try {
            const response = await fetch(`/api/anime-library/${animeId}`, {
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
            const response = await fetch(`/api/anime-library/${animeId}`, {
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
