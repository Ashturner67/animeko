import React, { createContext, useContext, useState, useEff            newSocket.on('notificationDeleted', (notificationId) => {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            });om 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../utils/api';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user, token, isAdmin } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(false);

    // Initialize socket connection only for authenticated non-admin users
    useEffect(() => {
        if (user && token && !isAdmin) {
            // Close existing socket if it exists
            if (socket) {
                socket.close();
                setSocket(null);
            }
            
            const newSocket = io(SOCKET_URL, {
                auth: {
                    token: token
                },
                // Configuration to reduce disconnections for idle users
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 2000, // Wait 2 seconds before reconnecting
                reconnectionDelayMax: 10000, // Max 10 seconds delay
                reconnectionAttempts: 10, // More reconnection attempts
                timeout: 45000, // 45 seconds connection timeout
                forceNew: false,
                transports: ['websocket', 'polling'] // Use both transport methods
            });

            newSocket.on('connect', () => {
                console.log('Connected to notification socket');
            });

            newSocket.on('newNotification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                // Don't manually increment - wait for unreadCountUpdate event
            });

            newSocket.on('unreadCountUpdate', ({ count }) => {
                setUnreadCount(count);
            });

            newSocket.on('notificationDeleted', ({ notificationId }) => {
                console.log('🗑️ Received notification deletion event for ID:', notificationId);
                setNotifications(prev => {
                    const filtered = prev.filter(notification => notification.id !== notificationId);
                    console.log('📝 Removed notification from list. Previous length:', prev.length, '→ New length:', filtered.length);
                    return filtered;
                });
            });

            newSocket.on('disconnect', (reason) => {
                // Only log unexpected disconnections
                if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
                    console.log('Disconnected from notification socket:', reason);
                }
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        } else {
            // Close existing socket if user logs out or becomes admin
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user?.id, token, isAdmin]); // Remove socket dependency to prevent infinite loops

    // Fetch initial notifications and unread count only for authenticated non-admin users
    useEffect(() => {
        if (user && token && !isAdmin) {
            fetchNotifications(1, 50); // Fetch more notifications to see if there are hidden ones
            fetchUnreadCount();
        }
    }, [user?.id, token, isAdmin]); // Only depend on user.id instead of entire user object

    const fetchNotifications = async (page = 1, limit = 20) => {
        if (!token) return;

        try {
            setLoading(true);
            console.log('📥 Fetching notifications, page:', page, 'limit:', limit);
            const response = await fetch(`${API_BASE_URL}/notifications?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📥 Notifications fetched:', data.notifications.length, 'notifications');
                console.log('📥 Unread notifications:', data.notifications.filter(n => !n.is_read).length);
                if (page === 1) {
                    setNotifications(data.notifications);
                } else {
                    setNotifications(prev => [...prev, ...data.notifications]);
                }
            } else {
                console.error('❌ Failed to fetch notifications, status:', response.status);
            }
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        if (!token) return;

        try {
            console.log('📊 Fetching initial unread count...');
            const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Initial unread count fetched:', data.count);
                setUnreadCount(data.count);
            } else {
                console.error('❌ Failed to fetch unread count, status:', response.status);
            }
        } catch (error) {
            console.error('❌ Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === notificationId
                            ? { ...notification, is_read: true }
                            : notification
                    )
                );
                // Update unread count by decrementing by 1
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!token) return;

        console.log('🔄 Attempting to mark all notifications as read...');
        try {
            const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Mark all as read response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Mark all as read successful:', data);
                setNotifications(prev =>
                    prev.map(notification => ({ ...notification, is_read: true }))
                );
                setUnreadCount(0);
                console.log('🔢 Unread count reset to 0');
            } else {
                console.error('❌ Mark all as read failed with status:', response.status);
                const errorData = await response.text();
                console.error('Error response:', errorData);
            }
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications(prev => {
                    const notificationToDelete = prev.find(n => n.id === notificationId);
                    const wasUnread = notificationToDelete && !notificationToDelete.is_read;
                    
                    // Update unread count if we're deleting an unread notification
                    if (wasUnread) {
                        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
                    }
                    
                    return prev.filter(notification => notification.id !== notificationId);
                });
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const deleteAllNotifications = async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error deleting all notifications:', error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
