const AuthService = require('../services/authService');

const authService = new AuthService();

function authenticate(socket, next) {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication required'));
    }
    
    const decoded = authService.verifyToken(token);
    if (!decoded) {
        return next(new Error('Invalid token'));
    }
    
    socket.user = decoded;
    next();
}

function requireAdmin(socket, next) {
    if (socket.user?.role !== 'admin') {
        return next(new Error('Admin access required'));
    }
    next();
}

module.exports = { authenticate, requireAdmin };
