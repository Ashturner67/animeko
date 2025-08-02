import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { X } from 'react-feather';
import '../../styles/AdminDropdown.css';
import '../../styles/AnimeImageInput.css';

const CharactersTab = ({ searchQuery }) => {
    const { token } = useAuth();
    const { isDarkMode } = useTheme();
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        voiceActorId: '',
        image_url: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [voiceActors, setVoiceActors] = useState([]);
    const [voiceActorSearch, setVoiceActorSearch] = useState('');
    const [isVaDropdownOpen, setIsVaDropdownOpen] = useState(false);
    const vaDropdownRef = useRef(null);
    
    // Anime dropdown state
    const [animeList, setAnimeList] = useState([]);
    const [selectedAnimes, setSelectedAnimes] = useState([]);
    const [animeSearch, setAnimeSearch] = useState('');
    const [isAnimeDropdownOpen, setIsAnimeDropdownOpen] = useState(false);
    const [loadingCharacterDetails, setLoadingCharacterDetails] = useState(false);
    const animeDropdownRef = useRef(null);

    useEffect(() => {
        fetchCharacters();
        fetchVoiceActors();
        fetchAnimeList();
        
        const handleClickOutside = (event) => {
            if (vaDropdownRef.current && !vaDropdownRef.current.contains(event.target)) {
                setIsVaDropdownOpen(false);
            }
            if (animeDropdownRef.current && !animeDropdownRef.current.contains(event.target)) {
                setIsAnimeDropdownOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const fetchAnimeList = async () => {
        try {
            const response = await apiFetch('/api/animes');
            if (response.ok) {
                const data = await response.json();
                setAnimeList(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching anime list:', err);
        }
    };

    const toggleAnime = (anime) => {
        setSelectedAnimes(prev => {
            const animeId = anime.anime_id || anime.id;
            const exists = prev.some(a => (a.anime_id || a.id) === animeId);
            if (exists) {
                return prev.filter(a => (a.anime_id || a.id) !== animeId);
            } else {
                return [...prev, {
                    anime_id: animeId,
                    id: animeId,
                    title: anime.title
                }];
            }
        });
    };
    
    const removeAnime = (animeId) => {
        setSelectedAnimes(prev => prev.filter(a => (a.anime_id || a.id) !== animeId));
    };
    
    // Initialize selected animes when editing
    const initializeSelectedAnimes = useCallback((character) => {
        if (character.animes) {
            setSelectedAnimes(character.animes);
        } else {
            setSelectedAnimes([]);
        }
    }, []);

    const fetchCharacters = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/api/characters', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch characters');
            }
            
            const data = await response.json();
            setCharacters(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            console.error('Error fetching characters:', err);
            setError(err.message || 'Failed to load characters');
            setCharacters([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVoiceActors = async () => {
        try {
            const response = await apiFetch('/api/voice-actors', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch voice actors');
            }
            
            const data = await response.json();
            setVoiceActors(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching voice actors:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Reset image error when URL changes
        if (name === 'image_url') {
            setImageError(false);
        }
    };

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
    };

    const handleImageLoadStart = () => {
        if (formData.image_url && formData.image_url.trim()) {
            setImageLoading(true);
            setImageError(false);
        }
    };

    const showError = (message) => {
        setError(message);
        setTimeout(() => {
            setError('');
        }, 5000);
    };

    const showSuccess = (message) => {
        setError(''); // Clear any existing errors
        // Use error state for success message with different styling
        setError(`SUCCESS: ${message}`);
        setTimeout(() => {
            setError('');
        }, 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.name.trim()) {
            showError('Character name is required');
            setLoading(false);
            return;
        }

        const url = editingId
            ? `/api/characters/${editingId}`
            : '/api/characters';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                    voiceActorId: formData.voiceActorId || null,
                    image_url: formData.image_url || null,
                    animes: selectedAnimes.map(a => ({
                        anime_id: a.anime_id || a.id,
                        id: a.anime_id || a.id,
                        title: a.title
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || (editingId ? 'Failed to update character' : 'Failed to add character'));
            }

            await fetchCharacters();
            
            // Show success message
            const successMessage = editingId 
                ? 'Character updated successfully!' 
                : 'Character created successfully!';
            showSuccess(successMessage);
            
            // Don't reset form after successful creation/update
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (character) => {
        if (!character) {
            showError('No character data provided');
            return;
        }
        
        const charId = character.id || character.character_id;
        if (!charId) {
            console.error('Character data missing ID:', character);
            showError('Invalid character data: missing ID');
            return;
        }
        
        try {
            setLoadingCharacterDetails(true);
            
            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Set basic form data immediately
            setFormData({
                name: character.name || '',
                description: character.description || '',
                voiceActorId: character.vaId || '',
                image_url: character.imageUrl || ''
            });
            setEditingId(charId);
            
            // Fetch detailed character data with anime associations
            const response = await apiFetch(`/api/characters/${charId}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch character details');
            }
            
            const detailedCharacter = await response.json();
            
            // Initialize selected animes with the fetched data
            initializeSelectedAnimes(detailedCharacter);
            
        } catch (err) {
            console.error('Error loading character details:', err);
            showError('Error loading character details');
        } finally {
            setLoadingCharacterDetails(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) {
            showError('Invalid character ID');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this character? This will remove all their associated data.')) return;

        try {
            const charId = Number(id);
            if (isNaN(charId)) {
                showError('Invalid character ID format');
                return;
            }

            setLoading(true);
            const response = await apiFetch(`/api/characters/${charId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete character');
            }

            await fetchCharacters();
            setError('');
            // Show success message
            setError('Character deleted successfully');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            console.error('Delete error:', err);
            showError(err.message || 'Failed to delete character');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            voiceActorId: '',
            image_url: ''
        });
        setSelectedAnimes([]);
        setEditingId(null);
        setError('');
        setImageError(false);
        setImageLoading(false);
    };

    const filteredCharacters = (characters || []).filter(char => {
        if (!char) return false;
        const name = char.name || '';
        const description = char.description || '';
        const search = (searchQuery || '').toLowerCase();
        return name.toLowerCase().includes(search) || 
               description.toLowerCase().includes(search);
    });

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="admin-tab-content">
            {error && (
                <div className={`alert ${error.startsWith('SUCCESS:') ? 'alert-success' : 'alert-danger'}`}>
                    {error.startsWith('SUCCESS:') ? error.substring(8) : error}
                </div>
            )}
            <div className="admin-form-section">
                <h2>{editingId ? 'Edit Character' : 'Add New Character'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Compact fields section with image preview */}
                    <div className="row align-items-start">
                        <div className="col-md-8">
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    className="form-control"
                                    rows="3"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    className="form-control"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/character-image.jpg"
                                />
                                <div className="anime-url-hint">
                                    Paste a direct link to a character image (JPG, PNG, WEBP)
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="form-group">
                                <label>Image Preview</label>
                                <div className={`anime-image-preview-compact ${formData.image_url && formData.image_url.trim() && !imageError ? 'has-image' : ''} ${imageError ? 'has-error' : ''}`}>
                                    {formData.image_url && formData.image_url.trim() ? (
                                        imageLoading ? (
                                            <div className="anime-image-loading">Loading image...</div>
                                        ) : imageError ? (
                                            <div className="anime-image-error">Failed to load image</div>
                                        ) : (
                                            <img
                                                src={formData.image_url}
                                                alt="Character preview"
                                                onLoad={handleImageLoad}
                                                onError={handleImageError}
                                                onLoadStart={handleImageLoadStart}
                                            />
                                        )
                                    ) : (
                                        <div className="anime-image-placeholder">Preview will appear here</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="form-group" ref={animeDropdownRef} style={{ position: 'relative' }}>
                        <label>Animes</label>
                        {loadingCharacterDetails ? (
                            <div className="form-control" style={{ 
                                padding: '8px 12px', 
                                color: '#6c757d', 
                                fontStyle: 'italic' 
                            }}>
                                Loading anime associations...
                            </div>
                        ) : (
                            <div className="dropdown" style={{ position: 'relative' }}>
                            <div 
                                className="form-control" 
                                style={{ 
                                    minHeight: '38px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                    alignItems: 'center',
                                    position: 'relative',
                                    zIndex: 1
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAnimeDropdownOpen(!isAnimeDropdownOpen);
                                    setAnimeSearch('');
                                }}
                            >
                                {selectedAnimes.length === 0 ? (
                                    <span className="text-muted">Select animes</span>
                                ) : (
                                    selectedAnimes.map(anime => (
                                        <span 
                                            key={anime.anime_id || anime.id}
                                            className="badge me-1 d-inline-flex align-items-center"
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isDarkMode ? '#34495e' : '#e0f2f7',
                                                color: isDarkMode ? '#ecf0f1' : '#2c3e50',
                                                padding: '0.3em 0.6em',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.85em',
                                                fontWeight: '500',
                                                border: `1px solid ${isDarkMode ? '#2c3e50' : '#a7d9ed'}`,
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeAnime(anime.anime_id || anime.id);
                                            }}
                                        >
                                            {anime.title}
                                            <X size={14} className="ms-1" />
                                        </span>
                                    ))
                                )}
                            </div>
                            {isAnimeDropdownOpen && (
                                <div className="dropdown-menu show p-2" style={{ 
                                    width: '100%', 
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    zIndex: 1000,
                                    background: isDarkMode ? '#343a40' : 'white',
                                    border: `1px solid ${isDarkMode ? '#495057' : '#ced4da'}`,
                                    borderRadius: '0.25rem',
                                    boxShadow: isDarkMode ? '0 0.5rem 1rem rgba(0, 0, 0, 0.3)' : '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
                                }}>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mb-2"
                                        placeholder="Search animes..."
                                        value={animeSearch}
                                        onChange={(e) => setAnimeSearch(e.target.value)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                    />
                                    <div 
                                        style={{ 
                                            maxHeight: '200px', 
                                            overflowY: 'auto',
                                            padding: '8px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '6px',
                                            padding: '4px',
                                            position: 'relative',
                                            zIndex: 2
                                        }}>
                                            {animeList
                                                .filter(anime => 
                                                    !animeSearch || 
                                                    (anime.title && anime.title.toLowerCase().includes(animeSearch.toLowerCase()))
                                                )
                                                .map(anime => {
                                                    const isSelected = selectedAnimes.some(
                                                        a => (a.anime_id || a.id) === (anime.anime_id || anime.id)
                                                    );
                                                    return (
                                                        <div 
                                                            key={anime.anime_id || anime.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleAnime(anime);
                                                            }}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: isSelected ? (isDarkMode ? '#495057' : '#e9ecef') : 'transparent',
                                                                border: '1px solid #dee2e6',
                                                                fontSize: '0.9rem',
                                                                flexShrink: 0,
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            <span style={{ marginRight: '6px' }}>
                                                                {anime.title || anime.name || `Anime ${anime.id || anime.anime_id}` || 'Unknown'}
                                                            </span>
                                                            <input 
                                                                type="checkbox" 
                                                                className="form-check-input"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleAnime(anime);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    width: '14px',
                                                                    height: '14px',
                                                                    margin: 0,
                                                                    cursor: 'pointer'
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })
                                            }
                                            {animeList.filter(anime => 
                                                !animeSearch || 
                                                (anime.title && anime.title.toLowerCase().includes(animeSearch.toLowerCase()))
                                            ).length === 0 && (
                                                <div className="text-muted" style={{ padding: '8px' }}>No animes found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                    <div className="form-group" ref={vaDropdownRef}>
                        <label>Voice Actor</label>
                        <div className="admin-dropdown">
                            <div 
                                className="admin-dropdown-trigger"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    setIsVaDropdownOpen(!isVaDropdownOpen);
                                    setVoiceActorSearch('');
                                }}
                            >
                                {voiceActors.find(va => va.id == formData.voiceActorId || va.voice_actor_id == formData.voiceActorId)?.name || 'Select a voice actor'}
                            </div>
                            {isVaDropdownOpen && (
                                <div className="admin-dropdown-menu">
                                    <input
                                        type="text"
                                        className="admin-dropdown-search"
                                        placeholder="Search voice actors..."
                                        value={voiceActorSearch}
                                        onChange={(e) => setVoiceActorSearch(e.target.value)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="admin-dropdown-content">
                                        {voiceActors
                                            .filter(va => 
                                                !voiceActorSearch || 
                                                (va.name && va.name.toLowerCase().includes(voiceActorSearch.toLowerCase()))
                                            )
                                            .map(va => (
                                                <button
                                                    key={va.id || va.voice_actor_id}
                                                    className="admin-dropdown-item"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({
                                                            ...prev, 
                                                            voiceActorId: va.id || va.voice_actor_id
                                                        }));
                                                        setIsVaDropdownOpen(false);
                                                    }}
                                                >
                                                    {va.name}
                                                </button>
                                            ))
                                        }
                                        {voiceActors.filter(va => 
                                            !voiceActorSearch || 
                                            (va.name && va.name.toLowerCase().includes(voiceActorSearch.toLowerCase()))
                                        ).length === 0 && (
                                            <div className="admin-dropdown-empty">No voice actors found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {editingId ? 'Update' : 'Add'} Character
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="btn btn-secondary">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="admin-list-section">
                <h2>Character List</h2>
                {filteredCharacters.length === 0 ? (
                    <p>No characters found.</p>
                ) : (
                    <div className="admin-table character-table">
                        <div className="table-header">
                            <div className="col-name">Name</div>
                            <div className="col-description">Description</div>
                            <div className="col-va">Voice Actor</div>
                            <div className="col-actions">Actions</div>
                        </div>
                        {filteredCharacters.map(char => {
                            if (!char) return null;
                            const charId = char.id || char.character_id;
                            if (!charId) {
                                console.error('Character missing ID:', char);
                                return null;
                            }
                            
                            return (
                                <div key={`char-${charId}`} className="table-row">
                                    <div className="col-name">{char.name || 'N/A'}</div>
                                    <div className="col-description">
                                        {char.description ? 
                                            (char.description.length > 50 
                                                ? `${char.description.substring(0, 50)}...` 
                                                : char.description) 
                                            : 'N/A'}
                                    </div>
                                    <div className="col-va">
                                        {char.vaName || 'N/A'}
                                    </div>
                                    <div className="col-actions">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(char)}
                                            className="btn btn-edit btn-sm"
                                            disabled={loading}
                                            aria-label={`Edit ${char.name || 'character'}`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(charId)}
                                            className="btn btn-delete btn-sm"
                                            disabled={loading}
                                            aria-label={`Delete ${char.name || 'character'}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CharactersTab;
