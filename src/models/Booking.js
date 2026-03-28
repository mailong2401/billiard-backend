const { pool } = require('../config/database');
const { BOOKING_STATUS } = require('../utils/constants');
const moment = require('moment');

class Booking {
    // Generate booking code
    static generateBookingCode() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `BK${year}${month}${day}${random}`;
    }
    
    // Get all bookings
    static async getAll(filters = {}) {
        let query = `
            SELECT b.*, t.table_number, t.table_name, t.table_type 
            FROM bookings b 
            LEFT JOIN tables t ON b.table_id = t.id 
            WHERE 1=1
        `;
        const values = [];
        
        if (filters.status) {
            query += ' AND b.status = ?';
            values.push(filters.status);
        }
        
        if (filters.table_id) {
            query += ' AND b.table_id = ?';
            values.push(filters.table_id);
        }
        
        if (filters.date) {
            query += ' AND DATE(b.start_time) = ?';
            values.push(filters.date);
        }
        
        if (filters.customer_phone) {
            query += ' AND b.customer_phone LIKE ?';
            values.push(`%${filters.customer_phone}%`);
        }
        
        query += ' ORDER BY b.start_time DESC';
        
        const [rows] = await pool.execute(query, values);
        return rows;
    }
    
    // Get booking by ID
    static async getById(id) {
        const [rows] = await pool.execute(
            `SELECT b.*, t.table_number, t.table_name, t.table_type, t.price_per_hour 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE b.id = ?`,
            [id]
        );
        return rows[0] || null;
    }
    
    // Get booking by code
    static async getByCode(bookingCode) {
        const [rows] = await pool.execute(
            `SELECT b.*, t.table_number, t.table_name, t.table_type 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE b.booking_code = ?`,
            [bookingCode]
        );
        return rows[0] || null;
    }
    
    // Create new booking
    static async create(data) {
        const {
            table_id,
            customer_name,
            customer_phone,
            start_time,
            end_time,
            duration_hours,
            total_amount,
            notes = null,
            created_by = 'system'
        } = data;
        
        const bookingCode = this.generateBookingCode();
        
        const [result] = await pool.execute(
            `INSERT INTO bookings (booking_code, table_id, customer_name, customer_phone, 
                                   start_time, end_time, duration_hours, total_amount, notes, created_by, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bookingCode, table_id, customer_name, customer_phone, start_time, end_time, 
             duration_hours, total_amount, notes, created_by, BOOKING_STATUS.PENDING]
        );
        
        return this.getById(result.insertId);
    }
    
    // Update booking
    static async update(id, data) {
        const updates = [];
        const values = [];
        
        const allowedFields = ['customer_name', 'customer_phone', 'start_time', 'end_time', 
                               'duration_hours', 'total_amount', 'notes', 'status'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (updates.length === 0) return null;
        
        values.push(id);
        await pool.execute(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        
        return this.getById(id);
    }
    
    // Update booking status
    static async updateStatus(id, status) {
        await pool.execute(
            'UPDATE bookings SET status = ? WHERE id = ?',
            [status, id]
        );
        return this.getById(id);
    }
    
    // Cancel booking
    static async cancel(id, reason = null) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        await pool.execute(
            'UPDATE bookings SET status = ?, notes = CONCAT(notes, ?) WHERE id = ?',
            [BOOKING_STATUS.CANCELLED, reason ? `\nHủy vì: ${reason}` : '', id]
        );
        
        return this.getById(id);
    }
    
    // Check-in
    static async checkIn(id) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        await pool.execute(
            'UPDATE bookings SET status = ? WHERE id = ?',
            [BOOKING_STATUS.CHECKED_IN, id]
        );
        
        // Update table status
        const Table = require('./Table');
        await Table.updateStatus(booking.table_id, 'occupied');
        
        return this.getById(id);
    }
    
    // Check-out
    static async checkOut(id, actualEndTime, actualAmount) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        await pool.execute(
            `UPDATE bookings SET status = ?, end_time = ?, total_amount = ? WHERE id = ?`,
            [BOOKING_STATUS.COMPLETED, actualEndTime, actualAmount, id]
        );
        
        // Update table status back to available
        const Table = require('./Table');
        await Table.updateStatus(booking.table_id, 'available');
        
        return this.getById(id);
    }
    
    // Get bookings by date
    static async getByDate(date) {
        const [rows] = await pool.execute(
            `SELECT b.*, t.table_number, t.table_name 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE DATE(b.start_time) = ? 
             ORDER BY b.start_time`,
            [date]
        );
        return rows;
    }
    
    // Get revenue by date range
    static async getRevenue(startDate, endDate) {
        const [rows] = await pool.execute(
            `SELECT DATE(start_time) as date, 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue
             FROM bookings 
             WHERE status = 'completed' 
             AND DATE(start_time) BETWEEN ? AND ?
             GROUP BY DATE(start_time)
             ORDER BY date`,
            [startDate, endDate]
        );
        return rows;
    }
    
    // Check table availability for time slot
    static async checkAvailability(tableId, startTime, endTime) {
        const [rows] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE table_id = ? 
             AND status IN ('confirmed', 'checked_in')
             AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
             )`,
            [tableId, startTime, startTime, endTime, endTime, startTime, endTime]
        );
        
        return rows.length === 0;
    }
}

module.exports = Booking;
