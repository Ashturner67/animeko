import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import placeholder from '../images/image_not_available.jpg';
import '../styles/GenrePage.css';
import { useTheme } from '../contexts/ThemeContext';

export default function GenrePage() {
    const { genreId } = useParams();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const [genre, setGenre] = useState(null);
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // 1. Fetch genre details
                const genreRes = await apiFetch(`/api/genre/${genreId}`);
                if (!genreRes.ok) throw new Error(`Status ${genreRes.status}`);
                const genreData = await genreRes.json();
                
                // 2. Fetch anime by genre
                const animeRes = await apiFetch(`/api/animes?genre=${encodeURIComponent(genreData.name)}`);
                if (!animeRes.ok) throw new Error(`Status ${animeRes.status}`);
                const animeData = await animeRes.json();
                
                setGenre(genreData);
                setAnimeList(Array.isArray(animeData) ? animeData : []);
                setLoading(false);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to load genre data');
                setLoading(false);
            }
        };

        fetchData();
    }, [genreId, navigate]);

    if (loading) return <div className="spinner-container">
                        <div className="spinner"></div>
                        <p>Loading genre data...</p>
                    </div>;
    if (error) return <div className="genre-error">{error}</div>;
    if (!genre) return <div className="genre-error">Genre not found</div>;

    const { name, description } = genre;

    return (<div className={`genre-page ${isDarkMode ? 'dark-mode' : ''}`}>
        {/* Header Card */}
        <div className="genre-header-card">
            <div className="genre-meta">
                <h2 className="genre-name">{name}</h2>
                {description && <p className="genre-desc">{description}</p>}
            </div>
        </div>

        {/* Anime Grid */}
        {animeList.length > 0 ? (
            <div className="genre-anime-grid">
                {animeList.map((anime) => (
                    <Link
                        to={`/anime/${anime.id || anime.anime_id}`}
                        key={anime.id || anime.anime_id}
                        className="company-anime-item"
                    >
                        <div className="company-anime-poster">
                            <img
                                src={anime.imageUrl || placeholder}
                                alt={`${anime.title} poster`}
                                className="company-anime-image"
                            />
                        </div>
                        <h4 className="company-anime-title">{anime.title}</h4>
                    </Link>
                ))}
            </div>
        ) : (
            <p className="no-anime">No anime found for this genre.</p>
        )}
    </div>);
}
