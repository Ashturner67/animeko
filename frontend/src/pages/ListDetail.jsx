// src/pages/ListDetail.js
import React, {useEffect, useState} from 'react';
import {Link, useParams, useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import VisibilityToggle from '../components/VisibilityToggle';
import VisibilityRestriction from '../components/VisibilityRestriction';
import { fetchList, VisibilityError, NotFoundError } from '../utils/api';
import placeholderImg from '../images/image_not_available.jpg';
import '../styles/ListDetail.css';

export default function ListDetail() {
    const {id} = useParams();
    const {token, user} = useAuth();

    // Updated state structure to match expected API response
    const [list, setList] = useState({
        id: null,
        title: '',
        created_at: '',
        user_id: null,
        items: []
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [enterPressed, setEnterPressed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [addingAnime, setAddingAnime] = useState(null); // Track which anime is being added
    const [removingAnime, setRemovingAnime] = useState(null); // Track which anime is being removed

    // List editing state
    const [isEditingList, setIsEditingList] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedVisibility, setEditedVisibility] = useState('public');
    const [saving, setSaving] = useState(false);

    // Fetch list metadata & items
    useEffect(() => {
        const fetchListData = async () => {
            setLoading(true);
            setError(null);

            try {
                const listData = await fetchList(id);
                setList({
                    ...listData,
                    items: Array.isArray(listData.items) ? listData.items : []
                });
                
                // Initialize editing state
                setEditedTitle(listData.title || '');
                setEditedVisibility(listData.visibility_level || 'public');
            } catch (err) {
                console.error('Error fetching list:', err);
                if (err instanceof VisibilityError) {
                    setError('visibility_restricted');
                } else if (err instanceof NotFoundError) {
                    setError('List not found');
                } else {
                    setError(err.message || 'Failed to load list');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchListData();
    }, [id]);

    // Determine if current user is the owner
    const isOwner = user && list.user_id === user.user_id;

    // Live‐fetch anime suggestions while typing
    useEffect(() => {
        if (!searchTerm || !token) return;
        if (!enterPressed) return;

        const baseUrl = '';
        
        const timeout = setTimeout(() => {
            setIsSearching(true);
            apiFetch(`${baseUrl}/api/animes?title=${encodeURIComponent(searchTerm)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setSearchResults(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error('Search error:', err);
                setSearchResults([]);
            })
            .finally(() => {
                setIsSearching(false);
            });
        }, 400);

        return () => clearTimeout(timeout);
    }, [searchTerm, token, enterPressed]);

    // Get image URL with fallback to placeholder
    const getImage = (item) => {
        // Try multiple possible image URL sources
        return item.image_url || item.anime?.image_url || placeholderImg;
    };

    const handleAddAnime = async (animeId) => {
        if (!isOwner || !token || addingAnime === animeId) return;

        const baseUrl = '';
        
        setAddingAnime(animeId); // Set loading state for this specific anime

        try {
            // Prevent duplicate
            const existingIds = new Set(list.items.map((i) => i.anime_id));
            if (existingIds.has(animeId)) {
                setAddingAnime(null);
                return;
            }

            // Create a new entry
            const newEntry = {
                anime_id: animeId,
                note: ''
            };

            const updatedItems = [...list.items, newEntry];

            const response = await apiFetch(`${baseUrl}/api/lists/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: list.title, // Include the title to prevent it from being cleared
                    animeEntries: updatedItems
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to add anime: ${response.status}`);
            }

            // On success, update the list with the returned data
            const updatedList = await response.json();
            setList({
                ...updatedList,
                items: Array.isArray(updatedList.items) ? updatedList.items : []
            });

        } catch (err) {
            console.error('Error adding anime:', err);
            setError(err.message);
        } finally {
            setAddingAnime(null); // Clear loading state
        }
    };

    // Remove an anime from the list (only if owner)
    const handleRemoveAnime = async (animeId) => {
        if (!isOwner || !token || removingAnime === animeId) return;

        const baseUrl = '';
        
        setRemovingAnime(animeId); // Set loading state for this specific anime

        try {
            const updatedEntries = list.items.filter((i) => i.anime_id !== animeId);

            const response = await apiFetch(`${baseUrl}/api/lists/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: list.title,
                    animeEntries: updatedEntries
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to remove anime: ${response.status}`);
            }

            // On success, update the list with the returned data
            const updatedList = await response.json();
            setList({
                ...updatedList,
                items: Array.isArray(updatedList.items) ? updatedList.items : []
            });

        } catch (err) {
            console.error('Error removing anime:', err);
            setError(err.message);
        } finally {
            setRemovingAnime(null); // Clear loading state
        }
    };

    // Handle note change on an existing entry (only if owner)
    const handleEntryChange = (animeId, field, value) => {
        if (!isOwner) return;

        const updatedItems = list.items.map((item) =>
            item.anime_id === animeId ? {...item, [field]: value} : item
        );
        setList({...list, items: updatedItems});
    };

    // Save all changes (only if owner)
    const handleSaveAll = async () => {
        if (!isOwner || !token) return;

        const baseUrl = '';
        
        try {
            // Sort items by anime title for consistent ordering
            const sortedEntries = [...list.items].sort((a, b) => {
                const titleA = a.anime_title || a.title || '';
                const titleB = b.anime_title || b.title || '';
                return titleA.localeCompare(titleB);
            });

            const response = await apiFetch(`${baseUrl}/api/lists/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: list.title,
                    animeEntries: sortedEntries
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to save changes: ${response.status}`);
            }

            // Optimistically update the UI with sorted items
            setList(prev => ({
                ...prev,
                items: sortedEntries
            }));
            
            // Show success message
            alert('All changes saved successfully!');
        } catch (err) {
            console.error('Error saving changes:', err);
            setError(err.message);
            
            // Re-fetch the list to ensure consistency
            try {
                const res = await apiFetch(`${baseUrl}/api/lists/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (res.ok) {
                    const updatedList = await res.json();
                    setList({
                        ...updatedList,
                        items: Array.isArray(updatedList.items) ? updatedList.items : []
                    });
                }
            } catch (fetchErr) {
                console.error('Failed to refresh list after error:', fetchErr);
            }
        }
    };

    // List editing functions
    const handleEditList = () => {
        setIsEditingList(true);
        setEditedTitle(list.title || '');
        setEditedVisibility(list.visibility_level || 'public');
    };

    const handleCancelEdit = () => {
        setIsEditingList(false);
        setEditedTitle(list.title || '');
        setEditedVisibility(list.visibility_level || 'public');
    };

    const handleSaveListChanges = async () => {
        if (!editedTitle.trim()) {
            alert('List title cannot be empty');
            return;
        }

        setSaving(true);
        try {
            const baseUrl = '';
            const response = await apiFetch(`${baseUrl}/api/lists/${id}/metadata`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: editedTitle.trim(),
                    visibility_level: editedVisibility
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update list: ${response.status}`);
            }

            const updatedList = await response.json();
            setList(prev => ({
                ...prev,
                title: updatedList.title,
                visibility_level: updatedList.visibility_level
            }));
            
            setIsEditingList(false);
            
            // Show success message
            alert('List updated successfully!');
        } catch (err) {
            console.error('Error updating list:', err);
            alert(err.message || 'Failed to update list');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setEnterPressed(true);
        }
    };

    // Delete the list (only if owner)
    const handleDeleteList = async () => {
        if (!isOwner || !token) return;
        if (!window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) return;
        setDeleting(true);
        const baseUrl = '';
        try {
            const response = await apiFetch(`${baseUrl}/api/lists/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to delete list: ${response.status}`);
            }
            // Redirect to My Lists after deletion
            window.location.href = '/my-lists';
        } catch (err) {
            setDeleting(false);
            alert(err.message || 'Failed to delete list');
        }
    };

    if (loading) {
        return (
            <div className="list-detail-container">
                <div className="spinner-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        if (error === 'visibility_restricted') {
            return (
                <div className="list-detail-container">
                    <VisibilityRestriction 
                        type="list"
                        message={user ? 
                            "This list is private or only visible to friends." :
                            "This list is private. Please log in if you're friends with the owner."
                        }
                        showLoginButton={!user}
                    />
                </div>
            );
        }
        
        return (
            <div className="list-detail-container">
                <div className="error-state">
                    <h3>Error loading list</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="list-detail-container">
            <div className="list-header">
                {isEditingList ? (
                    <div className="list-edit-form">
                        <div className="form-group">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="list-title-input"
                                placeholder="List title"
                                disabled={saving}
                            />
                        </div>
                        <div className="form-group">
                            <label>List Visibility:</label>
                            <VisibilityToggle
                                value={editedVisibility}
                                onChange={setEditedVisibility}
                                disabled={saving}
                            />
                        </div>
                        <div className="edit-buttons">
                            <button 
                                onClick={handleSaveListChanges}
                                disabled={saving || !editedTitle.trim()}
                                className="save-btn"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button 
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="list-title-row">
                            <h2>{list.title}</h2>
                            {isOwner && (
                                <button
                                    className="edit-list-btn"
                                    onClick={handleEditList}
                                    title="Edit list settings"
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>
                        <p className="list-meta">
                            Created: {new Date(list.created_at).toLocaleDateString()}
                            {list.items.length > 0 && ` • ${list.items.length} items`}
                            {isOwner && list.visibility_level && (
                                <span className="visibility-indicator">
                                    • {list.visibility_level === 'public' && '🌍 Public'}
                                    {list.visibility_level === 'friends_only' && '👥 Friends Only'}
                                    {list.visibility_level === 'private' && '🔒 Private'}
                                </span>
                            )}
                        </p>
                        {isOwner && (
                            <button
                                className="delete-list-btn"
                                onClick={handleDeleteList}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete List'}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* ─────────── Current Items ─────────── */}
            <div className="anime-items">
                {Array.isArray(list.items) && list.items.length > 0 ? (
                    list.items
                        .sort((a, b) => {
                            const titleA = a.anime_title || a.title || '';
                            const titleB = b.anime_title || b.title || '';
                            return titleA.localeCompare(titleB);
                        }) // Sort by anime title
                        .map((item) => (
                            <div key={item.anime_id} className="anime-card animecard-row">
                                <div className="animecard-img-col">
                                    <Link to={`/anime/${item.anime_id}`} className="anime-link">
                                        <div className="anime-image-container">
                                            <img
                                                src={getImage(item)}
                                                alt={item.anime_title || item.title || 'Anime'}
                                                className="anime-thumbnail"
                                                onError={(e) => {
                                                    e.target.src = placeholderImg;
                                                }}
                                            />
                                        </div>
                                    </Link>
                                </div>
                                <div className="animecard-info-col">
                                    <Link to={`/anime/${item.anime_id}`} className="anime-link">
                                        <h3 className="anime-title">{item.anime_title || item.title || 'Unknown Title'}</h3>
                                    </Link>
                                    <div className="anime-info">
                                        {isOwner ? (
                                            <>
                                                <div className="input-group">
                                                    <label>
                                                        Note:
                                                        <textarea
                                                            value={item.note || ''}
                                                            onChange={(e) =>
                                                                handleEntryChange(item.anime_id, 'note', e.target.value)
                                                            }
                                                            className="note-input"
                                                            placeholder="Add a note..."
                                                            rows="2"
                                                        />
                                                    </label>
                                                </div>
                                                <button
                                                    className={`remove-btn ${removingAnime === item.anime_id ? 'loading' : ''}`}
                                                    onClick={() => handleRemoveAnime(item.anime_id)}
                                                    disabled={removingAnime === item.anime_id}
                                                >
                                                    {removingAnime === item.anime_id ? 'Removing...' : 'Remove'}
                                                </button>
                                            </>
                                        ) : (
                                            // Non‐owners see plain text for note only
                                            <>
                                                {item.note && (
                                                    <div className="anime-note-text">Note: {item.note}</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                ) : (
                    <div className="empty-state">
                        <p>This list is empty.</p>
                        {isOwner && (
                            <p>Start by searching for anime below to add to your list!</p>
                        )}
                    </div>
                )}
            </div>

            {/* ─────────── Save All Edits (Note) ─────────── */}
            {isOwner && list.items.length > 0 && (
                <div className="save-container">
                    <button className="save-btn" onClick={handleSaveAll}>
                        Save All Changes
                    </button>
                </div>
            )}

            {/* ─────────── Search & Add New Anime ─────────── */}
            {isOwner && (
                <div className="search-add-section">
                    <h3>Add Anime to List</h3>
                    <input
                        type="text"
                        placeholder="Search anime by title..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setEnterPressed(false);
                        }}
                        onKeyDown={handleKeyDown}
                        className="search-input"
                        list="anime-suggestions"
                    />
                    <datalist id="anime-suggestions">
                        {searchResults.map((anime) => (
                            <option key={anime.id || anime.anime_id} value={anime.title}/>
                        ))}
                    </datalist>

                    {isSearching && <p className="loading-text">Searching…</p>}

                    {enterPressed && searchTerm && (
                        <div className="search-results">
                            {searchResults.length === 0 && !isSearching ? (
                                <p>No results found for "{searchTerm}".</p>
                            ) : (
                                searchResults.map((anime) => {
                                    const animeId = anime.id || anime.anime_id;
                                    const isAlreadyAdded = list.items.some((i) => i.anime_id === animeId);

                                    return (
                                        <div key={animeId} className="anime-card search-card">
                                            <img
                                                src={anime.imageUrl || placeholderImg}
                                                alt={anime.title}
                                                className="anime-thumbnail-small"
                                                onError={(e) => {
                                                    e.target.src = placeholderImg;
                                                }}
                                            />
                                            <h4 className="anime-title-small">{anime.title}</h4>
                                            <button
                                                className={`add-btn ${isAlreadyAdded ? 'added' : ''} ${addingAnime === animeId ? 'loading' : ''}`}
                                                onClick={() => handleAddAnime(animeId)}
                                                disabled={isAlreadyAdded || addingAnime === animeId}
                                            >
                                                {addingAnime === animeId ? 'Adding...' : (isAlreadyAdded ? 'Already Added' : 'Add to List')}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}