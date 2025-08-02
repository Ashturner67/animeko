import pool from '../db.js';

class Notification {
    static async findByUserId(userId, limit = 20, offset = 0) {
        const query = `
            SELECT n.*, 
                   u.username as sender_username, 
                   u.display_name as sender_display_name,
                   CASE 
                       WHEN n.type = 'anime_recommend' THEN a.title 
                       ELSE NULL 
                   END as anime_title
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.user_id
            LEFT JOIN anime a ON n.type = 'anime_recommend' AND n.related_id = a.anime_id
            WHERE n.recipient_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        try {
            const result = await pool.query(query, [userId, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    static async getUnreadCount(userId) {
        const query = 'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = false';
        
        try {
            const result = await pool.query(query, [userId]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId, userId) {
        const query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE id = $1 AND recipient_id = $2
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [notificationId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    static async markAllAsRead(userId) {
        const query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE recipient_id = $1 AND is_read = false
        `;
        
        try {
            const result = await pool.query(query, [userId]);
            return result.rowCount; // This returns the number of rows affected
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    static async delete(notificationId, userId) {
        const query = 'DELETE FROM notifications WHERE id = $1 AND recipient_id = $2 RETURNING *';
        
        try {
            const result = await pool.query(query, [notificationId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    static async deleteAll(userId) {
        const query = 'DELETE FROM notifications WHERE recipient_id = $1';
        
        try {
            const result = await pool.query(query, [userId]);
            return result.rowCount;
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            throw error;
        }
    }

    static async create(recipientId, senderId, type, relatedId, message) {
        const query = `
            INSERT INTO notifications (recipient_id, sender_id, type, related_id, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [recipientId, senderId, type, relatedId, message]);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    static async deleteByTypeAndSender(recipientId, senderId, type) {
        const query = `
            DELETE FROM notifications 
            WHERE recipient_id = $1 AND sender_id = $2 AND type = $3
            RETURNING *
        `;
        
        try {
            const result = await pool.query(query, [recipientId, senderId, type]);
            return result.rows;
        } catch (error) {
            console.error('Error deleting notifications by type and sender:', error);
            throw error;
        }
    }

    static async findSimilar(recipientId, senderId, type, relatedId) {
        const query = `
            SELECT * FROM notifications 
            WHERE recipient_id = $1 AND sender_id = $2 AND type = $3 AND related_id = $4
            ORDER BY created_at DESC
            LIMIT 1
        `;
        
        try {
            const result = await pool.query(query, [recipientId, senderId, type, relatedId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding similar notification:', error);
            throw error;
        }
    }
}

export default Notification;
