import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const {Pool} = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env only once
dotenv.config({path: path.resolve(__dirname, '.env')});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

// Enhanced error handling for the pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err.message);
    // Don't exit the process, just log the error
});

pool.on('connect', (client) => {
    // Only log the first few connections or important events
    // Remove verbose logging for normal connection pooling
});

pool.on('remove', (client) => {
    // Reduced logging for remove events
});

// Simple query wrapper - let the database handle retries
export const query = async (text, params) => {
    return await pool.query(text, params);
};

// Enhanced connection test function
export const testConnection = async () => {
    try {
        const result = await query('SELECT NOW() as current_time');
        // Only log on initial connection, not on periodic checks
        return true;
    } catch (err) {
        console.error('Database connection test failed:', err.message);
        return false;
    }
};

export default pool;