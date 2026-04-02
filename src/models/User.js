const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    // Get all users
    static async getAll(filters = {}) {
        let query = 'SELECT id, username, email, full_name, phone, role, is_active, last_login, created_at FROM users WHERE 1=1';
        const values = [];
        let paramCount = 1;
        
        if (filters.role) {
            query += ` AND role = $${paramCount}`;
            values.push(filters.role);
            paramCount++;
        }
        
        if (filters.is_active !== undefined) {
            query += ` AND is_active = $${paramCount}`;
            values.push(filters.is_active);
            paramCount++;
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, values);
        return result.rows;
    }
    
    // Get user by ID
    static async getById(id) {
        const result = await pool.query(
            `SELECT id, username, email, full_name, phone, role, is_active, last_login, created_at 
             FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }
    
    // Get user by username
    static async getByUsername(username) {
        const result = await pool.query(
            `SELECT * FROM users WHERE username = $1`,
            [username]
        );
        return result.rows[0] || null;
    }
    
    // Get user by email
    static async getByEmail(email) {
        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );
        return result.rows[0] || null;
    }
    
    // Create new user
    static async create(data) {
        const { username, email, password, full_name, phone, role = 'client' } = data;
        
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, full_name, phone, role)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [username, email, password_hash, full_name, phone, role]
        );
        
        return await this.getById(result.rows[0].id);
    }
    
    // Update user
    static async update(id, data) {
        const { full_name, phone, role, is_active } = data;
        
        await pool.query(
            `UPDATE users 
             SET full_name = $1, phone = $2, role = $3, is_active = $4
             WHERE id = $5`,
            [full_name, phone, role, is_active, id]
        );
        
        return await this.getById(id);
    }
    
    // Update password
    static async updatePassword(id, newPassword) {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);
        
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [password_hash, id]
        );
        
        return true;
    }
    
    // Update last login
    static async updateLastLogin(id) {
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    }
    
    // Delete user (soft delete)
    static async delete(id) {
        await pool.query(
            'UPDATE users SET is_active = false WHERE id = $1',
            [id]
        );
        return true;
    }
    
    // Verify password
    static async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }
    
    // Change password
    static async changePassword(id, oldPassword, newPassword) {
        const user = await this.getById(id);
        if (!user) throw new Error('User not found');
        
        // Get full user with password hash
        const fullUser = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        
        const isValid = await bcrypt.compare(oldPassword, fullUser.rows[0].password_hash);
        if (!isValid) throw new Error('Current password is incorrect');
        
        return await this.updatePassword(id, newPassword);
    }
    
    // Get statistics
    static async getStatistics() {
        const totalResult = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE is_active = true'
        );
        
        const byRoleResult = await pool.query(
            'SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role'
        );
        
        return {
            total: parseInt(totalResult.rows[0].total),
            byRole: byRoleResult.rows
        };
    }
}

module.exports = User;
