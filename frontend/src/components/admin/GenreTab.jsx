import React, {useEffect, useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const GenreTab = ({searchQuery}) => {
    const {token} = useAuth();
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchGenres();
    }, []);

    const fetchGenres = async () => {
        console.log('Fetching genres...');
        setLoading(true);
        try {
            const response = await apiFetch('/api/genre');
            console.log('Genres response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch genres:', errorText);
                throw new Error('Failed to fetch genres');
            }
            const data = await response.json();
            console.log('Fetched genres:', data);
            
            const formattedData = Array.isArray(data)
                ? data.map(genre => ({
                    ...genre,
                    genre_id: genre.genre_id || genre.id,
                    id: genre.genre_id || genre.id
                }))
                : [];
                
            console.log('Formatted genres:', formattedData);
            setGenres(formattedData);
            setError('');
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to load genres');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
        console.log('Form submission started', { formData, editingId });
        setLoading(true);
        setError('');

        if (!formData.name.trim()) {
            const errorMsg = 'Genre name is required';
            console.error('Validation error:', errorMsg);
            showError(errorMsg);
            setLoading(false);
            return;
        }

        const apiPath = editingId
            ? `/api/genre/${editingId}`
            : '/api/genre';
        const method = editingId ? 'PUT' : 'POST';

        try {
            console.log(`Sending ${method} request to:`, apiPath);
            const requestBody = {
                name: formData.name.trim(),
                description: formData.description || null
            };
            console.log('Request payload:', requestBody);
            
            const response = await apiFetch(apiPath, {
                method,
                body: JSON.stringify(requestBody)
            });

            console.log('API response:', response);

            if (!response.ok) {
                const responseData = await response.json().catch(() => ({}));
                const errorMsg = responseData.message || 
                    (editingId ? 'Failed to update genre' : 'Failed to add genre');
                console.error('API error:', errorMsg);
                throw new Error(errorMsg);
            }

            console.log('Genre operation successful, refreshing list...');
            await fetchGenres();
            
            // Show success message
            const successMessage = editingId 
                ? 'Genre updated successfully!' 
                : 'Genre created successfully!';
            showSuccess(successMessage);
            
            // Don't reset form after successful creation/update
            console.log('Form handled and list refreshed');
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            showError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (genre) => {
        console.log('Editing genre:', genre);
        if (!genre) {
            console.error('No genre data provided');
            return;
        }
        
        const genreId = genre.genre_id || genre.id;
        if (!genreId) {
            const errorMsg = 'Invalid genre data: missing ID';
            console.error(errorMsg, genre);
            showError(errorMsg);
            return;
        }
        
        // Scroll to top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('Setting form data for genre ID:', genreId);
        setFormData({
            name: genre.name || '',
            description: genre.description || ''
        });
        setEditingId(genreId);
        
        // Scroll to form
        document.querySelector('.admin-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        console.log('Deleting genre ID:', id);
        if (!id) {
            const errorMsg = 'Invalid genre ID';
            console.error(errorMsg);
            showError(errorMsg);
            return;
        }
        
        if (!window.confirm('Are you sure you want to delete this genre? This action cannot be undone.')) {
            console.log('Deletion cancelled by user');
            return;
        }
        
        try {
            const genreId = Number(id);
            if (isNaN(genreId)) {
                throw new Error('Invalid genre ID format');
            }
            
            console.log(`Sending DELETE request for genre ID: ${genreId}`);
            const response = await apiFetch(`/api/genre/${genreId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseData = await response.json().catch(() => ({}));
            console.log('Delete response:', { status: response.status, data: responseData });

            if (!response.ok) {
                const errorMsg = responseData.message || 'Failed to delete genre';
                console.error('Delete failed:', errorMsg);
                throw new Error(errorMsg);
            }

            console.log('Genre deleted successfully, refreshing list...');
            await fetchGenres();
            setError('');
            showError('Genre deleted successfully');
        } catch (err) {
            console.error('Delete error:', err);
            showError(err.message || 'Failed to delete genre');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: ''
        });
        setEditingId(null);
        setError('');
    };

    const filteredGenres = genres.filter(genre =>
        genre.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="admin-tab-content">
            <div className="admin-form-section">
                <h2>{editingId ? 'Edit Genre' : 'Add New Genre'}</h2>
                {error && (
                    <div className={`alert mt-2 ${error.startsWith('SUCCESS:') ? 'alert-success' : 'alert-danger'}`}>
                        {error.startsWith('SUCCESS:') ? error.substring(8) : error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
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
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="3"
                        ></textarea>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Update' : 'Add'} Genre
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
                <h2>Genre List</h2>
                {filteredGenres.length === 0 ? (
                    <p>No genres found.</p>
                ) : (
                    <div className="admin-table genre-table">
                        <div className="table-header">
                            <div>Name</div>
                            <div>Description</div>
                            <div>Actions</div>
                        </div>
                        {filteredGenres.map(genre => (
                            <div key={genre.genre_id} className="table-row">
                                <div>{genre.name}</div>
                                <div>
                                    {genre.description || 'No description'}
                                </div>
                                <div className="table-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(genre)}
                                        className="btn btn-edit btn-sm"
                                        disabled={loading}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(genre.genre_id)}
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

export default GenreTab;
