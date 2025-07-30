import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'react-feather';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NotificationBell.css';

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
    const { user, isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Don't show notification bell for unauthenticated users or admins
    if (!user || isAdmin) return null;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return time.toLocaleDateString();
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return '👤';
            case 'friend_accept':
                return '✅';
            case 'anime_recommend':
                return '📺';
            default:
                return '🔔';
        }
    };

    const recentNotifications = notifications.slice(0, 5);

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className="notification-bell-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-actions">
                            {unreadCount > 0 && (
                                <button
                                    className="action-button"
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                >
                                    <Check size={16} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    className="action-button delete-all"
                                    onClick={deleteAllNotifications}
                                    title="Clear all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button
                                className="action-button close-button"
                                onClick={() => setIsOpen(false)}
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="notification-list">
                        {recentNotifications.length === 0 ? (
                            <div className="no-notifications">
                                <Bell size={32} className="no-notifications-icon" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            recentNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-message">
                                            <span className="sender-name">
                                                {notification.sender_display_name || notification.sender_username || 'System'}
                                            </span>
                                            {' '}
                                            <span className="message-text">
                                                {notification.message}
                                            </span>
                                        </div>
                                        <div className="notification-time">
                                            {formatTimeAgo(notification.created_at)}
                                        </div>
                                    </div>
                                    <div className="notification-controls">
                                        {!notification.is_read && (
                                            <button
                                                className="control-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="control-button delete-button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            title="Delete"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 5 && (
                        <div className="notification-footer">
                            <button
                                className="see-all-button"
                                onClick={() => {
                                    setIsOpen(false);
                                    // Navigate to full notifications page (implement if needed)
                                }}
                            >
                                See All Notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
