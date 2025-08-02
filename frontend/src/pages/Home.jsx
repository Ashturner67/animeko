// src/pages/Home.js
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import ContinueWatching from '../components/ContinueWatching';
import FriendRecommendations from '../components/FriendRecommendations';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl, apiFetch } from '../utils/api';

// import the extracted styles
import '../styles/Home.css';

function Home() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [pendingSortField, setPendingSortField] = useState('name');
    const [pendingSortOrder, setPendingSortOrder] = useState('asc');
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        if (user && user.is_admin) {
            navigate('/admin', { replace: true });
        }
    }, [user, navigate]);

    // Fetch favorites once when component mounts or token changes
    useEffect(() => {
        if (!token) {
            setFavorites([]);
            return;
        }

        apiFetch('/api/favorites', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(favs => {
                setFavorites(favs);
            })
            .catch(console.error);
    }, [token]);

    useEffect(() => {
        const fetchAllAnime = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiFetch(`/api/animes?sortField=${sortField}&sortOrder=${sortOrder}`);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const data = await response.json();
                setAnimeList(data);
            } catch (err) {
                setError(`Failed to fetch anime: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAllAnime();
    }, [sortField, sortOrder]);

    const handleApplySort = () => {
        setSortField(pendingSortField);
        setSortOrder(pendingSortOrder);
    };

    return (
        <div className="home-page">
            <div className="welcome-section">
                <h2>Welcome to AnimeKo</h2>
                <p>Discover and explore your favorite anime series and movies!</p>
            </div>

            {/* Continue Watching Section */}
            {user && <ContinueWatching limit={10} />}

            {/* Friend Recommendations Section */}
            {user && <FriendRecommendations limit={10} />}

            <section className="results-section">
                <h3>All Anime</h3>
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
                {loading && (
                    <div className="spinner-container">
                        <div className="spinner"></div>
                        <p>Loading anime...</p>
                    </div>
                )}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && animeList.length === 0 && (
                    <p className="no-results">No anime available.</p>
                )}

                <div className="anime-grid">
                    {animeList.map(anime => (
                        <AnimeCard 
                            key={anime.id} 
                            anime={anime} 
                            initialFavoriteStatus={favorites.some(f => f.entityType === 'anime' && +f.entityId === +anime.id)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default Home;
