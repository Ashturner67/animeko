# Animeko Deployment Guide

## Overview
This project is configured for deployment with:
- **Frontend**: Vercel (React/Vite app)
- **Backend**: Render (Node.js/Express API)
- **Database**: Supabase (PostgreSQL)

## Prerequisites
- GitHub repository connected to both Vercel and Render
- Environment variables set in both platforms
- Supabase database with proper schema

## Environment Variables

### Backend (Render)
Set these in your Render dashboard:
```
PORT=5000
NODE_ENV=production
DB_HOST=your-supabase-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_SSL=true
JWT_SECRET=your-jwt-secret-key
CLIENT_URL=https://your-vercel-app.vercel.app
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Frontend (Vercel)
Set these in your Vercel dashboard:
```
VITE_BACKEND_URL=https://your-render-app.onrender.com/api
```

## Deployment Steps

### 1. Backend Deployment (Render)
1. Connect your GitHub repository to Render
2. Set the build command: `cd backend && npm install`
3. Set the start command: `cd backend && npm start`
4. Add all required environment variables
5. Deploy

### 2. Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables
7. Deploy

## Health Checks
- Backend health check: `GET /` and `GET /api/health`
- Frontend will be available at your Vercel URL

## Notes
- The backend automatically handles CORS for your frontend URL
- Database connections include retry logic for reliability
- Both environments are configured with proper Node.js versions
- All environment variables are template-ready

## Troubleshooting
1. Check environment variables are set correctly
2. Verify database connection from Render logs
3. Ensure frontend is pointing to correct backend URL
4. Check CORS settings if getting connection errors
