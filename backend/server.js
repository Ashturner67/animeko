import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {dirname} from 'path';
import {fileURLToPath} from 'url';
import pool from './db.js'; // import shared pool
// import middlewares
import authenticate from './middlewares/authenticate.js';
import { attachVisibilityHelpers } from './middlewares/visibilityCheck.js';

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
import searchRoutes from './routes/searchRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import reviewReactionRoutes from './routes/reviewReactionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS for requests from your frontend

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://localhost:5173',
            process.env.CORS_ORIGIN
        ].filter(Boolean); // Remove any undefined values
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));

// Register search route
app.use('/api/search', searchRoutes);

// Handle preflight requests
//app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Attach visibility helpers to all requests
app.use(attachVisibilityHelpers);

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

// Test database connection
    pool.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Database connection error:', err));

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    subscriptionExpiryJob.start();
});