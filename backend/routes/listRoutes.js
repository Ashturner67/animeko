import express from 'express';
import List from '../models/List.js'; // Import the List model
import authenticate from '../middlewares/authenticate.js';
import { attachVisibilityHelpers, canAccessList, sanitizeListData } from '../middlewares/visibilityCheck.js';
import { parseIntParam } from '../utils/mediaUtils.js';

const router = express.Router();

// Optional authentication middleware to get user context for visibility
const optionalAuth = (req, res, next) => {
  // Try to authenticate but don't fail if no token
  const authHeader = req.headers.authorization;
  if (authHeader) {
    authenticate(req, res, (err) => {
      // Continue regardless of authentication success/failure
      next();
    });
  } else {
    next();
  }
};

// ──────────────────────────────────────────────────
// 1) GET /api/lists            (fetch current user's lists)
// ──────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const lists = await List.getListsByUserId(userId);
        res.json(lists);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch lists'});
    }
});

// ──────────────────────────────────────────────────
// 2) GET /api/lists/all        (get all public lists with owner info and item counts)
// ──────────────────────────────────────────────────
router.get('/all', optionalAuth, async (req, res) => {
    try {
        const currentUserId = req.user?.user_id || null;
        const lists = await List.getAllPublicLists(currentUserId);
        res.json(lists);
    } catch (err) {
        console.error('[GET /lists/all] Error:', err);
        res.status(500).json({error: 'Failed to fetch lists: ' + err.message});
    }
});

// ──────────────────────────────────────────────────
// 3) GET /api/lists/search/:keyword   (search lists by keyword)
// ──────────────────────────────────────────────────
router.get('/search/:keyword', optionalAuth, async (req, res) => {
    try {
        const keyword = req.params.keyword;
        const currentUserId = req.user?.user_id || null;
        const lists = await List.searchLists(keyword, currentUserId);
        res.json(lists);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({error: 'Search failed: ' + err.message});
    }
});

// ──────────────────────────────────────────────────
// 4) POST /api/lists             (create a new list)
// ──────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, animeEntries = [] } = req.body;
        const userId = req.user.user_id;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'List title is required' });
        }

        const newList = await List.createList({ 
            userId, 
            title: title.trim(), 
            animeEntries 
        });

        res.status(201).json(newList);
        
    } catch (err) {
        console.error('[POST /lists] Error:', err);
        res.status(500).json({ error: 'Failed to create list: ' + err.message });
    }
});

// ──────────────────────────────────────────────────
// 5) GET /api/lists/:id          (get a specific list by ID with its items)
// ──────────────────────────────────────────────────
router.get('/:id', optionalAuth, attachVisibilityHelpers, async (req, res) => {
    try {
        const listId = parseIntParam(req.params.id, 'listId');
        const currentUserId = req.user?.user_id || null;

        const list = await List.getListById(listId);
        
        if (!list) {
            return res.status(404).json({error: 'List not found'});
        }
        
        // Check if current user can access this list
        const canAccess = await canAccessList(list.user_id, currentUserId, list.visibility_level);
        
        if (!canAccess) {
            return res.status(403).json({error: 'Access denied. This list is private.'});
        }
        
        // Sanitize list data based on visibility
        const isOwner = currentUserId === list.user_id;
        const sanitizedList = sanitizeListData(list, canAccess, isOwner);
        
        res.json(sanitizedList);
        
    } catch (err) {
        console.error('[GET /lists/:id] Error:', err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({error: err.message});
        }
        res.status(500).json({error: 'Failed to fetch list: ' + err.message});
    }
});

// ──────────────────────────────────────────────────
// 6) PATCH /api/lists/:id/metadata (update list title and visibility only)
// ──────────────────────────────────────────────────
router.patch('/:id/metadata', authenticate, async (req, res) => {
    try {
        const listId = parseIntParam(req.params.id, 'listId');
        const { title, visibility_level } = req.body;
        const userId = req.user.user_id;

        // Only update metadata, don't touch anime entries
        const updatedList = await List.updateListMetadata(listId, userId, { title, visibility_level });
        
        res.json(updatedList);
        
    } catch (err) {
        console.error('[PATCH /lists/:id/metadata] Error:', err);
        let statusCode = 500;
        if (err.message && err.message.includes('Invalid')) {
            statusCode = 400;
        } else if (err.message.includes('not found')) {
            statusCode = 404;
        } else if (err.message.includes('permission')) {
            statusCode = 403;
        } else if (err.message.includes('title is required')) {
            statusCode = 400;
        }
        res.status(statusCode).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────────
// 7) PUT /api/lists/:id           (update a list with items)
// ──────────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
    try {
        const listId = parseIntParam(req.params.id, 'listId');
        const { title, visibility_level, animeEntries = [] } = req.body;
        const userId = req.user.user_id;

        const updatedList = await List.updateList(listId, userId, { title, visibility_level, animeEntries });
        
        res.json(updatedList);
        
    } catch (err) {
        console.error('[PUT /lists/:id] Error:', err);
        let statusCode = 500;
        if (err.message && err.message.includes('Invalid')) {
            statusCode = 400;
        } else if (err.message.includes('not found')) {
            statusCode = 404;
        } else if (err.message.includes('permission')) {
            statusCode = 403;
        } else if (err.message.includes('title is required')) {
            statusCode = 400;
        }
        res.status(statusCode).json({error: err.message});
    }
});

// ──────────────────────────────────────────────────
// 8) GET /api/lists/anime/:animeId   (get lists containing an anime)
// ──────────────────────────────────────────────────
router.get('/anime/:animeId', optionalAuth, async (req, res) => {
    const { animeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const currentUserId = req.user?.user_id || null;

    try {
        const result = await List.getPaginatedListsByAnimeId(animeId, page, limit, currentUserId);

        res.json(result);
    } catch (err) {
        console.error('Error fetching anime lists:', err);
        res.status(500).json({ error: 'Failed to fetch lists containing this anime' });
    }
});

// ──────────────────────────────────────────────────
// 9) DELETE /api/lists/:id        (delete a list)
// ──────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const listId = parseIntParam(req.params.id, 'listId');
        const userId = req.user.user_id;

        await List.deleteList(listId, userId);

        res.status(204).send();
        
    } catch (err) {
        console.error('[DELETE /lists/:id] Error:', err);
        let statusCode = 500;
        if (err.message && err.message.includes('Invalid')) {
            statusCode = 400;
        } else if (err.message.includes('not found')) {
            statusCode = 404;
        } else if (err.message.includes('permission')) {
            statusCode = 403;
        }
        res.status(statusCode).json({error: err.message});
    }
});

// ──────────────────────────────────────────────────
// 10) GET /api/lists/:id/items  (get just the items for a list) - UPDATED WITH MEDIA
// ──────────────────────────────────────────────────
router.get('/:id/items', authenticate, async (req, res) => {
    try {
        const listId = parseIntParam(req.params.id, 'listId');

        // Check if list exists (handled by model)
        const listExists = await List.getListById(listId);
        if (!listExists) {
            return res.status(404).json({ error: 'List not found' });
        }

        const items = await List.getListItems(listId);

        res.json(items);
    } catch (err) {
        console.error('[GET /lists/:id/items] Error:', err);
        if (err.message && err.message.includes('Invalid')) {
            return res.status(400).json({error: err.message});
        }
        res.status(500).json({ error: 'Failed to fetch list items' });
    }
});

export default router;
