import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true,
        },
        // More stable configuration for small-scale usage
        pingTimeout: 120000, // 2 minutes - more lenient for idle users
        pingInterval: 60000, // 1 minute ping interval
        connectTimeout: 45000, // 45 seconds to establish connection
        transports: ['websocket', 'polling'] // Fallback to polling if websocket fails
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            console.error('Socket authentication error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        // Reduce verbose logging - only log if needed for debugging
        // console.log(`User ${socket.userId} connected`);
        
        // Join user to their personal room for targeted notifications
        socket.join(`user_${socket.userId}`);
        
        socket.on('disconnect', (reason) => {
            // Only log disconnections that aren't normal client behavior
            if (reason !== 'client namespace disconnect' && reason !== 'transport close') {
                console.log(`User ${socket.userId} disconnected. Reason: ${reason}`);
            }
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Helper function to emit notification to a specific user
export const emitNotificationToUser = (userId, notification) => {
    if (io) {
        io.to(`user_${userId}`).emit('newNotification', notification);
    }
};

// Helper function to emit unread count update to a specific user
export const emitUnreadCountToUser = (userId, count) => {
    if (io) {
        io.to(`user_${userId}`).emit('unreadCountUpdate', { count });
    }
};

// Helper function to emit notification deletion to a specific user
export const emitNotificationDeletionToUser = (userId, notificationId) => {
    if (io) {
        io.to(`user_${userId}`).emit('notificationDeleted', { notificationId });
    }
};
