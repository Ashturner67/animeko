import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAnimeLibraryStatus, toggleFavorite, addToAnimeLibrary, removeFromAnimeLibrary } from '../utils/api';
import placeholder from '../images/image_not_available.jpg';
import '../styles/AnimeCard.css';

function AnimeCard({ anime, initialFavoriteStatus = false }) {
    const { user, token } = useAuth();
    const [isFavorite, setIsFavorite] = useState(initialFavoriteStatus);
    const [libraryStatus, setLibraryStatus] = useState(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const validLibraryStatuses = ['Watching', 'Completed', 'Planned to Watch', 'Dropped', 'On Hold'];

    // Fetch library status
    useEffect(() => {
        if (!user) return;

        fetchAnimeLibraryStatus(anime.id)
            .then(data => {
                setLibraryStatus(data.status);
            })
            .catch(err => {
                console.error('Error fetching library status:', err);
                // Don't prevent the component from rendering
                setLibraryStatus(null);
            });
    }, [anime.id, user, token]);

    const handleToggleFavorite = async (e) => {
        e.preventDefault(); // Prevent navigation
        if (!token) return;
        setFavLoading(true);

        try {
            const result = await toggleFavorite('anime', anime.id);
            setIsFavorite(result.action === 'added');
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setFavLoading(false);
        }
    };

    const handleLibraryAction = async (e, action, newStatus = null) => {
        e.preventDefault(); // Prevent navigation
        if (!user) return;

        setLoading(true);
        try {
            if (action === 'add') {
                await addToAnimeLibrary(anime.id, 'Planned to Watch');
                setLibraryStatus('Planned to Watch');
            } else if (action === 'update') {
                await updateAnimeLibraryStatus(anime.id, { status: newStatus });
                setLibraryStatus(newStatus);
            } else if (action === 'remove') {
                await removeFromAnimeLibrary(anime.id);
                setLibraryStatus(null);
            }
        } catch (err) {
            console.error('Library action error:', err);
        } finally {
            setLoading(false);
            setShowStatusDropdown(false);
        }
    };

    return (
        <div className="anime-card">
            <Link to={`/anime/${anime.id}`} className="anime-card-content">
                <img
                    src={anime.imageUrl || placeholder}
                    alt={anime.title}
                    className="anime-card-image"
                />
                <h3 className="anime-card-title">{anime.title}</h3>
                <div className="anime-card-info">
                    <p className="anime-card-episodes">Episodes: {anime.episodes || 'Unknown'}</p>
                    <p className="anime-card-genre">Genre: {anime.genre || 'Not specified'}</p>
                    <p className="anime-card-season">Season: {anime.season || 'Unknown'}</p>
                    {anime.streaming_available && (
                        <div className="anime-card-streaming-tag">
                            🔴 Streamable
                        </div>
                    )}
                </div>
            </Link>
            
            {user && (
                <div className="anime-card-controls" onClick={e => e.preventDefault()}>
                    <button 
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={handleToggleFavorite}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        disabled={favLoading}
                    >
                        {isFavorite ? '❤️' : '🤍'}
                    </button>

                    <div className="library-controls">
                        {!libraryStatus ? (
                            <button
                                className="add-btn"
                                onClick={(e) => handleLibraryAction(e, 'add')}
                                disabled={loading}
                            >
                                Add
                            </button>
                        ) : (
                            <>
                                <select
                                    value={libraryStatus}
                                    onChange={(e) => handleLibraryAction(e, 'update', e.target.value)}
                                    className="status-select anime-library-filter"
                                    disabled={loading}
                                >
                                    {validLibraryStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className="remove-btn"
                                    onClick={(e) => handleLibraryAction(e, 'remove')}
                                    disabled={loading}
                                >
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AnimeCard;
