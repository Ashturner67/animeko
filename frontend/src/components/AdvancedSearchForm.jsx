import React, { useState, useEffect, useRef } from 'react';
import { X } from 'react-feather';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../utils/api';
import '../styles/AdvancedSearchForm.css';

const AdvancedSearchForm = ({ onSearchParamsChange, initialParams = {}, isInNavbar = false }) => {
    const { isDarkMode } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState(initialParams.genres || []);
    const [genreSearch, setGenreSearch] = useState('');
    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
    const genreDropdownRef = useRef(null);
    
    const [searchParams, setSearchParams] = useState({
        releaseYearStart: initialParams.releaseYearStart || '',
        releaseYearEnd: initialParams.releaseYearEnd || '',
        episodeCountMin: initialParams.episodeCountMin || '',
        episodeCountMax: initialParams.episodeCountMax || '',
        ratingMin: initialParams.ratingMin || '',
        ratingMax: initialParams.ratingMax || '',
        ...initialParams
    });

    useEffect(() => {
        fetchGenres();
        
        const handleClickOutside = (event) => {
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
        }
    };

    const toggleGenre = (genre) => {
        setSelectedGenres(prev => {
            const genreId = genre.genre_id || genre.id;
            const exists = prev.some(g => (g.genre_id || g.id) === genreId);
            if (exists) {
                return prev.filter(g => (g.genre_id || g.id) !== genreId);
            } else {
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

    const handleInputChange = (field, value) => {
        setSearchParams(prev => ({ ...prev, [field]: value }));
    };

    const handleApplySearch = () => {
        const params = {
            ...searchParams,
            genres: selectedGenres.map(g => g.name)
        };
        onSearchParamsChange(params);
    };

    const handleClearAll = () => {
        setSearchParams({
            releaseYearStart: '',
            releaseYearEnd: '',
            episodeCountMin: '',
            episodeCountMax: '',
            ratingMin: '',
            ratingMax: ''
        });
        setSelectedGenres([]);
        onSearchParamsChange({});
    };

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    // If used in navbar, show the form directly without toggle
    if (isInNavbar) {
        return (
            <div className={`advanced-search-form navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                <h4 className={`advanced-search-title navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                    Advanced Search Options
                </h4>

                {/* Genre Selection - Compact */}
                <div className={`advanced-search-form-group genre-group navbar-variant`} ref={genreDropdownRef}>
                    <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                        Genres
                    </label>
                    <div 
                        className={`advanced-search-genre-selector navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        onClick={() => {
                            setIsGenreDropdownOpen(!isGenreDropdownOpen);
                            setGenreSearch('');
                        }}
                    >
                        {selectedGenres.length === 0 ? (
                            <span className={`advanced-search-genre-placeholder ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Select genres
                            </span>
                        ) : (
                            selectedGenres.map(genre => (
                                <span 
                                    key={genre.genre_id || genre.id}
                                    className={`advanced-search-genre-tag navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeGenre(genre.genre_id || genre.id);
                                    }}
                                >
                                    {genre.name}
                                    <X size={10} />
                                </span>
                            ))
                        )}
                    </div>
                    
                    {isGenreDropdownOpen && (
                        <div className={`advanced-search-genre-dropdown navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            <input
                                type="text"
                                placeholder="Search genres..."
                                value={genreSearch}
                                onChange={(e) => setGenreSearch(e.target.value)}
                                className={`advanced-search-genre-search navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className={`advanced-search-genre-options navbar-variant`}>
                                {genres
                                    .filter(genre => 
                                        !genreSearch || 
                                        genre.name.toLowerCase().includes(genreSearch.toLowerCase())
                                    )
                                    .map(genre => {
                                        const isSelected = selectedGenres.some(
                                            g => (g.genre_id || g.id) === (genre.genre_id || genre.id)
                                        );
                                        return (
                                            <div 
                                                key={genre.genre_id || genre.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleGenre(genre);
                                                }}
                                                className={`advanced-search-genre-option navbar-variant ${isSelected ? 'selected' : 'unselected'} ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                                            >
                                                {genre.name}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Compact grid layout for other fields */}
                <div className="advanced-search-grid-2 navbar-variant">
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Year From
                        </label>
                        <input
                            type="number"
                            placeholder="2000"
                            value={searchParams.releaseYearStart}
                            onChange={(e) => handleInputChange('releaseYearStart', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Year To
                        </label>
                        <input
                            type="number"
                            placeholder="2024"
                            value={searchParams.releaseYearEnd}
                            onChange={(e) => handleInputChange('releaseYearEnd', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                </div>

                <div className="advanced-search-grid-2 navbar-variant">
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Min Episodes
                        </label>
                        <input
                            type="number"
                            placeholder="12"
                            value={searchParams.episodeCountMin}
                            onChange={(e) => handleInputChange('episodeCountMin', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Max Episodes
                        </label>
                        <input
                            type="number"
                            placeholder="24"
                            value={searchParams.episodeCountMax}
                            onChange={(e) => handleInputChange('episodeCountMax', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                </div>

                <div className="advanced-search-grid-2 last-row navbar-variant">
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Min Rating
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="7.0"
                            value={searchParams.ratingMin}
                            onChange={(e) => handleInputChange('ratingMin', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                    <div className="advanced-search-input-group navbar-variant">
                        <label className={`advanced-search-label navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                            Max Rating
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="10.0"
                            value={searchParams.ratingMax}
                            onChange={(e) => handleInputChange('ratingMax', e.target.value)}
                            className={`advanced-search-input navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="advanced-search-actions navbar-variant">
                    <button
                        onClick={handleClearAll}
                        className={`advanced-search-btn advanced-search-btn-clear navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                    >
                        Clear All
                    </button>
                    <button
                        onClick={handleApplySearch}
                        className={`advanced-search-btn advanced-search-btn-apply navbar-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="advanced-search-container">
            <button 
                className={`advanced-search-toggle ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                onClick={toggleVisibility}
            >
                <Filter size={18} />
                {isVisible ? 'Hide Advanced Search' : 'Advanced Search'}
                {isVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isVisible && (
                <div className={`advanced-search-form regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                    <h4 className={`advanced-search-title regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                        Advanced Search Options
                    </h4>

                    {/* Genre Selection */}
                    <div className="form-group" style={{ marginBottom: '1rem' }} ref={genreDropdownRef}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                            color: isDarkMode ? '#bdc3c7' : '#495057'
                        }}>
                            Genres
                        </label>
                        <div 
                            style={{
                                minHeight: '38px',
                                border: `1px solid ${isDarkMode ? '#34495e' : '#ced4da'}`,
                                borderRadius: '0.25rem',
                                padding: '0.375rem 0.75rem',
                                backgroundColor: isDarkMode ? '#34495e' : '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '4px',
                                alignItems: 'center'
                            }}
                            onClick={() => {
                                setIsGenreDropdownOpen(!isGenreDropdownOpen);
                                setGenreSearch('');
                            }}
                        >
                            {selectedGenres.length === 0 ? (
                                <span style={{ color: isDarkMode ? '#95a5a6' : '#6c757d' }}>
                                    Select genres
                                </span>
                            ) : (
                                selectedGenres.map(genre => (
                                    <span 
                                        key={genre.genre_id || genre.id}
                                        style={{
                                            backgroundColor: isDarkMode ? '#2980b9' : '#e3f2fd',
                                            color: isDarkMode ? '#ecf0f1' : '#1976d2',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.85rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeGenre(genre.genre_id || genre.id);
                                        }}
                                    >
                                        {genre.name}
                                        <X size={14} />
                                    </span>
                                ))
                            )}
                        </div>
                        
                        {isGenreDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                backgroundColor: isDarkMode ? '#34495e' : '#fff',
                                border: `1px solid ${isDarkMode ? '#2c3e50' : '#ced4da'}`,
                                borderRadius: '0.25rem',
                                boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}>
                                <input
                                    type="text"
                                    placeholder="Search genres..."
                                    value={genreSearch}
                                    onChange={(e) => setGenreSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.375rem',
                                        marginBottom: '0.5rem',
                                        border: `1px solid ${isDarkMode ? '#2c3e50' : '#ced4da'}`,
                                        borderRadius: '0.25rem',
                                        backgroundColor: isDarkMode ? '#2c3e50' : '#fff',
                                        color: isDarkMode ? '#ecf0f1' : '#495057'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {genres
                                        .filter(genre => 
                                            !genreSearch || 
                                            genre.name.toLowerCase().includes(genreSearch.toLowerCase())
                                        )
                                        .map(genre => {
                                            const isSelected = selectedGenres.some(
                                                g => (g.genre_id || g.id) === (genre.genre_id || genre.id)
                                            );
                                            return (
                                                <div 
                                                    key={genre.genre_id || genre.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleGenre(genre);
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        backgroundColor: isSelected 
                                                            ? (isDarkMode ? '#2980b9' : '#007bff') 
                                                            : (isDarkMode ? '#2c3e50' : '#e9ecef'),
                                                        color: isSelected 
                                                            ? '#fff' 
                                                            : (isDarkMode ? '#ecf0f1' : '#495057'),
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    {genre.name}
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Release Year Range */}
                    <div className="advanced-search-grid-2 regular-variant">
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Release Year From
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 2000"
                                value={searchParams.releaseYearStart}
                                onChange={(e) => handleInputChange('releaseYearStart', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Release Year To
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 2024"
                                value={searchParams.releaseYearEnd}
                                onChange={(e) => handleInputChange('releaseYearEnd', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                    </div>

                    {/* Episode Count Range */}
                    <div className="advanced-search-grid-2 regular-variant">
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Min Episodes
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 12"
                                value={searchParams.episodeCountMin}
                                onChange={(e) => handleInputChange('episodeCountMin', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Max Episodes
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 24"
                                value={searchParams.episodeCountMax}
                                onChange={(e) => handleInputChange('episodeCountMax', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                    </div>

                    {/* Rating Range */}
                    <div className="advanced-search-grid-2 last-row regular-variant">
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Min Rating
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="e.g., 7.0"
                                value={searchParams.ratingMin}
                                onChange={(e) => handleInputChange('ratingMin', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                        <div className="advanced-search-input-group regular-variant">
                            <label className={`advanced-search-label regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                                Max Rating
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="e.g., 10.0"
                                value={searchParams.ratingMax}
                                onChange={(e) => handleInputChange('ratingMax', e.target.value)}
                                className={`advanced-search-input regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="advanced-search-actions regular-variant">
                        <button
                            onClick={handleClearAll}
                            className={`advanced-search-btn advanced-search-btn-clear regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleApplySearch}
                            className={`advanced-search-btn advanced-search-btn-apply regular-variant ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearchForm;
