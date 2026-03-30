const { pool } = require('../config/database');
const { BOOKING_STATUS } = require('../utils/constants');
const moment = require('moment-timezone');

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
        
        // Lấy thêm items cho mỗi booking
        for (let booking of rows) {
            const items = await this.getBookingItems(booking.id);
            booking.items = items;
            booking.food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            booking.total_with_food = Number(booking.total_amount) + booking.food_total;
        }
        
        return rows;
    }
    
    // Get booking items
    static async getBookingItems(bookingId) {
        const [rows] = await pool.execute(
            `SELECT bi.*, p.name as product_name, p.price as product_price
             FROM booking_items bi
             LEFT JOIN products p ON bi.product_id = p.id
             WHERE bi.booking_id = ?
             ORDER BY bi.created_at ASC`,
            [bookingId]
        );
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
        
        if (rows[0]) {
            const items = await this.getBookingItems(id);
            rows[0].items = items;
            rows[0].food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            rows[0].total_with_food = Number(rows[0].total_amount) + rows[0].food_total;
        }
        
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
        
        if (rows[0]) {
            const items = await this.getBookingItems(rows[0].id);
            rows[0].items = items;
            rows[0].food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            rows[0].total_with_food = Number(rows[0].total_amount) + rows[0].food_total;
        }
        
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
    
    // Add item to booking
    static async addBookingItem(bookingId, productId, quantity, notes = null) {
        // Get product price
        const [product] = await pool.execute(
            'SELECT price, name FROM products WHERE id = ?',
            [productId]
        );
        
        if (!product[0]) {
            throw new Error('Product not found');
        }
        
        const price = product[0].price;
        const subtotal = price * quantity;
        
        const [result] = await pool.execute(
            `INSERT INTO booking_items (booking_id, product_id, quantity, price, subtotal, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [bookingId, productId, quantity, price, subtotal, notes]
        );
        
        return this.getBookingItemById(result.insertId);
    }
    
    // Update booking item
    static async updateBookingItem(itemId, quantity) {
        const [item] = await pool.execute(
            'SELECT * FROM booking_items WHERE id = ?',
            [itemId]
        );
        
        if (!item[0]) {
            throw new Error('Item not found');
        }
        
        const subtotal = item[0].price * quantity;
        
        await pool.execute(
            'UPDATE booking_items SET quantity = ?, subtotal = ? WHERE id = ?',
            [quantity, subtotal, itemId]
        );
        
        return this.getBookingItemById(itemId);
    }
    
    // Remove booking item
    static async removeBookingItem(itemId) {
        await pool.execute(
            'DELETE FROM booking_items WHERE id = ?',
            [itemId]
        );
        return true;
    }
    
    // Get booking item by ID
    static async getBookingItemById(itemId) {
        const [rows] = await pool.execute(
            `SELECT bi.*, p.name as product_name
             FROM booking_items bi
             LEFT JOIN products p ON bi.product_id = p.id
             WHERE bi.id = ?`,
            [itemId]
        );
        return rows[0] || null;
    }
    
    // Update booking item status (for kitchen)
    static async updateBookingItemStatus(itemId, status) {
        await pool.execute(
            'UPDATE booking_items SET status = ? WHERE id = ?',
            [status, itemId]
        );
        return this.getBookingItemById(itemId);
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
        
        const actualStartTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
        
        await pool.execute(
            'UPDATE bookings SET status = ?, start_time = ? WHERE id = ?',
            [BOOKING_STATUS.CHECKED_IN, actualStartTime, id]
        );
        
        const Table = require('./Table');
        await Table.updateStatus(booking.table_id, 'occupied');
        
        return this.getById(id);
    }
    
    // Check-out - Tính tổng tiền bàn + đồ ăn
    static async checkOut(id, actualEndTime) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        // Tính tổng tiền đồ ăn
        const items = await this.getBookingItems(id);
        const foodTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        const totalAmount = Number(booking.total_amount) + foodTotal;
        
        await pool.execute(
            `UPDATE bookings SET status = ?, end_time = ?, total_amount = ? WHERE id = ?`,
            [BOOKING_STATUS.COMPLETED, actualEndTime, totalAmount, id]
        );
        
        const Table = require('./Table');
        await Table.updateStatus(booking.table_id, 'available');
        
        const updatedBooking = await this.getById(id);
        return {
            ...updatedBooking,
            table_amount: booking.total_amount,
            food_amount: foodTotal,
            total_amount: totalAmount
        };
    }
    
    // Get detailed invoice with all items
    static async getInvoice(bookingId) {
        const booking = await this.getById(bookingId);
        if (!booking) return null;
        
        const items = await this.getBookingItems(bookingId);
        
        // Group items by status
        const pendingItems = items.filter(item => item.status === 'pending');
        const preparingItems = items.filter(item => item.status === 'preparing');
        const servedItems = items.filter(item => item.status === 'served');
        
        const foodTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        
        return {
            booking,
            items,
            summary: {
                table_amount: Number(booking.total_amount),
                food_amount: foodTotal,
                total_amount: Number(booking.total_amount) + foodTotal
            },
            groups: {
                pending: pendingItems,
                preparing: preparingItems,
                served: servedItems
            }
        };
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
        
        for (let booking of rows) {
            const items = await this.getBookingItems(booking.id);
            booking.items = items;
            booking.food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        }
        
        return rows;
    }
    
    // Get revenue by date range (including food)
    static async getRevenueWithOrders(startDate, endDate) {
        const [revenue] = await pool.execute(
            `SELECT DATE(start_time) as date, 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as table_revenue,
                    SUM(food_total) as food_revenue,
                    SUM(total_amount + food_total) as total_revenue
             FROM (
                 SELECT b.*, COALESCE(SUM(bi.subtotal), 0) as food_total
                 FROM bookings b
                 LEFT JOIN booking_items bi ON b.id = bi.booking_id
                 WHERE b.status = 'completed' 
                 AND DATE(b.start_time) BETWEEN ? AND ?
                 GROUP BY b.id
             ) as booking_with_food
             GROUP BY DATE(start_time)
             ORDER BY date`,
            [startDate, endDate]
        );
        
        return revenue;
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
