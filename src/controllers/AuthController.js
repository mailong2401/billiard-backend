const AuthService = require('../services/authService');
const User = require('../models/User');

class AuthController {
    constructor(io) {
        this.io = io;
        this.authService = new AuthService();
    }
    
    // Login
    async handleLogin(socket, data, callback) {
        try {
            const { username, password } = data;
            
            if (!username || !password) {
                throw new Error('Username and password are required');
            }
            
            const result = await this.authService.login(username, password);
            
            callback({
                success: true,
                data: result,
                message: 'Login successful'
            });
            
        } catch (error) {
            console.error('Error in handleLogin:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Register
    async handleRegister(socket, data, callback) {
        try {
            const { username, email, password, full_name, phone } = data;
            
            if (!username || !email || !password || !full_name) {
                throw new Error('Missing required fields');
            }
            
            const result = await this.authService.register({
                username,
                email,
                password,
                full_name,
                phone,
                role: 'client'
            });
            
            callback({
                success: true,
                data: result,
                message: 'Registration successful'
            });
            
        } catch (error) {
            console.error('Error in handleRegister:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get current user from token
    async handleGetCurrentUser(socket, data, callback) {
        try {
            const { token } = data;
            
            if (!token) {
                throw new Error('Token required');
            }
            
            const user = await this.authService.getCurrentUserByToken(token);
            
            callback({
                success: true,
                data: user
            });
            
        } catch (error) {
            console.error('Error in handleGetCurrentUser:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get all users (admin only)
    async handleGetUsers(socket, data, callback) {
        try {
            const users = await User.getAll(data.filters || {});
            
            callback({
                success: true,
                data: users
            });
            
        } catch (error) {
            console.error('Error in handleGetUsers:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update user (admin only)
    async handleUpdateUser(socket, data, callback) {
        try {
            const { id, ...updateData } = data;
            
            const user = await User.update(id, updateData);
            
            callback({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
            
        } catch (error) {
            console.error('Error in handleUpdateUser:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Change password
    async handleChangePassword(socket, data, callback) {
        try {
            const { userId, oldPassword, newPassword } = data;
            
            await User.changePassword(userId, oldPassword, newPassword);
            
            callback({
                success: true,
                message: 'Password changed successfully'
            });
            
        } catch (error) {
            console.error('Error in handleChangePassword:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get user statistics (admin only)
    async handleGetUserStatistics(socket, data, callback) {
        try {
            const stats = await User.getStatistics();
            
            callback({
                success: true,
                data: stats
            });
            
        } catch (error) {
            console.error('Error in handleGetUserStatistics:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = AuthController;
