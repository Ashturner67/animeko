// frontend/src/contexts/AuthContext.js
import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {jwtDecode} from 'jwt-decode';
import { apiFetch } from '../utils/api';

const AuthContext = createContext(null);

const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [logoutTrigger, setLogoutTrigger] = useState(false);

    const resetLogoutTrigger = useCallback(() => {
        setLogoutTrigger(false);
    }, []);

    // Function to decode token and set user info including isAdmin
    const setUserFromToken = useCallback((jwtToken) => {
        try {
            const decoded = jwtDecode(jwtToken);
            // console.log('Decoded token:', decoded);
            // Use is_admin directly from decoded token
            const userData = {
                id: decoded.id,
                user_id: decoded.id,
                username: decoded.username,
                email: decoded.email || '',
                display_name: decoded.username,
                is_admin: decoded.is_admin === true || decoded.is_admin === 't' || decoded.is_admin === 1 || decoded.is_admin === 'true' || decoded.is_admin === '1'
            };
            // console.log('Setting user from token:', userData);
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to decode token:', error);
            setUser(null);
            return null;
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        setLogoutTrigger(true);
    }, []);

    const fetchUserProfile = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const response = await apiFetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Profile fetch error:', errorData);

                if (response.status === 401 || response.status === 403) {
                    logout();
                    throw new Error(errorData.message || 'Session expired. Please login again.');
                }
                throw new Error(errorData.message || 'Failed to fetch user profile');
            }

            const userData = await response.json();

            // CRITICAL: Preserve is_admin from JWT token, don't trust API response
            const decoded = jwtDecode(token);
            const tokenIsAdmin = decoded.is_admin === true || decoded.is_admin === 't' || decoded.is_admin === 1 || decoded.is_admin === 'true' || decoded.is_admin === '1';

            const userWithAdmin = {
                id: userData.user_id || userData.id,
                user_id: userData.user_id || userData.id,
                username: userData.username,
                email: userData.email || '',
                display_name: userData.display_name || userData.username,
                profile_bio: userData.profile_bio || '',
                visibility_level: userData.visibility_level || 'public',
                created_at: userData.created_at || '',
                subscription_status: userData.subscription_status || '',
                profile_picture_url: userData.profile_picture_url || '',
                is_admin: tokenIsAdmin // Always use token value, never API response
            };

            // console.log('Updated user from profile fetch:', userWithAdmin);
            setUser(userWithAdmin);
            return userWithAdmin;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            setError(error.message);
            // Don't clear user on fetch error, keep the token-based user
            throw error;
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        if (token) {
            const tokenUser = setUserFromToken(token);
            if (tokenUser) {
                // Only fetch profile if token decode was successful
                fetchUserProfile().catch(err => {
                    console.error('Profile fetch failed, but keeping token user:', err);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [token, setUserFromToken, fetchUserProfile]);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    const login = useCallback(async (username, password) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiFetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({username, password})
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Login failed. Please check your credentials.');
            }

            const data = await response.json();
            
            // Store the token and user data from the response
            setToken(data.token);
            
            // Set the user data from the response
            const userData = data.user || {};
            if (userData) {
                // Ensure we have all required fields
                const completeUserData = {
                    id: userData.user_id || userData.id,
                    user_id: userData.user_id || userData.id,
                    username: userData.username,
                    email: userData.email || '',
                    display_name: userData.display_name || userData.username,
                    profile_picture_url: userData.profile_picture_url || '',
                    is_admin: Boolean(userData.is_admin)
                };
                
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(completeUserData));
                setUser(completeUserData);
                return completeUserData;
            }
            
            // Fallback to token decoding if no user data in response
            const tokenUser = setUserFromToken(data.token);
            return tokenUser || {};

        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [setUserFromToken]);

    const register = useCallback(async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiFetch('/api/auth/register', {
                method: 'POST', headers: {
                    'Content-Type': 'application/json'
                }, body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            return data;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (profileData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiFetch('/api/auth/profile', {
                method: 'PUT', headers: {
                    'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`
                }, body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Profile update failed');
            }

            // Preserve is_admin from token when updating
            const decoded = jwtDecode(token);
            const tokenIsAdmin = decoded.is_admin === true || decoded.is_admin === 't' || decoded.is_admin === 1 || decoded.is_admin === 'true' || decoded.is_admin === '1';

            setUser(prev => ({
                ...prev,
                ...data.user,
                is_admin: tokenIsAdmin // Always preserve token value
            }));
            return data;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Check if user is authenticated (has a token and user data)
    const isAuthenticated = !!token && !!user;

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            error,
            isAuthenticated,
            login,
            logout,
            register,
            updateProfile,
            isAdmin: user?.is_admin || false,
            logoutTrigger,
            resetLogoutTrigger
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export {AuthProvider, AuthContext};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};