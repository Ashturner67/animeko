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
import subscriptionExpiryJob from './cron/subscriptionExpiryJob.js';
import searchRoutes from './routes/searchRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS for requests from your frontend

const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
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
app.use('/api/lists', listRoutes);
app.use('/api', characterRoutes);
app.use('/api', VARoutes);
app.use('/api/users', userRoutes);
app.use('/api/anime-library', animeLibraryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', premiumRoutes);
app.use('/api/episodes', episodeRoutes);

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
    console.log(`Server running on http://localhost:${PORT}`);
    subscriptionExpiryJob.start();
});