import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {dirname} from 'path';
import {fileURLToPath} from 'url';
import { createServer } from 'http';
import pool, { testConnection } from './db.js'; // import shared pool and test function
// import middlewares
import authenticate from './middlewares/authenticate.js';
import { attachVisibilityHelpers } from './middlewares/visibilityCheck.js';
import { attachDatabaseHelpers, handleDatabaseErrors } from './middlewares/databaseMiddleware.js';
import { initializeSocket } from './utils/socket.js';

// import routes
import authRoutes from './routes/authRoutes.js';
import animeRoutes from './routes/animeRoutes.js';
import genreRoutes from './routes/genreRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import listRoutes from './routes/listRoutes.js';
import characterRoutes from "./routes/characterRoutes.js";
import VARoutes from "./routes/VARoutes.js";
import userRoutes from './routes/userRoutes.js';

import animeLibraryRoutes from "./routes/animeLibraryRoutes.js";
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import premiumRoutes from './routes/premiumRoutes.js';
import episodeRoutes from './routes/episodeRoutes.js';
import watchProgressRoutes from './routes/watchProgressRoutes.js';
import subscriptionExpiryJob from './cron/subscriptionExpiryJob.js';
import notificationCleanupJob from './cron/notificationCleanupJob.js';
import searchRoutes from './routes/searchRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import reviewReactionRoutes from './routes/reviewReactionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
// Enable CORS for requests from your frontend
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Handle preflight requests
//app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Attach database helpers to all requests
app.use(attachDatabaseHelpers);

// Attach visibility helpers to all requests
app.use(attachVisibilityHelpers);

// Register search route after middleware
app.use('/api/search', searchRoutes);

app.use('/api/auth', authRoutes);
app.use('/api', animeRoutes);
app.use('/api', genreRoutes);
app.use('/api', companyRoutes);
app.use('/api', friendRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api', reviewRoutes);
app.use('/api/reviews', reviewReactionRoutes);
app.use('/api/lists', listRoutes);
app.use('/api', characterRoutes);
app.use('/api', VARoutes);
app.use('/api/users', userRoutes);
app.use('/api/anime-library', animeLibraryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', premiumRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/watch', watchProgressRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);

// Root health check for deployment platforms
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Animeko Backend API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Enhanced database connection with retry logic
const connectToDatabase = async () => {
    try {
        const isConnected = await testConnection();
        if (isConnected) {
            console.log('Connected to PostgreSQL database');
        } else {
            throw new Error('Connection test failed');
        }
    } catch (err) {
        console.error('Database connection error:', err.message);
        // Retry connection after 5 seconds
        console.log('Retrying database connection in 5 seconds...');
        setTimeout(connectToDatabase, 5000);
    }
};

// Health check endpoint for database
app.get('/api/health', async (req, res) => {
    try {
        const isConnected = await testConnection();
        res.status(200).json({ 
            status: isConnected ? 'healthy' : 'unhealthy',
            database: isConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({ 
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Periodic connection health check (reduced frequency)
setInterval(async () => {
    try {
        await testConnection();
    } catch (err) {
        console.log('Periodic health check failed, attempting reconnection...');
        connectToDatabase();
    }
}, 300000); // Check every 5 minutes instead of 1 minute

// Remove the duplicate pool event handlers since they're now in db.js

// Initial connection
connectToDatabase();

// Database error handling middleware (must come before general error handler)
app.use(handleDatabaseErrors);

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Server error:', err);
    return res.status(500).json({
        error: 'An unexpected error occurred', message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Register error handler
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    subscriptionExpiryJob.start();
    notificationCleanupJob.start();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    
    try {
        // Close database pool
        await pool.end();
        console.log('Database pool closed');
        
        // Close server
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    try {
        await pool.end();
        server.close(() => {
            process.exit(0);
        });
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});