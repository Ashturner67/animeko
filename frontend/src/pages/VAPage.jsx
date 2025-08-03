// src/pages/VAPage.js
import {Link, useParams} from 'react-router-dom';
import {useEffect, useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import placeholder from '../images/image_not_available.jpg';
import '../styles/VAPage.css';

export default function VAPage() {
    const {vaId} = useParams();
    const {token} = useAuth();
    const [va, setVa] = useState(null);
    const [error, setError] = useState(null);

    // favorite state
    const [isFavorite, setIsFavorite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    // fetch VA details
    useEffect(() => {
        apiFetch(`/api/voice-actors/${vaId}`)
            .then(r => {
                if (!r.ok) throw new Error(r.status);
                return r.json();
            })
            .then(setVa)
            .catch(err => {
                console.error('Fetch VA error:', err);
                setError('Failed to load voice actor');
            });
    }, [vaId]);

    // fetch favorites
    useEffect(() => {
        if (!token) return;
        apiFetch('/api/favorites', {
            headers: {Authorization: `Bearer ${token}`}
        })
            .then(r => r.json())
            .then(favs => {
                setIsFavorite(favs.some(f => f.entityType === 'voice_actor' && +f.entityId === +vaId));
            })
            .catch(console.error);
    }, [vaId, token]);

    // toggle favorite
    const toggleFavorite = () => {
        if (!token) return;
        setFavLoading(true);
        apiFetch('/api/favorites', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}`
            }, 
            body: JSON.stringify({ 
                entityType: 'voice_actor',
                entityId: +vaId 
            })
        })
            .then(r => r.json())
            .then(data => setIsFavorite(data.favorite))
            .catch(console.error)
            .finally(() => setFavLoading(false));
    };

    if (error) return <div className="va-error">{error}</div>;
    if (!va) return <div className="spinner-container">
                        <div className="spinner"></div>
                    </div>;

    const {name, bio, roles = [], imageUrl} = va;
    console.log('Voice Actor Data:', { name, imageUrl });

    // Check if we should show the placeholder
    const showPlaceholder = !imageUrl || imageUrl === 'null' || imageUrl === 'undefined';

    return (<div className="va-page">
        <div className="va-header-card">
            <div className="va-photo-container">
                <img
                    src={showPlaceholder ? placeholder : imageUrl}
                    alt={showPlaceholder ? `${name} - No Image Available` : name}
                    className="va-photo"
                    style={{
                        objectFit: showPlaceholder ? 'contain' : 'cover',
                        padding: showPlaceholder ? '1.5rem' : '0',
                        opacity: showPlaceholder ? 0.7 : 1
                    }}
                    onError={(e) => {
                        console.error('Error loading image:', imageUrl);
                        e.target.onerror = null;
                        e.target.src = placeholder;
                        e.target.style.objectFit = 'contain';
                        e.target.style.padding = '1.5rem';
                        e.target.style.opacity = 0.7;
                    }}
                />
            </div>
            <div className="va-info">
                <div className="va-info-header spaced-header">
                    <h2 className="va-name wrap-name">{name}</h2>
                    {token && (
                        <button
                            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
                            onClick={toggleFavorite}
                            disabled={favLoading}
                        >
                            <div className="favorite-icon">{isFavorite ? '❤️' : '🤍'}</div>
                            <div className="favorite-text">{favLoading ? '…' : isFavorite ? 'Remove from Favorite' : 'Add to Favorites'}</div>
                        </button>
                    )}
                </div>
                {bio && <p className="va-bio">{bio}</p>}
            </div>
        </div>

        <h3 className="va-roles-heading">Roles</h3>
        {roles.length > 0 ? (<div className="va-roles-grid">
            {roles.map(({animeId, animeTitle, characterId, characterName, animeImageUrl, characterImageUrl}) => (
                <div key={`${animeId}-${characterId}`} className="va-role-card">
                    <Link to={`/anime/${animeId}`} className="role-anime-link">
                        <div className="role-anime-image">
                            <img 
                                src={animeImageUrl || placeholder} 
                                alt={animeTitle}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = placeholder;
                                }}
                            />
                        </div>
                        <strong>{animeTitle}</strong>
                    </Link>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3em', marginTop: '0.7em'}}>
                        
                        <Link to={`/character/${characterId}`} className="role-char-link" style={{display: 'flex', alignItems: 'center', gap: '0.5em', marginTop: '0.2em'}}>
                            <span className="va-thumb-container" style={{width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <img
                                    src={characterImageUrl || placeholder}
                                    alt={characterName}
                                    className="va-thumb"
                                    style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}}
                                    onError={e => {
                                        e.target.onerror = null;
                                        e.target.src = placeholder;
                                    }}
                                />
                            </span>
                            <span>{characterName}</span>
                        </Link>
                    </div>
                </div>))}
        </div>) : (<p className="no-roles">No roles found for this actor.</p>)}
    </div>);
}
