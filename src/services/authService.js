const User = require('../models/User');
const jwt = require('jsonwebtoken');

class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
        this.JWT_EXPIRES_IN = '7d';
    }
    
    // Generate JWT token
    generateToken(user) {
        return jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role 
            },
            this.JWT_SECRET,
            { expiresIn: this.JWT_EXPIRES_IN }
        );
    }
    
    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    // Login
    async login(username, password) {
        const user = await User.getByUsername(username);
        if (!user) {
            throw new Error('Invalid username or password');
        }
        
        const isValid = await User.verifyPassword(user, password);
        if (!isValid) {
            throw new Error('Invalid username or password');
        }
        
        if (!user.is_active) {
            throw new Error('Account is disabled');
        }
        
        // Update last login
        await User.updateLastLogin(user.id);
        
        // Generate token
        const token = this.generateToken(user);
        
        // Return user info without password
        const { password_hash, ...userInfo } = user;
        
        return {
            user: userInfo,
            token
        };
    }
    
    // Register
    async register(data) {
        // Check if username exists
        const existingUser = await User.getByUsername(data.username);
        if (existingUser) {
            throw new Error('Username already exists');
        }
        
        // Check if email exists
        const existingEmail = await User.getByEmail(data.email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }
        
        // Create user
        const user = await User.create(data);
        
        // Generate token
        const token = this.generateToken(user);
        
        return {
            user,
            token
        };
    }
    
    // Get current user
    async getCurrentUser(userId) {
        const user = await User.getById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.is_active) {
            throw new Error('Account is disabled');
        }
        
        return user;
    }
}

module.exports = AuthService;
