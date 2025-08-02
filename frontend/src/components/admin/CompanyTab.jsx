import React, {useEffect, useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const CompanyTab = ({searchQuery}) => {
    const {token} = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        country: '',
        founded: ''
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await apiFetch('/api/company');
            if (!response.ok) {
                throw new Error('Failed to fetch companies');
            }
            const data = await response.json();
            // Normalize IDs
            const formattedData = Array.isArray(data)
                ? data.map(company => ({
                    ...company,
                    company_id: company.company_id || company.id,
                    id: company.company_id || company.id
                }))
                : [];
            setCompanies(formattedData);
        } catch (err) {
            setError(err.message);
            console.error('Fetch error:', err);
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
        setLoading(true);
        setError('');

        if (!formData.name.trim()) {
            showError('Company name is required');
            setLoading(false);
            return;
        }

        const url = editingId
            ? `/api/company/${editingId}`
            : '/api/company';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    country: formData.country.trim() || null,
                    founded: formData.founded || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.message || (editingId ? 'Failed to update company' : 'Failed to add company'));
                setLoading(false);
                return;
            }

            await fetchCompanies();
            
            // Show success message
            const successMessage = editingId 
                ? 'Company updated successfully!' 
                : 'Company created successfully!';
            showSuccess(successMessage);
            
            // Don't reset form after successful creation/update
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (company) => {
        if (!company) return;
        const companyId = company.company_id || company.id;
        if (!companyId) {
            showError('Invalid company data: missing ID');
            return;
        }
        
        // Scroll to top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setFormData({
            name: company.name || '',
            country: company.country || '',
            founded: company.founded ? company.founded.split('T')[0] : ''
        });
        setEditingId(companyId);
    };

    const handleDelete = async (id) => {
        if (!id) {
            showError('Invalid company ID');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this company? This will remove the company record.')) return;
        try {
            const companyId = Number(id);
            if (isNaN(companyId)) {
                showError('Invalid company ID format');
                return;
            }
            const response = await apiFetch(`/api/company/${companyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.message || 'Failed to delete company');
                return;
            }
            await fetchCompanies();
            setError('');
        } catch (err) {
            showError(err.message || 'Failed to delete company');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            country: '',
            founded: ''
        });
        setEditingId(null);
        setError('');
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="spinner-container">
            <div className="spinner"></div>
            <p>Loading company data...</p>
        </div>
    );

    return (
        <div className="admin-tab-content">
            {error && (
                <div className={`alert ${error.startsWith('SUCCESS:') ? 'alert-success' : 'alert-danger'}`}>
                    {error.startsWith('SUCCESS:') ? error.substring(8) : error}
                </div>
            )}
            <div className="admin-form-section">
                <h2>{editingId ? 'Edit Company' : 'Add New Company'}</h2>
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
                        <label>Country</label>
                        <input
                            type="text"
                            name="country"
                            className="form-control"
                            value={formData.country}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Founded Date</label>
                        <input
                            type="date"
                            name="founded"
                            className="form-control"
                            value={formData.founded}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Update' : 'Add'} Company
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
                <h2>Company List</h2>
                {filteredCompanies.length === 0 ? (
                    <p>No companies found.</p>
                ) : (
                    <div className="admin-table">
                        <div className="table-header">
                            <div className="col-name">Name</div>
                            <div className="col-country">Country</div>
                            <div className="col-founded">Founded</div>
                            <div className="col-actions">Actions</div>
                        </div>
                        {filteredCompanies.map(company => (
                            <div key={company.company_id} className="table-row">
                                <div className="col-name">{company.name}</div>
                                <div className="col-country">{company.country || 'N/A'}</div>
                                <div className="col-founded">
                                    {company.founded ? new Date(company.founded).getFullYear() : 'N/A'}
                                </div>
                                <div className="col-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(company)}
                                        className="btn btn-edit btn-sm"
                                        disabled={loading}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(company.company_id)}
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

export default CompanyTab;
