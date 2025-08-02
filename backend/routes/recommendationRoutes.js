import express from 'express';
import Recommendation from '../models/Recommendation.js';
import NotificationService from '../services/NotificationService.js';
import Anime from '../models/Anime.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

/**
 * Send or update a recommendation
 * POST /api/recommendations
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { receiverId, animeId, message } = req.body;
        const senderId = req.user.user_id;

        // Validate required fields
        if (!receiverId || !animeId) {
            return res.status(400).json({ 
                error: 'receiverId and animeId are required' 
            });
        }

        // Check if sender is trying to recommend to themselves
        if (senderId === receiverId) {
            return res.status(400).json({ 
                error: 'Cannot recommend anime to yourself' 
            });
        }

        // Check if users are friends
        const areFriends = await Recommendation.areUsersFriends(senderId, receiverId);
        if (!areFriends) {
            return res.status(403).json({ 
                error: 'You can only recommend anime to friends' 
            });
        }

        // Send/update recommendation
        const recommendation = await Recommendation.sendRecommendation(
            senderId, 
            receiverId, 
            animeId, 
            message
        );

        // Get anime title for the notification
        const anime = await Anime.getById(animeId);
        const animeTitle = anime ? anime.title : 'Unknown Anime';

        // Small delay to ensure database trigger completes before emitting events
        setTimeout(async () => {
            try {
                await NotificationService.handleAnimeRecommendation(
                    senderId,
                    receiverId,
                    animeId,
                    animeTitle
                );
            } catch (error) {
                console.error('Error handling anime recommendation notification:', error);
            }
        }, 100);

        res.status(201).json({
            message: 'Recommendation sent successfully',
            recommendation
        });
    } catch (error) {
        console.error('Error sending recommendation:', error);
        next(error);
    }
});

/**
 * Get sent recommendations
 * GET /api/recommendations/sent
 */
router.get('/sent', authenticate, async (req, res, next) => {
    try {
        const senderId = req.user.user_id;
        const recommendations = await Recommendation.getSentRecommendations(senderId);
        
        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching sent recommendations:', error);
        next(error);
    }
});

/**
 * Get received recommendations (non-dismissed)
 * GET /api/recommendations/received
 */
router.get('/received', authenticate, async (req, res, next) => {
    try {
        const receiverId = req.user.user_id;
        const { limit } = req.query;
        
        const recommendations = await Recommendation.getReceivedRecommendations(receiverId, limit);
        
        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching received recommendations:', error);
        next(error);
    }
});

/**
 * Dismiss a recommendation
 * PUT /api/recommendations/:id/dismiss
 */
router.put('/:id/dismiss', authenticate, async (req, res, next) => {
    try {
        const recommendationId = parseInt(req.params.id);
        const userId = req.user.user_id;

        if (isNaN(recommendationId)) {
            return res.status(400).json({ 
                error: 'Invalid recommendation ID' 
            });
        }

        // Verify the recommendation exists and belongs to the user
        const existingRecommendation = await Recommendation.getRecommendationById(recommendationId);
        if (!existingRecommendation) {
            return res.status(404).json({ 
                error: 'Recommendation not found' 
            });
        }

        if (existingRecommendation.receiver_id !== userId) {
            return res.status(403).json({ 
                error: 'You can only dismiss your own recommendations' 
            });
        }

        const dismissedRecommendation = await Recommendation.dismissRecommendation(recommendationId, userId);
        
        if (!dismissedRecommendation) {
            return res.status(404).json({ 
                error: 'Recommendation not found or already dismissed' 
            });
        }

        res.json({
            message: 'Recommendation dismissed successfully',
            recommendation: dismissedRecommendation
        });
    } catch (error) {
        console.error('Error dismissing recommendation:', error);
        next(error);
    }
});

export default router;
