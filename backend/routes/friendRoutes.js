import express from 'express';
import Friendship from '../models/Friendship.js'; // Import the Friendship model
import User from '../models/User.js'; // Import the User model
import Favorite from '../models/Favorite.js'; // Import the Favorite model
import Notification from '../models/Notification.js'; // Import the Notification model
import NotificationService from '../services/NotificationService.js'; // Import the Notification service
import authenticate from '../middlewares/authenticate.js';
import authorizeAdmin from '../middlewares/authorizeAdmin.js';
import { parseIntParam } from '../utils/mediaUtils.js';

const router = express.Router();

/**
 * Send a friend request
 * POST /api/friends/requests
 * body: { addresseeId }
 */
router.post('/friends/requests', authenticate, async (req, res) => {
    const requester = req.user.user_id;
    const {addresseeId} = req.body;
    
    if (!addresseeId) {
        return res.status(400).json({message: "addresseeId is required"});
    }
    
    if (requester === addresseeId) {
        return res.status(400).json({message: "Cannot friend yourself"});
    }

    try {
        // Check if the target user is an admin
        const targetUser = await User.findById(addresseeId);
        if (targetUser && (targetUser.is_admin === true || targetUser.is_admin === 't' || targetUser.is_admin === 1 || targetUser.is_admin === 'true' || targetUser.is_admin === '1')) {
            return res.status(403).json({message: "Cannot send friend request to admin accounts"});
        }

        const result = await Friendship.sendFriendRequest({ requesterId: requester, addresseeId });
        
        // Small delay to ensure database trigger completes before emitting events
        setTimeout(async () => {
            try {
                await NotificationService.handleFriendRequest(requester, addresseeId);
            } catch (error) {
                console.error('Error handling friend request notification:', error);
            }
        }, 100);
        
        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(400).json({message: err.message}); // Return specific error message from model
    }
});

/**
 * List incoming friend requests
 * GET /api/friends/requests
 */
router.get('/friends/requests', authenticate, async (req, res) => {
    const me = req.user.user_id;
    try {
        const requests = await Friendship.getIncomingRequests(me);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * List sent friend requests
 * GET /api/friends/requests/sent
 */
router.get('/friends/requests/sent', authenticate, async (req, res) => {
    const me = req.user.user_id;
    try {
        const requests = await Friendship.getSentRequests(me);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * Accept or reject a friend request
 * POST /api/friends/requests/:requesterId/:action
 * action = accept|reject
 */
router.post('/friends/requests/:requesterId/:action', authenticate, async (req, res) => {
    const addressee = req.user.user_id;
    const {requesterId, action} = req.params;
    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({message: 'Invalid action'});
    }
    try {
        const result = await Friendship.updateFriendRequest({ requesterId, addresseeId: addressee, action });
        if (!result) {
            return res.status(404).json({message: 'Not found or already handled'});
        }
        
        // Delete the friend request notification from the addressee's notifications
        try {
            const deletedNotifications = await Notification.deleteByTypeAndSender(addressee, requesterId, 'friend_request');
            
            // Emit real-time notification deletion to the addressee (person who accepted/rejected)
            if (deletedNotifications.length > 0) {
                const { emitNotificationDeletionToUser, emitUnreadCountToUser } = await import('../utils/socket.js');
                
                for (const deletedNotification of deletedNotifications) {
                    emitNotificationDeletionToUser(addressee, deletedNotification.id);
                }
                
                // Emit updated unread count
                const unreadCount = await Notification.getUnreadCount(addressee);
                emitUnreadCountToUser(addressee, unreadCount);
            }
        } catch (notificationError) {
            console.error('Error deleting friend request notification:', notificationError);
            // Don't fail the request if notification deletion fails
        }
        
        // Create and emit notification for friend request acceptance
        if (action === 'accept') {
            // Small delay to ensure database trigger completes before emitting events
            setTimeout(async () => {
                try {
                    await NotificationService.handleFriendAccept(requesterId, addressee);
                } catch (error) {
                    console.error('Error handling friend accept notification:', error);
                }
            }, 100);
        }
        
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * List all friends (accepted)
 * GET /api/friends
 */
router.get('/friends', authenticate, async (req, res) => {
    const me = req.user.user_id;
    try {
        const friends = await Friendship.getFriends(me);
        res.json(friends);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * Get user profile by ID (for friends only)
 * GET /api/users/profile/:userId
 */
router.get('/users/profile/:userId', authenticate, async (req, res) => {
    const me = req.user.user_id;
    
    try {
        const targetUserId = parseIntParam(req.params.userId, 'userId');

        // Check if they are friends or if it's the same user
        const isFriend = await Friendship.getProfileWithFriendStatus({ viewerId: me, targetUserId });

        if (!isFriend && me !== targetUserId) {
            return res.status(403).json({message: 'You can only view profiles of friends'});
        }

        // Get user profile
        const user = await User.findById(targetUserId);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        // Get user's friends (only display_name and username for privacy)
        const friends = await Friendship.getFriends(targetUserId);

        // Get user's favorites
        const favorites = await Favorite.getFavorites(targetUserId);

        res.json({
            user: user,
            friends: friends,
            favorites: favorites
        });

    } catch (err) {
        console.error(err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({message: err.message});
        }
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * Search users by name/username (enhanced with friend status)
 * GET /api/users/search?q=...
 */
router.get('/users/search', authenticate, async (req, res) => {
    const me = req.user.id || req.user.user_id;
    
    if (!me) {
        console.error('No user ID found in request. User object:', req.user);
        return res.status(401).json({ 
            message: 'User not authenticated',
            userObject: req.user 
        });
    }
    
    const searchTerm = (req.query.q || '').trim();
    
    if (!searchTerm) {
        return res.json([]);
    }
    
    try {
        const searchResults = await Friendship.searchUsers({ searchTerm, currentUserId: me });
        res.json(searchResults);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({message: 'Server error during search'});
    }
});

// Debug route to check users
router.get('/users/debug', authenticate, async (req, res) => {
    try {
        const allUsers = await User.getAllUsers();
        const currentUser = await User.findById(req.user.user_id);

        res.json({
            currentUser: currentUser,
            allUsers: allUsers,
            totalUsers: allUsers.length,
            currentUserId: req.user.user_id,
            currentUserIdType: typeof req.user.user_id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

/**
 * Get friendship status between current user and another user
 * GET /api/friends/status/:userId
 */
router.get('/friends/status/:userId', authenticate, async (req, res) => {
    const currentUserId = req.user.user_id;
    
    try {
        const targetUserId = parseIntParam(req.params.userId, 'userId');
        
        if (currentUserId === targetUserId) {
            return res.json({ status: 'self' });
        }
        
        const status = await Friendship.getFriendshipStatus(currentUserId, targetUserId);
        res.json({ status });
    } catch (err) {
        console.error('Error getting friendship status:', err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * Unfriend someone
 * DELETE /api/friends/:friendId
 */
router.delete('/friends/:friendId', authenticate, async (req, res) => {
    const me = req.user.user_id;
    
    try {
        const friendId = parseIntParam(req.params.friendId, 'friendId');

        const unfriended = await Friendship.unfriend({ userId: me, friendId });

        if (!unfriended) {
            return res
                .status(404)
                .json({message: 'Friendship not found'});
        }

        return res.json({message: 'Unfriended successfully'});
    } catch (err) {
        console.error('Unfriend error:', err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({message: err.message});
        }
        return res.status(500).json({message: 'Server error'});
    }
});

/**
 * Cancel a pending friend request
 * DELETE /api/friends/requests/:addresseeId
 */
router.delete('/friends/requests/:addresseeId', authenticate, async (req, res) => {
    const requesterId = req.user.user_id;
    
    try {
        const addresseeId = parseIntParam(req.params.addresseeId, 'addresseeId');

        const canceled = await Friendship.cancelFriendRequest({ requesterId, addresseeId });
        if (!canceled) {
            return res.status(404).json({ message: 'Pending friend request not found' });
        }
        
        // Delete the corresponding friend request notification
        try {
            const deletedNotifications = await Notification.deleteByTypeAndSender(addresseeId, requesterId, 'friend_request');
            
            // Emit real-time notification deletion to the recipient
            if (deletedNotifications.length > 0) {
                const { emitNotificationDeletionToUser, emitUnreadCountToUser } = await import('../utils/socket.js');
                
                for (const deletedNotification of deletedNotifications) {
                    emitNotificationDeletionToUser(addresseeId, deletedNotification.id);
                }
                
                // Emit updated unread count
                const unreadCount = await Notification.getUnreadCount(addresseeId);
                emitUnreadCountToUser(addresseeId, unreadCount);
            }
        } catch (notificationError) {
            console.error('Error deleting friend request notification:', notificationError);
            // Don't fail the request if notification deletion fails
        }
        
        res.json({ message: 'Friend request canceled successfully' });
    } catch (err) {
        console.error('Cancel friend request error:', err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({message: err.message});
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── ADMIN‐ONLY: delete friendship (any pair) ─────────────
router.delete('/friendship/:reqId/:addId', authenticate, authorizeAdmin, async (req, res) => {
    const {reqId, addId} = req.params;
    try {
        await Friendship.deleteFriendship({ reqId, addId });
        res.json({message: 'Friendship removed'});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: 'Failed to delete friendship'});
    }
});

export default router;
