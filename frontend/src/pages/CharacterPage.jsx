// src/pages/CharacterPage.js
import {Link, useParams} from 'react-router-dom';
import {useEffect, useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import placeholder from '../images/image_not_available.jpg';
import '../styles/CharacterPage.css';

export default function CharacterPage() {
    const {charId} = useParams();
    const {token} = useAuth();
    const [char, setChar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // favorite state
    const [isFavorite, setIsFavorite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    // fetch character details
    useEffect(() => {
        apiFetch(`/api/characters/${charId}`)
            .then(res => {
                if (!res.ok) throw new Error(res.status);
                return res.json();
            })
            .then(data => {
                setChar(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Fetch character error:', err);
                setError('Failed to load character');
                setLoading(false);
            });
    }, [charId]);

    // fetch favorites
    useEffect(() => {
        if (!token) return;
        apiFetch('/api/favorites', {
            headers: {Authorization: `Bearer ${token}`}
        })
            .then(r => r.json())
            .then(favs => {
                setIsFavorite(favs.some(f => f.entityType === 'character' && +f.entityId === +charId));
            })
            .catch(console.error);
    }, [charId, token]);

    // toggle favorite
    const toggleFavorite = () => {
        if (!token) return;
        setFavLoading(true);
        apiFetch('/api/favorites', {
            method: 'POST', headers: {
                'Content-Type': 'application/json', Authorization: `Bearer ${token}`
            }, body: JSON.stringify({entityType: 'character', entityId: +charId})
        })
            .then(r => r.json())
            .then(data => setIsFavorite(data.favorite))
            .catch(console.error)
            .finally(() => setFavLoading(false));
    };

    if (loading) return <div className="spinner-container">
                        <div className="spinner"></div>
                    </div>;
    if (error) return <div className="char-error">{error}</div>;
    if (!char) return <div className="char-error">Character not found</div>;

    const {name, description, vaId, vaName = 'Unknown', animeList = [], imageUrl} = char;

    return (<div className="character-page">
        {/* Header Card */}
        <div className="character-header-card">
            <div className="character-photo-container">
                <img
                    src={imageUrl || placeholder}
                    alt={name}
                    className="character-photo"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholder;
                        e.target.style.objectFit = 'contain';
                        e.target.style.padding = '1rem';
                    }}
                />
            </div>
            <div className="character-meta">
                <div className="character-meta-header spaced-header">
                    <h2 className="character-name wrap-name">{name}</h2>
                    <button
                        className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
                        onClick={toggleFavorite}
                        disabled={favLoading}
                    >
                        <div className="favorite-icon">{isFavorite ? '❤️' : '🤍'}</div>
                        <div className="favorite-text">{favLoading ? '…' : isFavorite ? 'Remove from Favorite' : 'Add to Favorites'}</div>
                    </button>
                </div>
                {description && <p className="character-desc">{description}</p>}
                <p className="character-va">
                    <span className="va-info" style={{display: 'flex', alignItems: 'flex-start', gap: '0.5em'}}>
                      <span>voiced by</span>
                      {vaId ? (
                        <Link to={`/va/${vaId}`} className="va-link" style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
                          <span className="va-thumb-container" style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <img
                              src={char.va_image_url || placeholder}
                              alt={vaName}
                              className="va-thumb"
                              style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}}
                              onError={e => {
                                e.target.onerror = null;
                                e.target.src = placeholder;
                              }}
                            />
                          </span>
                          <span>{vaName}</span>
                        </Link>
                      ) : (
                        <span className="va-unknown">Unknown</span>
                      )}
                    </span>
                </p>
            </div>
        </div>

        {/* Anime Appearances */}
        <h3 className="appearances-heading">Appears In</h3>
        {animeList.length > 0 ? (<div className="appearances-grid">
            {animeList.map(({animeId, animeTitle, imageUrl}) => (<Link
                to={`/anime/${animeId}`}
                key={animeId}
                className="appearance-card"
            >
                <img
                    src={imageUrl || placeholder}
                    alt={`${animeTitle} cover`}
                    className="appearance-thumb"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholder;
                    }}
                />
                <p className="appearance-title">{animeTitle}</p>
            </Link>))}
        </div>) : (<p className="no-appearances">No anime appearances found.</p>)}
    </div>);
}
