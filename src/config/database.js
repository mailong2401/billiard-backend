const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // QUAN TRỌNG: Render yêu cầu SSL
    ssl: {
        rejectUnauthorized: false  // Bắt buộc cho Render
    },
    // Thêm keepalive để tránh timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// Thêm error handler
pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Test connection
const testConnection = async () => {
    let client;
    try {
        console.log('🔌 Connecting to Render PostgreSQL...');
        client = await pool.connect();
        
        // Test query
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        
        console.log('✅ PostgreSQL connected successfully');
        console.log(`   📍 Host: ${process.env.DB_HOST}`);
        console.log(`   📅 Time: ${result.rows[0].current_time}`);
        console.log(`   🐘 Version: ${result.rows[0].pg_version.split(',')[0]}`);
        
        client.release();
        return true;
    } catch (error) {
        if (client) client.release();
        console.error('❌ PostgreSQL connection failed:', error.message);
        
        // Debug info
        console.log('\n📋 Connection config:');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        console.log(`   User: ${process.env.DB_USER}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log(`   SSL enabled: true`);
        
        return false;
    }
};

module.exports = { pool, testConnection };
