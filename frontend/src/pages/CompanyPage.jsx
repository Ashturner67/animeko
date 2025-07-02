import {Link, useParams} from 'react-router-dom';
import {useEffect, useState} from 'react';
import placeholder from '../images/image_not_available.jpg';
import '../styles/CompanyPage.css';

export default function CompanyPage() {
    const {companyId} = useParams();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`/api/company/${companyId}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setCompany(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Fetch company error:', err);
                setError('Failed to load company');
                setLoading(false);
            });
    }, [companyId]);

    if (loading) return <div className="spinner-container">
                        <div className="spinner"></div>
                    </div>;
    if (error) return <div className="company-error">{error}</div>;
    if (!company) return <div className="company-error">Company not found</div>;

    const {name, country, founded, animeList = []} = company;

    return (<div className="company-page">
        {/* Header Card */}
        <div className="company-header-card">
            <div className="company-meta">
                <h2 className="company-name">{name}</h2>
                <p className="company-info">
                    {country && <>Country: {country}<br/></>}
                    {founded && <>Founded: {new Date(founded).toLocaleDateString()}<br/></>}
                </p>
            </div>
        </div>

        {/* Anime Grid */}
        <h3 className="company-anime-heading">Anime produced by {name}</h3>
        {animeList.length > 0 ? (<div className="company-anime-grid">
            {animeList.map(({animeId, title, imageUrl}) => (<Link
                to={`/anime/${animeId}`}
                key={animeId}
                className="company-anime-card"
            >
                <img
                    src={imageUrl || placeholder}
                    alt={`${title} placeholder`}
                    className="anime-thumb"
                />
                <p className="anime-title">{title}</p>
            </Link>))}
        </div>) : (<p className="no-anime">No anime found for this company.</p>)}
    </div>);
}
