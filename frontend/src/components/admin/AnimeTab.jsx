import React, {useEffect, useState, useRef, useCallback} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { X } from 'react-feather'; // For the close icon in selected tags
import '../../styles/AnimeImageInput.css';
import '../../styles/AdminDropdowns.css';

const AnimeTab = ({searchQuery}) => {
    const {token} = useAuth();
    const { isDarkMode } = useTheme();
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        alternative_title: '',
        synopsis: '',
        release_date: '',
        episodes: '',
        season: '',
        trailer_url_yt_id: '',
        company_id: '',
        image_url: '',
        streaming_available: false
    });
    const [editingId, setEditingId] = useState(null);
    const [loadingAnimeDetails, setLoadingAnimeDetails] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const companyDropdownRef = useRef(null);
    const genreDropdownRef = useRef(null);

    useEffect(() => {
        fetchAnime();
        fetchCompanies();
        fetchGenres();
        
        const handleClickOutside = (event) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
                setIsCompanyDropdownOpen(false);
            }
            if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target)) {
                setIsGenreDropdownOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const fetchGenres = async () => {
        try {
            const response = await apiFetch('/api/genre');
            if (response.ok) {
                const data = await response.json();
                // Normalize the genre data structure
                const normalizedGenres = Array.isArray(data) 
                    ? data.map(g => ({
                        id: g.id || g.genre_id,
                        genre_id: g.genre_id || g.id,
                        name: g.name || g.genre_name || 'Unnamed Genre'
                    }))
                    : [];
                setGenres(normalizedGenres);
            }
        } catch (err) {
            console.error('Error fetching genres:', err);
            showError('Failed to load genres');
        }
    };
    
    const toggleGenre = (genre) => {
        setSelectedGenres(prev => {
            const genreId = genre.genre_id || genre.id;
            const exists = prev.some(g => (g.genre_id || g.id) === genreId);
            if (exists) {
                return prev.filter(g => (g.genre_id || g.id) !== genreId);
            } else {
                // Ensure we're adding a properly structured genre object
                return [...prev, {
                    id: genre.id || genre.genre_id,
                    genre_id: genre.genre_id || genre.id,
                    name: genre.name || genre.genre_name || 'Unnamed Genre'
                }];
            }
        });
    };
    
    const removeGenre = (genreId) => {
        setSelectedGenres(prev => prev.filter(g => (g.genre_id || g.id) !== genreId));
    };
    
    // Initialize selected genres when editing
    const initializeSelectedGenres = useCallback((anime) => {
        if (anime.genres) {
            setSelectedGenres(anime.genres);
        } else if (anime.genre) {
            // Handle case where genre is a string (from initial data)
            const genreNames = anime.genre.split(',').map(g => g.trim());
            const matchedGenres = genres.filter(g => genreNames.includes(g.name));
            setSelectedGenres(matchedGenres);
        } else {
            setSelectedGenres([]);
        }
    }, [genres]);

    const fetchAnime = async () => {
        try {
            console.log('Fetching anime list...');
            const response = await apiFetch('/api/animes/admin', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Failed to fetch anime list: ' + errorText);
            }
            const data = await response.json();
            console.log(data);
            
            setAnimeList(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to fetch anime list');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            console.log('Fetching companies...');
            const response = await apiFetch('/api/company');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('Failed to fetch companies: ' + errorText);
            }
            const data = await response.json();
            
            // Log sample company data
            if (Array.isArray(data) && data.length > 0) {
                console.log('Sample company data:', {
                    id: data[0].id,
                    company_id: data[0].company_id,
                    name: data[0].name,
                    raw_data: data[0]
                });
            }
            
            const companiesList = Array.isArray(data) 
                ? data.map(company => ({
                    ...company,
                    id: company.id || company.company_id,
                    // Ensure we have a consistent ID field
                    company_id: company.company_id || company.id
                })) 
                : [];
                
            console.log('Companies loaded:', { 
                count: companiesList.length,
                sampleIds: companiesList.slice(0, 3).map(c => c.id)
            });
            setCompanies(companiesList);
        } catch (err) {
            console.error('Error fetching companies:', err);
            setError('Failed to fetch companies');
        }
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
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

        if (!formData.title.trim()) {
            showError('Anime title is required');
            setLoading(false);
            return;
        }
        
        try {
            const url = editingId 
                ? `/api/animes/${editingId}`
                : '/api/animes';
            const method = editingId ? 'PUT' : 'POST';

            // Prepare the request body with all fields and genres
            const requestBody = {
                title: formData.title,
                synopsis: formData.synopsis,
                release_date: formData.release_date || null,
                company_id: formData.company_id || null,
                alternative_title: formData.alternative_title || null,
                season: formData.season || null,
                episodes: formData.episodes ? parseInt(formData.episodes) : null,
                trailer_url_yt_id: formData.trailer_url_yt_id || null,
                image_url: formData.image_url || null,
                streaming_available: formData.streaming_available,
                genres: selectedGenres.map(g => ({
                    genre_id: g.genre_id || g.id,
                    name: g.name
                }))
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.message || (editingId ? 'Failed to update anime' : 'Failed to add anime'));
                setLoading(false);
                return;
            }

            await fetchAnime();
            
            // Show success message
            const successMessage = editingId 
                ? 'Anime updated successfully!' 
                : 'Anime created successfully!';
            showSuccess(successMessage);
            
            // Don't reset form after successful creation/update
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (anime) => {
        if (!anime) return;

        // Use either anime_id or id, whichever is available
        const animeId = anime.anime_id || anime.id;
        if (!animeId) {
            showError('Invalid anime data: missing ID');
            return;
        }

        try {
            setLoadingAnimeDetails(true);

            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Set basic form data immediately
            setFormData({
                title: anime.title || '',
                alternative_title: '',
                synopsis: '',
                release_date: '',
                episodes: '',
                season: anime.season || '',
                trailer_url_yt_id: '',
                company_id: anime.company_id ? String(anime.company_id) : '',
                image_url: ''
            });
            setEditingId(animeId);

            // Fetch detailed anime data
            const response = await fetch(`/api/animes/${animeId}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch anime details');
            }

            const detailedAnime = await response.json();

            // Update form data with detailed information
            setFormData({
                title: detailedAnime.title || '',
                alternative_title: detailedAnime.alternative_title || '',
                synopsis: detailedAnime.synopsis || '',
                release_date: detailedAnime.release_date || '',
                episodes: detailedAnime.episodes ? String(detailedAnime.episodes) : '',
                season: detailedAnime.season || '',
                trailer_url_yt_id: detailedAnime.trailer_url_yt_id || '',
                company_id: detailedAnime.company_id ? String(detailedAnime.company_id) : '',
                image_url: detailedAnime.imageUrl || '',
                streaming_available: detailedAnime.streaming_available || false
            });

            // Initialize selected genres
            initializeSelectedGenres(detailedAnime);

        } catch (err) {
            console.error('Error loading anime details:', err);
            showError('Error loading anime details');
        } finally {
            setLoadingAnimeDetails(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) {
            showError('Invalid anime ID');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this anime?')) return;

        try {
            // Convert to number in case it's a string
            const animeId = Number(id);
            if (isNaN(animeId)) {
                throw new Error('Invalid anime ID format');
            }

            const response = await fetch(`/api/animes/${animeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.message || 'Failed to delete anime');
                return;
            }

            // Refresh the list after successful deletion
            await fetchAnime();

            // Show success message for deletion (red styling like other tabs)
            setError('');
            // Use setTimeout to ensure the error clearing takes effect first
            setTimeout(() => {
                setError('Anime deleted successfully');
                // Clear the message after 3 seconds
                setTimeout(() => setError(''), 3000);
            }, 10);
        } catch (err) {
            console.error('Delete error:', err);
            showError(err.message || 'Failed to delete anime');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            synopsis: '',
            release_date: '',
            company_id: '',
            alternative_title: '',
            season: '',
            episodes: '',
            trailer_url_yt_id: '',
            image_url: '',
            streaming_available: false
        });
        setEditingId(null);
        setError('');
        setSelectedGenres([]);
        setImageError(false);
        setImageLoading(false);
    };

    const filteredAnime = animeList.filter(anime =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="spinner-container">
            <div className="spinner"></div>
            <p>Loading anime data...</p>
        </div>
    );

    return (
        <div className="admin-tab-content">
            <div className="admin-form-section">
                <h2>{editingId ? 'Edit Anime' : 'Add New Anime'}</h2>
                {error && (
                    <div className={`alert mt-2 ${error.startsWith('SUCCESS:') ? 'alert-success' : 'alert-danger'}`}>
                        {error.startsWith('SUCCESS:') ? error.substring(8) : error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            name="title"
                            className="form-control"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Alternative Title</label>
                        <input
                            type="text"
                            name="alternative_title"
                            className="form-control"
                            value={formData.alternative_title}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Synopsis</label>
                        <textarea
                            name="synopsis"
                            className="form-control"
                            value={formData.synopsis}
                            onChange={handleInputChange}
                            rows="4"
                        />
                    </div>

                    {/* Compact fields section with image preview */}
                    <div className="row align-items-start">
                        <div className="col-md-8">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Episodes</label>
                                        <input
                                            type="number"
                                            name="episodes"
                                            className="form-control"
                                            value={formData.episodes}
                                            onChange={handleInputChange}
                                            min="1"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Season</label>
                                        <input
                                            type="text"
                                            name="season"
                                            className="form-control"
                                            value={formData.season}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Fall 2023, Winter 2024"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>YouTube Trailer ID</label>
                                        <input
                                            type="text"
                                            name="trailer_url_yt_id"
                                            className="form-control"
                                            value={formData.trailer_url_yt_id}
                                            onChange={handleInputChange}
                                            placeholder="e.g., dQw4w9WgXcQ"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Release Date</label>
                                        <input
                                            type="date"
                                            name="release_date"
                                            className="form-control"
                                            value={formData.release_date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    className="form-control"
                                    value={formData.image_url}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/anime-image.jpg"
                                />
                                <div className="anime-url-hint">
                                    Paste a direct link to an anime poster image (JPG, PNG, WEBP)
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <span>Streaming Available</span>
                                    <input
                                        type="checkbox"
                                        name="streaming_available"
                                        className="form-check-input"
                                        id="streamingAvailableCheck"
                                        checked={formData.streaming_available}
                                        onChange={(e) => setFormData(prev => ({ ...prev, streaming_available: e.target.checked }))}
                                    />
                                </label>
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
                                                alt="Anime preview"
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
                    <div className="form-group admin-dropdown-wrapper" ref={companyDropdownRef}>
                        <label>Production Company</label>
                        <div className="dropdown">
                            <div 
                                className={`form-control admin-dropdown-trigger ${isCompanyDropdownOpen ? 'open' : ''}`}
                                onClick={() => {
                                    setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                                    setCompanySearch('');
                                }}
                            >
                                {companies.find(c => c.id == formData.company_id)?.name || 'Select a company'}
                            </div>
                            {isCompanyDropdownOpen && (
                                <div className="admin-dropdown-menu">
                                    <div className="admin-dropdown-search">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Search companies..."
                                            value={companySearch}
                                            onChange={(e) => setCompanySearch(e.target.value)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="admin-dropdown-list">
                                        {companies
                                            .filter(company => 
                                                !companySearch || 
                                                (company.name && company.name.toLowerCase().includes(companySearch.toLowerCase()))
                                            )
                                            .map(company => (
                                                <button
                                                    key={company.id}
                                                    type="button"
                                                    className="admin-dropdown-item"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            company_id: company.id
                                                        }));
                                                        setIsCompanyDropdownOpen(false);
                                                    }}
                                                >
                                                    {company.name}
                                                </button>
                                            ))}
                                        {companies.filter(company => 
                                            !companySearch || 
                                            (company.name && company.name.toLowerCase().includes(companySearch.toLowerCase()))
                                        ).length === 0 && (
                                            <div className="admin-dropdown-item no-results">No companies found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <style jsx>{`
                        .dropdown {
                            position: relative;
                        }
                        .dropdown-menu {
                            position: absolute;
                            top: 100%;
                            left: 0;
                            z-index: 1000;
                            background: white;
                            border: 1px solid #ced4da;
                            border-radius: 0.25rem;
                            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
                            width: 100%;
                            box-sizing: border-box;
                        }
                        .dropdown-item {
                            display: block;
                            width: 100%;
                            padding: 0.25rem 1.5rem;
                            clear: both;
                            font-weight: 400;
                            color: #212529;
                            text-align: inherit;
                            white-space: nowrap;
                            background-color: transparent;
                            border: 0;
                            text-align: left;
                        }
                        .dropdown-item:hover {
                            background-color: #f8f9fa;
                            color: #16181b;
                            text-decoration: none;
                        }
                        .dropdown-item:active {
                            background-color: #e9ecef;
                        }
                    `}</style>
                    
                    {/* Genre Selection */}
                    <div className="form-group" ref={genreDropdownRef}>
                        <label>Genres</label>
                        <div className="dropdown">
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
                                    setIsGenreDropdownOpen(!isGenreDropdownOpen);
                                    setGenreSearch('');
                                }}
                            >
                                {selectedGenres.length === 0 ? (
                                    <span className="text-muted">Select genres</span>
                                ) : (
                                    selectedGenres.map(genre => (
                                        <span 
                                            key={genre.genre_id || genre.id}
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
                                                removeGenre(genre.genre_id || genre.id);
                                            }}
                                        >
                                            {genre.name}
                                            <X size={14} className="ms-1" />
                                        </span>
                                    ))
                                )}
                            </div>
                            {isGenreDropdownOpen && (
                                <div className="dropdown-menu show p-2" style={{ width: '100%' }}>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mb-2"
                                        placeholder="Search genres..."
                                        value={genreSearch}
                                        onChange={(e) => setGenreSearch(e.target.value)}
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
                                            {genres
                                                .filter(genre => 
                                                    !genreSearch || 
                                                    (genre.name && genre.name.toLowerCase().includes(genreSearch.toLowerCase()))
                                                )
                                                .map(genre => {
                                                    const isSelected = selectedGenres.some(
                                                        g => (g.genre_id || g.id) === (genre.genre_id || genre.id)
                                                    );
                                                    return (
                                                        <div 
                                                            key={genre.genre_id || genre.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleGenre(genre);
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
                                                            <span style={{ marginRight: '6px' }}>{genre.name}</span>
                                                            <input 
                                                                type="checkbox" 
                                                                className="form-check-input"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleGenre(genre);
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
                                            {genres.filter(genre => 
                                                !genreSearch || 
                                                (genre.name && genre.name.toLowerCase().includes(genreSearch.toLowerCase()))
                                            ).length === 0 && (
                                                <div className="text-muted" style={{ padding: '8px' }}>No genres found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {editingId ? 'Update' : 'Add'} Anime
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
                <h2>Anime List</h2>
                {filteredAnime.length === 0 ? (
                    <p>No anime found.</p>
                ) : (
                    <div className="admin-table">
                        <div className="table-header">
                            <div className="col-title">Title</div>
                            <div className="col-season">Season</div>
                            <div className="col-company">Company</div>
                            <div className="col-actions">Actions</div>
                        </div>
                        {filteredAnime.map((anime, index) => (
                            <div key={anime.id || `anime-${index}`} className="table-row">
                                <div className="col-title">{anime.title}</div>
                                <div className="col-season">
                                    {anime.season || 'N/A'}
                                </div>
                                <div className="col-company">
                                    {anime.company_name || 'Unknown'}
                                </div>
                                <div className="col-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(anime)}
                                        className="btn btn-edit btn-sm"
                                        disabled={loading}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(anime.id)}
                                        className="btn btn-delete btn-sm"
                                        disabled={loading}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimeTab;
