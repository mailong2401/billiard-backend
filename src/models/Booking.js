const { pool } = require('../config/database');
const { BOOKING_STATUS } = require('../utils/constants');
const moment = require('moment-timezone');

class Booking {
    // Store intervals for realtime updates
    static realtimeIntervals = {};

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
        let paramCount = 1;
        
        if (filters.status) {
            query += ` AND b.status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }
        
        if (filters.table_id) {
            query += ` AND b.table_id = $${paramCount}`;
            values.push(filters.table_id);
            paramCount++;
        }
        
        if (filters.date) {
            query += ` AND DATE(b.start_time) = $${paramCount}`;
            values.push(filters.date);
            paramCount++;
        }
        
        if (filters.customer_phone) {
            query += ` AND b.customer_phone LIKE $${paramCount}`;
            values.push(`%${filters.customer_phone}%`);
            paramCount++;
        }
        
        query += ' ORDER BY b.start_time DESC';
        
        const result = await pool.query(query, values);
        
        for (let booking of result.rows) {
            const items = await this.getBookingItems(booking.id);
            booking.items = items;
            booking.food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            booking.total_with_food = Number(booking.total_amount) + booking.food_total;
        }
        
        return result.rows;
    }
    
    // Get booking items
    static async getBookingItems(bookingId) {
        const result = await pool.query(
            `SELECT bi.*, p.name as product_name, p.price as product_price
             FROM booking_items bi
             LEFT JOIN products p ON bi.product_id = p.id
             WHERE bi.booking_id = $1
             ORDER BY bi.created_at ASC`,
            [bookingId]
        );
        return result.rows;
    }
    
    // Get booking by ID
    static async getById(id) {
        const result = await pool.query(
            `SELECT b.*, t.table_number, t.table_name, t.table_type, t.price_per_hour 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE b.id = $1`,
            [id]
        );
        
        if (result.rows[0]) {
            const items = await this.getBookingItems(id);
            result.rows[0].items = items;
            result.rows[0].food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            result.rows[0].total_with_food = Number(result.rows[0].total_amount) + result.rows[0].food_total;
        }
        
        return result.rows[0] || null;
    }
    
    // Get booking by code
    static async getByCode(bookingCode) {
        const result = await pool.query(
            `SELECT b.*, t.table_number, t.table_name, t.table_type 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE b.booking_code = $1`,
            [bookingCode]
        );
        
        if (result.rows[0]) {
            const items = await this.getBookingItems(result.rows[0].id);
            result.rows[0].items = items;
            result.rows[0].food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            result.rows[0].total_with_food = Number(result.rows[0].total_amount) + result.rows[0].food_total;
        }
        
        return result.rows[0] || null;
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
        
        const result = await pool.query(
            `INSERT INTO bookings (booking_code, table_id, customer_name, customer_phone, 
                                   start_time, end_time, duration_hours, total_amount, notes, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [bookingCode, table_id, customer_name, customer_phone, start_time, end_time, 
             duration_hours, total_amount || 0, notes, created_by, BOOKING_STATUS.PENDING]
        );
        
        return this.getById(result.rows[0].id);
    }
    
    // Update booking
    static async update(id, data) {
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = ['customer_name', 'customer_phone', 'start_time', 'end_time', 
                               'duration_hours', 'total_amount', 'notes', 'status'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = $${paramCount}`);
                values.push(data[field]);
                paramCount++;
            }
        }
        
        if (updates.length === 0) return null;
        
        values.push(id);
        await pool.query(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramCount}`,
            values
        );
        
        return this.getById(id);
    }
    
    // Update booking status
    static async updateStatus(id, status) {
        await pool.query(
            'UPDATE bookings SET status = $1 WHERE id = $2',
            [status, id]
        );
        return this.getById(id);
    }
    
    // Add item to booking
    static async addBookingItem(bookingId, productId, quantity, notes = null) {
        const productResult = await pool.query(
            'SELECT price, name FROM products WHERE id = $1',
            [productId]
        );
        
        if (!productResult.rows[0]) {
            throw new Error('Product not found');
        }
        
        const price = productResult.rows[0].price;
        const subtotal = price * quantity;
        
        const result = await pool.query(
            `INSERT INTO booking_items (booking_id, product_id, quantity, price, subtotal, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING id`,
            [bookingId, productId, quantity, price, subtotal, notes]
        );
        
        return this.getBookingItemById(result.rows[0].id);
    }
    
    // Update booking item
    static async updateBookingItem(itemId, quantity) {
        const itemResult = await pool.query(
            'SELECT * FROM booking_items WHERE id = $1',
            [itemId]
        );
        
        if (!itemResult.rows[0]) {
            throw new Error('Item not found');
        }
        
        const subtotal = itemResult.rows[0].price * quantity;
        
        await pool.query(
            'UPDATE booking_items SET quantity = $1, subtotal = $2 WHERE id = $3',
            [quantity, subtotal, itemId]
        );
        
        return this.getBookingItemById(itemId);
    }
    
    // Remove booking item
    static async removeBookingItem(itemId) {
        await pool.query(
            'DELETE FROM booking_items WHERE id = $1',
            [itemId]
        );
        return true;
    }
    
    // Get booking item by ID
    static async getBookingItemById(itemId) {
        const result = await pool.query(
            `SELECT bi.*, p.name as product_name
             FROM booking_items bi
             LEFT JOIN products p ON bi.product_id = p.id
             WHERE bi.id = $1`,
            [itemId]
        );
        return result.rows[0] || null;
    }
    
    // Update booking item status
    static async updateBookingItemStatus(itemId, status) {
        await pool.query(
            'UPDATE booking_items SET status = $1 WHERE id = $2',
            [status, itemId]
        );
        return this.getBookingItemById(itemId);
    }
    
    // Cancel booking
    static async cancel(id, reason = null) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        this.stopRealtimeUpdates(id);
        
        await pool.query(
            'UPDATE bookings SET status = $1, notes = CONCAT(notes, $2) WHERE id = $3',
            [BOOKING_STATUS.CANCELLED, reason ? `\nHủy vì: ${reason}` : '', id]
        );
        
        const Table = require('./Table');
        if (booking.status === 'reserved') {
            await Table.updateStatus(booking.table_id, 'available');
        } else if (booking.status === 'checked_in') {
            await Table.updateStatus(booking.table_id, 'available');
        }
        
        return this.getById(id);
    }
    
    // Check-in
    static async checkIn(id, io = null) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        const actualStartTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
        
        await pool.query(
            'UPDATE bookings SET status = $1, start_time = $2, total_amount = 0 WHERE id = $3',
            [BOOKING_STATUS.CHECKED_IN, actualStartTime, id]
        );
        
        const Table = require('./Table');
        await Table.updateStatus(booking.table_id, 'occupied');
        
        if (io) {
            this.startRealtimeUpdates(io, id);
        }
        
        return this.getById(id);
    }
    
    // Check-out
    static async checkOut(id, actualEndTime, io = null) {
        const booking = await this.getById(id);
        if (!booking) return null;
        
        this.stopRealtimeUpdates(id);
        
        const Table = require('./Table');
        const table = await Table.getById(booking.table_id);
        
        if (!table) {
            throw new Error('Table not found');
        }
        
        const start = moment(booking.start_time).tz('Asia/Ho_Chi_Minh');
        const end = moment(actualEndTime).tz('Asia/Ho_Chi_Minh');
        const hoursPlayed = end.diff(start, 'hours', true);
        
        const actualTableAmount = Math.ceil(hoursPlayed) * table.price_per_hour;
        
        const items = await this.getBookingItems(id);
        const foodTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        
        const totalAmount = actualTableAmount + foodTotal;
        
        await pool.query(
            `UPDATE bookings SET 
                status = $1, 
                end_time = $2, 
                total_amount = $3,
                duration_hours = $4
            WHERE id = $5`,
            [BOOKING_STATUS.COMPLETED, actualEndTime, totalAmount, hoursPlayed, id]
        );
        
        await Table.updateStatus(booking.table_id, 'available');
        
        const updatedBooking = await this.getById(id);
        
        return {
            ...updatedBooking,
            table_amount: actualTableAmount,
            food_amount: foodTotal,
            total_amount: totalAmount,
            hours_played: hoursPlayed
        };
    }
    
    // Update realtime amount
    static async updateRealtimeAmount(id) {
        const booking = await this.getById(id);
        if (!booking || booking.status !== 'checked_in') return null;
        
        const Table = require('./Table');
        const table = await Table.getById(booking.table_id);
        
        if (!table) return null;
        
        const start = moment(booking.start_time).tz('Asia/Ho_Chi_Minh');
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const hoursPlayed = now.diff(start, 'hours', true);
        
        const currentTableAmount = Math.ceil(hoursPlayed) * table.price_per_hour;
        
        const items = await this.getBookingItems(id);
        const foodTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        
        const currentTotal = currentTableAmount + foodTotal;
        
        await pool.query(
            'UPDATE bookings SET total_amount = $1 WHERE id = $2',
            [currentTotal, id]
        );
        
        return {
            booking_id: id,
            table_amount: currentTableAmount,
            food_amount: foodTotal,
            total_amount: currentTotal,
            hours_played: hoursPlayed
        };
    }
    
    // Start realtime updates
    static startRealtimeUpdates(io, bookingId) {
        if (this.realtimeIntervals[bookingId]) {
            clearInterval(this.realtimeIntervals[bookingId]);
        }
        
        console.log(`Starting realtime updates for booking ${bookingId}`);
        
        this.realtimeIntervals[bookingId] = setInterval(async () => {
            try {
                const updateData = await this.updateRealtimeAmount(bookingId);
                if (updateData && io) {
                    const booking = await this.getById(bookingId);
                    if (booking) {
                        io.to(`table-${booking.table_id}`).emit('booking-amount-updated', {
                            booking_id: bookingId,
                            table_id: booking.table_id,
                            ...updateData
                        });
                        io.emit('booking-updated', {
                            ...booking,
                            total_amount: updateData.total_amount,
                            food_total: updateData.food_amount
                        });
                    }
                }
            } catch (error) {
                console.error(`Error updating realtime amount for booking ${bookingId}:`, error);
            }
        }, 10000);
    }
    
    // Stop realtime updates
    static stopRealtimeUpdates(bookingId) {
        if (this.realtimeIntervals[bookingId]) {
            clearInterval(this.realtimeIntervals[bookingId]);
            delete this.realtimeIntervals[bookingId];
            console.log(`Stopped realtime updates for booking ${bookingId}`);
        }
    }
    
    // Get detailed invoice
    static async getInvoice(bookingId) {
        const booking = await this.getById(bookingId);
        if (!booking) return null;
        
        const items = await this.getBookingItems(bookingId);
        
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
        const result = await pool.query(
            `SELECT b.*, t.table_number, t.table_name 
             FROM bookings b 
             LEFT JOIN tables t ON b.table_id = t.id 
             WHERE DATE(b.start_time) = $1 
             ORDER BY b.start_time`,
            [date]
        );
        
        for (let booking of result.rows) {
            const items = await this.getBookingItems(booking.id);
            booking.items = items;
            booking.food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        }
        
        return result.rows;
    }
    
    // Get revenue by date range
    static async getRevenueWithOrders(startDate, endDate) {
        const result = await pool.query(
            `SELECT DATE(start_time) as date, 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue
             FROM bookings 
             WHERE status = 'completed' 
             AND DATE(start_time) BETWEEN $1 AND $2
             GROUP BY DATE(start_time)
             ORDER BY date`,
            [startDate, endDate]
        );
        
        return result.rows;
    }
    
    // Check table availability
    static async checkAvailability(tableId, startTime, endTime) {
        const result = await pool.query(
            `SELECT * FROM bookings 
             WHERE table_id = $1 
             AND status IN ('confirmed', 'checked_in')
             AND (
                (start_time <= $2 AND end_time > $2) OR
                (start_time < $3 AND end_time >= $3) OR
                (start_time >= $2 AND end_time <= $3)
             )`,
            [tableId, startTime, startTime, endTime, endTime, startTime, endTime]
        );
        
        return result.rows.length === 0;
    }
}

module.exports = Booking;
