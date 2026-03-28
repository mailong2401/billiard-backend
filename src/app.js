const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const SocketHandler = require('./socket/socketHandler');

class App {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocket();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date(),
                service: 'Billiard Management System'
            });
        });
        
        this.app.get('/api/tables/statistics', async (req, res) => {
            const Table = require('./models/Table');
            const stats = await Table.getStatistics();
            res.json(stats);
        });
    }
    
    setupSocket() {
        const socketHandler = new SocketHandler(this.io);
        socketHandler.initialize();
    }
    
    async start() {
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Cannot start server without database connection');
            process.exit(1);
        }
        
        const PORT = process.env.PORT || 3000;
        this.server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 WebSocket ready for connections`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        });
    }
}

module.exports = App;
