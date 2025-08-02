import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { X } from 'react-feather';

const EpisodesTab = ({ searchQuery }) => {
    const { token } = useAuth();
    const { isDarkMode } = useTheme();
    const [episodeList, setEpisodeList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        anime_id: '',
        episode_number: '',
        title: '',
        duration_seconds: '',
        air_date: '',
        episode_url_yt_id: '',
        premium_only: false
    });
    const [editingId, setEditingId] = useState(null);
    const [loadingEpisodeDetails, setLoadingEpisodeDetails] = useState(false);
    const [animes, setAnimes] = useState([]);
    const [animeSearch, setAnimeSearch] = useState('');
    const [isAnimeDropdownOpen, setIsAnimeDropdownOpen] = useState(false);
    const animeDropdownRef = useRef(null);

    useEffect(() => {
        fetchEpisodes();
        fetchAnimes();
        
        const handleClickOutside = (event) => {
            if (animeDropdownRef.current && !animeDropdownRef.current.contains(event.target)) {
                setIsAnimeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchEpisodes = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/api/episodes/admin', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch episodes');
            }

            const episodes = await response.json();
            setEpisodeList(episodes);
        } catch (err) {
            console.error('Error fetching episodes:', err);
            showError('Failed to fetch episodes');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnimes = async () => {
        try {
            const response = await apiFetch('/api/animes/admin', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch animes');
            }

            const animesData = await response.json();
            setAnimes(animesData);
        } catch (err) {
            console.error('Error fetching animes:', err);
            showError('Failed to fetch animes');
        }
    };

    const showError = useCallback((message) => {
        setError(message);
        setTimeout(() => setError(''), 5000);
    }, []);

    const showSuccess = useCallback((message) => {
        setError(''); // Clear any existing errors
        // Use error state for success message with different styling
        setError(`SUCCESS: ${message}`);
        setTimeout(() => {
            setError('');
        }, 3000);
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAnimeSelect = (anime) => {
        setFormData(prev => ({
            ...prev,
            anime_id: anime.id
        }));
        setAnimeSearch(anime.title);
        setIsAnimeDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.anime_id || !formData.episode_number) {
            showError('Anime and episode number are required');
            setLoading(false);
            return;
        }
        
        try {
            const apiPath = editingId 
                ? `/api/episodes/${editingId}`
                : '/api/episodes';
            const method = editingId ? 'PUT' : 'POST';

            const requestBody = {
                anime_id: parseInt(formData.anime_id),
                episode_number: parseInt(formData.episode_number),
                title: formData.title || null,
                duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
                air_date: formData.air_date || null,
                episode_url_yt_id: formData.episode_url_yt_id || null,
                premium_only: formData.premium_only
            };

            const result = await apiFetch(apiPath, {
                method,
                body: JSON.stringify(requestBody)
            });

            await fetchEpisodes();
            
            // Show success message
            const successMessage = editingId 
                ? 'Episode updated successfully!' 
                : 'Episode created successfully!';
            showSuccess(successMessage);
            
            // Don't reset form after successful creation/update
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (episode) => {
        if (!episode) return;

        const episodeId = episode.id;
        if (!episodeId) {
            showError('Invalid episode data: missing ID');
            return;
        }

        try {
            setLoadingEpisodeDetails(true);

            // Scroll to top of the page
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Set basic form data immediately
            setFormData({
                anime_id: episode.anime_id ? String(episode.anime_id) : '',
                episode_number: episode.episode_number ? String(episode.episode_number) : '',
                title: episode.title || '',
                duration_seconds: '',
                air_date: '',
                episode_url_yt_id: '',
                premium_only: episode.premium_only || false
            });
            setEditingId(episodeId);

            // Set anime search to the anime title
            const selectedAnime = animes.find(a => a.id === episode.anime_id);
            if (selectedAnime) {
                setAnimeSearch(selectedAnime.title);
            }

            // Fetch detailed episode data
            const response = await apiFetch(`/api/episodes/${episodeId}/details`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch episode details');
            }

            const detailedEpisode = await response.json();

            // Update form data with detailed information
            setFormData({
                anime_id: detailedEpisode.anime_id ? String(detailedEpisode.anime_id) : '',
                episode_number: detailedEpisode.episode_number ? String(detailedEpisode.episode_number) : '',
                title: detailedEpisode.title || '',
                duration_seconds: detailedEpisode.duration_seconds ? String(detailedEpisode.duration_seconds) : '',
                air_date: detailedEpisode.air_date || '',
                episode_url_yt_id: detailedEpisode.episode_url_yt_id || '',
                premium_only: detailedEpisode.premium_only || false
            });

        } catch (err) {
            console.error('Error loading episode details:', err);
            showError('Error loading episode details');
        } finally {
            setLoadingEpisodeDetails(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) {
            showError('Invalid episode ID');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this episode?')) return;

        try {
            const episodeId = Number(id);
            if (isNaN(episodeId)) {
                throw new Error('Invalid episode ID format');
            }

            const response = await apiFetch(`/api/episodes/${episodeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete episode');
            }

            await fetchEpisodes();
            setError('');
            // Show success message for deletion (red styling like CharactersTab)
            setError('Episode deleted successfully');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            showError(err.message || 'Failed to delete episode');
        }
    };

    const resetForm = () => {
        setFormData({
            anime_id: '',
            episode_number: '',
            title: '',
            duration_seconds: '',
            air_date: '',
            episode_url_yt_id: '',
            premium_only: false
        });
        setEditingId(null);
        setError('');
        setAnimeSearch('');
    };

    const filteredEpisodes = episodeList.filter(episode =>
        (episode.title && episode.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (episode.anime_title && episode.anime_title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading && episodeList.length === 0) return (
        <div className="spinner-container">
            <div className="spinner"></div>
            <p>Loading episodes data...</p>
        </div>
    );

    return (
        <div className="admin-tab-content">
            {error && (
                <div className={`alert ${error.startsWith('SUCCESS:') ? 'alert-success' : 'alert-danger'}`}>
                    {error.startsWith('SUCCESS:') ? error.substring(8) : error}
                </div>
            )}

            {loadingEpisodeDetails && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading episode details...</p>
                </div>
            )}

            <div className="admin-form-section">
                <h2>{editingId ? 'Edit Episode' : 'Add New Episode'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group" ref={animeDropdownRef}>
                            <label>Anime *</label>
                            <div className="admin-dropdown">
                                <div 
                                    className="admin-dropdown-trigger"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        setIsAnimeDropdownOpen(!isAnimeDropdownOpen);
                                        setAnimeSearch('');
                                    }}
                                >
                                    {animeSearch || 'Select an anime...'}
                                </div>
                                {isAnimeDropdownOpen && (
                                    <div className="admin-dropdown-menu">
                                        <input
                                            type="text"
                                            className="admin-dropdown-search"
                                            placeholder="Search animes..."
                                            value={animeSearch}
                                            onChange={(e) => setAnimeSearch(e.target.value)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="admin-dropdown-content">
                                            {animes
                                                .filter(anime => 
                                                    !animeSearch || 
                                                    anime.title.toLowerCase().includes(animeSearch.toLowerCase())
                                                )
                                                .map(anime => (
                                                    <button
                                                        key={anime.id}
                                                        className="admin-dropdown-item"
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAnimeSelect(anime);
                                                        }}
                                                    >
                                                        {anime.title}
                                                    </button>
                                                ))
                                            }
                                            {animes.filter(anime => 
                                                !animeSearch || 
                                                anime.title.toLowerCase().includes(animeSearch.toLowerCase())
                                            ).length === 0 && (
                                                <div className="admin-dropdown-empty">No animes found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Episode Number *</label>
                            <input
                                type="number"
                                name="episode_number"
                                className="form-control"
                                value={formData.episode_number}
                                onChange={handleInputChange}
                                min="1"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Episode Title</label>
                        <input
                            type="text"
                            name="title"
                            className="form-control"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Episode title"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Duration (seconds)</label>
                            <input
                                type="number"
                                name="duration_seconds"
                                className="form-control"
                                value={formData.duration_seconds}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="Duration in seconds"
                            />
                        </div>
                        <div className="form-group">
                            <label>Air Date</label>
                            <input
                                type="date"
                                name="air_date"
                                className="form-control"
                                value={formData.air_date}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>YouTube Video ID</label>
                        <input
                            type="text"
                            name="episode_url_yt_id"
                            className="form-control"
                            value={formData.episode_url_yt_id}
                            onChange={handleInputChange}
                            placeholder="YouTube Video ID"
                        />
                    </div>
                    <div className="form-group">
                        <label className="checkbox-label">
                            <span>Premium Only</span>
                            <input
                                type="checkbox"
                                name="premium_only"
                                checked={formData.premium_only}
                                onChange={handleInputChange}
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : (editingId ? 'Update Episode' : 'Add Episode')}
                        </button>
                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                            {editingId ? 'Cancel' : 'Clear'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="admin-list-section">
                <h2>Episodes List</h2>
                {filteredEpisodes.length === 0 ? (
                    <p>No episodes found.</p>
                ) : (
                    <div className="admin-table episodes-table">
                        <div className="table-header">
                            <div className="col-anime">Anime</div>
                            <div className="col-episode">Episode #</div>
                            <div className="col-title">Title</div>
                            <div className="col-premium">Premium</div>
                            <div className="col-actions">Actions</div>
                        </div>
                        {filteredEpisodes.map(episode => (
                            <div key={episode.id} className="table-row">
                                <div className="col-anime">{episode.anime_title}</div>
                                <div className="col-episode">#{episode.episode_number}</div>
                                <div className="col-title">{episode.title || 'No title'}</div>
                                <div className="col-premium">
                                    {episode.premium_only ? 'Yes' : 'No'}
                                </div>
                                <div className="col-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(episode)}
                                        className="btn btn-edit btn-sm"
                                        disabled={loading}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(episode.id)}
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

export default EpisodesTab;
