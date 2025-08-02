import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import AnimeCard from '../components/AnimeCard';
import ListCard from '../components/ListCard';
import CastCard from '../components/CastCard';
import UserSearchCard from '../components/UserSearchCard';
import '../styles/Home.css'; // Reusing Home.css for now, can create a specific one later


function SearchResultsPage() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation();
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [pendingSortField, setPendingSortField] = useState('name');
    const [pendingSortOrder, setPendingSortOrder] = useState('asc');
    const { token } = useAuth(); // Get the auth token

    // Get search type from query string
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get('type') || 'anime';

    const handleApplySort = () => {
        setSortField(pendingSortField);
        setSortOrder(pendingSortOrder);
    };

    useEffect(() => {
        const fetchSearchResults = async () => {
            setLoading(true);
            setError(null);
            // Build query string for /api/search
            const params = new URLSearchParams(location.search);
            // Only add sort for anime
            if (type === 'anime') {
                params.set('sortField', sortField);
                params.set('sortOrder', sortOrder);
            } else {
                params.delete('sortField');
                params.delete('sortOrder');
            }
            try {
                // Check if user search requires authentication
                if (type === 'user' && !token) {
                    setError('Please log in to search for other users');
                    setResults([]);
                    return;
                }

                // Prepare headers - include auth token if available
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await apiFetch(`/api/search?${params.toString()}`, {
                    headers: headers
                });
                
                if (!response.ok) {
                    if (response.status === 401 && type === 'user') {
                        throw new Error('Please log in to search for other users');
                    }
                    throw new Error(`Status ${response.status}`);
                }
                
                const data = await response.json();
                setResults(data);
            } catch (err) {
                setError(`Failed to fetch search results: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchSearchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, sortField, sortOrder, token]); // Added token dependency

    // Renderers for each type
    const renderResults = () => {
        if (type === 'anime') {
            return (
                <div className="anime-grid">
                    {results.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                    ))}
                </div>
            );
        }
        if (type === 'list') {
            return (
                <div className="anime-grid">
                    {results.map(list => (
                        <ListCard key={list.id} list={list} />
                    ))}
                </div>
            );
        }
        if (type === 'character') {
            return (
                <div className="anime-grid">
                    {results.map(char => (
                        <CastCard
                            key={char.id}
                            characterId={char.id}
                            name={char.name}
                            imageUrl={char.imageUrl}
                            vaName={char.vaName}
                            vaId={char.vaId}
                            va_image_url={char.va_image_url}
                        />
                    ))}
                </div>
            );
        }
        if (type === 'va') {
            return (
                <div className="anime-grid">
                    {results.map(va => (
                        <div key={va.id} className="simple-card">
                            <div style={{textAlign:'center'}}>
                                <img src={va.imageUrl || '/src/images/image_not_available.jpg'} alt={va.name} style={{width:'100px',height:'100px',objectFit:'cover',borderRadius:'50%'}} />
                            </div>
                            <h4>
                                <a href={`/va/${va.id}`} className="va-link">{va.name}</a>
                            </h4>
                        </div>
                    ))}
                </div>
            );
        }
        if (type === 'user') {
            return (
                <div className="user-search-results">
                    {results.map(user => (
                        <UserSearchCard key={user.id} user={user} />
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="home-page"> {/* Reusing home-page class for styling */}
            <section className="results-section">
                <h3>Search Results</h3>
                
                {/* Only show sort controls for anime */}
                {type === 'anime' && (
                    <div className="sort-controls-container">
                        <div className="sort-controls">
                            <label htmlFor="sortField">Sort by:</label>
                            <select id="sortField" value={pendingSortField} onChange={(e) => setPendingSortField(e.target.value)}>
                                <option value="name">Name</option>
                                <option value="rating">Rating</option>
                                <option value="release_date">Release Date</option>
                                <option value="rank">Rank</option>
                            </select>
                            <label htmlFor="sortOrder">Order:</label>
                            <select id="sortOrder" value={pendingSortOrder} onChange={(e) => setPendingSortOrder(e.target.value)}>
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                        <button onClick={handleApplySort}>Apply</button>
                    </div>
                )}
                {loading && (
                    <div className="spinner-container">
                        <div className="spinner"></div>
                        <p>Loading search results...</p>
                    </div>
                )}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && results.length === 0 && (
                    <p className="no-results">No results found for your search criteria.</p>
                )}
                {renderResults()}
            </section>
        </div>
    );
}

export default SearchResultsPage;
