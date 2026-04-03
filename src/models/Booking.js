const { pool } = require('../config/database');
const { BOOKING_STATUS } = require('../utils/constants');
const moment = require('moment-timezone');

// Cố định múi giờ Việt Nam
const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

class Booking {
    // Store intervals for realtime updates
    static realtimeIntervals = {};

    // Helper: Chuyển đổi thời gian về múi giờ Việt Nam
    static toVietnamTime(date) {
        if (!date) return null;
        return moment(date).tz(VIETNAM_TZ).format('YYYY-MM-DD HH:mm:ss');
    }

    // Helper: Lấy thời gian hiện tại theo múi giờ Việt Nam
    static nowVietnam() {
        return moment().tz(VIETNAM_TZ).format('YYYY-MM-DD HH:mm:ss');
    }

    // Generate booking code
    static generateBookingCode() {
        const now = moment().tz(VIETNAM_TZ);
        const year = now.year();
        const month = String(now.month() + 1).padStart(2, '0');
        const day = String(now.date()).padStart(2, '0');
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
            // Chuyển đổi filter date sang UTC để query
            const searchDate = moment.tz(filters.date, 'YYYY-MM-DD', VIETNAM_TZ)
                .startOf('day')
                .utc()
                .format('YYYY-MM-DD HH:mm:ss');
            const nextDay = moment.tz(filters.date, 'YYYY-MM-DD', VIETNAM_TZ)
                .endOf('day')
                .utc()
                .format('YYYY-MM-DD HH:mm:ss');
            query += ` AND b.start_time >= $${paramCount} AND b.start_time < $${paramCount + 1}`;
            values.push(searchDate, nextDay);
            paramCount += 2;
        }
        
        if (filters.customer_phone) {
            query += ` AND b.customer_phone LIKE $${paramCount}`;
            values.push(`%${filters.customer_phone}%`);
            paramCount++;
        }
        
        query += ' ORDER BY b.start_time DESC';
        
        const result = await pool.query(query, values);
        
        for (let booking of result.rows) {
            // Chuyển đổi thời gian về múi giờ Việt Nam trước khi trả về
            booking.start_time = this.toVietnamTime(booking.start_time);
            booking.end_time = this.toVietnamTime(booking.end_time);
            booking.created_at = this.toVietnamTime(booking.created_at);
            booking.updated_at = this.toVietnamTime(booking.updated_at);
            
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
        
        for (let item of result.rows) {
            item.created_at = this.toVietnamTime(item.created_at);
            item.updated_at = this.toVietnamTime(item.updated_at);
        }
        
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
            result.rows[0].start_time = this.toVietnamTime(result.rows[0].start_time);
            result.rows[0].end_time = this.toVietnamTime(result.rows[0].end_time);
            result.rows[0].created_at = this.toVietnamTime(result.rows[0].created_at);
            result.rows[0].updated_at = this.toVietnamTime(result.rows[0].updated_at);
            
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
            result.rows[0].start_time = this.toVietnamTime(result.rows[0].start_time);
            result.rows[0].end_time = this.toVietnamTime(result.rows[0].end_time);
            result.rows[0].created_at = this.toVietnamTime(result.rows[0].created_at);
            
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
        
        // Chuyển đổi thời gian từ local (Việt Nam) sang UTC để lưu vào DB
        const startTimeUTC = moment.tz(start_time, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        const endTimeUTC = moment.tz(end_time, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        
        const result = await pool.query(
            `INSERT INTO bookings (booking_code, table_id, customer_name, customer_phone, 
                                   start_time, end_time, duration_hours, total_amount, notes, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [bookingCode, table_id, customer_name, customer_phone, startTimeUTC, endTimeUTC, 
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
                let value = data[field];
                // Chuyển đổi thời gian nếu là start_time hoặc end_time
                if (field === 'start_time' || field === 'end_time') {
                    value = moment.tz(value, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
                }
                updates.push(`${field} = $${paramCount}`);
                values.push(value);
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
        
        const price = Number(productResult.rows[0].price);
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
        
        const price = Number(itemResult.rows[0].price);
        const subtotal = price * quantity;
        
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
        
        if (result.rows[0]) {
            result.rows[0].created_at = this.toVietnamTime(result.rows[0].created_at);
            result.rows[0].updated_at = this.toVietnamTime(result.rows[0].updated_at);
        }
        
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
        
        const actualStartTime = this.nowVietnam();
        
        // Chuyển đổi sang UTC để lưu vào DB
        const startTimeUTC = moment.tz(actualStartTime, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        
        await pool.query(
            'UPDATE bookings SET status = $1, start_time = $2, total_amount = 0 WHERE id = $3',
            [BOOKING_STATUS.CHECKED_IN, startTimeUTC, id]
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
        
        // Chuyển đổi thời gian từ string (đã ở VN) sang moment object
        const start = moment.tz(booking.start_time, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ);
        const end = moment.tz(actualEndTime, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ);
        const hoursPlayed = end.diff(start, 'hours', true);
        
        const actualTableAmount = Math.ceil(hoursPlayed) * Number(table.price_per_hour);
        
        const items = await this.getBookingItems(id);
        const foodTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        
        const totalAmount = actualTableAmount + foodTotal;
        
        // Chuyển đổi end time sang UTC để lưu vào DB
        const endTimeUTC = moment.tz(actualEndTime, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        
        await pool.query(
            `UPDATE bookings SET 
                status = $1, 
                end_time = $2, 
                total_amount = $3,
                duration_hours = $4
            WHERE id = $5`,
            [BOOKING_STATUS.COMPLETED, endTimeUTC, totalAmount, hoursPlayed, id]
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
        
        const start = moment.tz(booking.start_time, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ);
        const now = moment().tz(VIETNAM_TZ);
        const hoursPlayed = now.diff(start, 'hours', true);
        
        const currentTableAmount = Math.ceil(hoursPlayed) * Number(table.price_per_hour);
        
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
             WHERE DATE(b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1 
             ORDER BY b.start_time`,
            [date]
        );
        
        for (let booking of result.rows) {
            booking.start_time = this.toVietnamTime(booking.start_time);
            booking.end_time = this.toVietnamTime(booking.end_time);
            
            const items = await this.getBookingItems(booking.id);
            booking.items = items;
            booking.food_total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        }
        
        return result.rows;
    }
    
    // Get revenue by date range
    static async getRevenueWithOrders(startDate, endDate) {
        const result = await pool.query(
            `SELECT DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as date, 
                    COUNT(*) as total_bookings,
                    SUM(total_amount) as total_revenue
             FROM bookings 
             WHERE status = 'completed' 
             AND DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN $1 AND $2
             GROUP BY DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
             ORDER BY date`,
            [startDate, endDate]
        );
        
        return result.rows;
    }
    
    // Check table availability
    static async checkAvailability(tableId, startTime, endTime) {
        // Chuyển đổi thời gian từ local (Việt Nam) sang UTC để query
        const startTimeUTC = moment.tz(startTime, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        const endTimeUTC = moment.tz(endTime, 'YYYY-MM-DD HH:mm:ss', VIETNAM_TZ).utc().format('YYYY-MM-DD HH:mm:ss');
        
        const result = await pool.query(
            `SELECT * FROM bookings 
             WHERE table_id = $1 
             AND status IN ('confirmed', 'checked_in')
             AND (
                (start_time <= $2 AND end_time > $2) OR
                (start_time < $3 AND end_time >= $3) OR
                (start_time >= $2 AND end_time <= $3)
             )`,
            [tableId, startTimeUTC, startTimeUTC, endTimeUTC, endTimeUTC, startTimeUTC, endTimeUTC]
        );
        
        return result.rows.length === 0;
    }
  static async getRevenueWithOrders(startDate, endDate) {
    const result = await pool.query(
        `SELECT DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as date, 
                COUNT(*) as total_bookings,
                SUM(total_amount) as total_revenue
         FROM bookings 
         WHERE status = 'completed' 
         AND DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN $1 AND $2
         GROUP BY DATE(start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         ORDER BY date`,
        [startDate, endDate]
    );
    
    return result.rows;
}
  // Get detailed revenue report
static async getRevenueReport(startDate, endDate) {
    const result = await pool.query(
        `SELECT 
            DATE(b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as date,
            COUNT(DISTINCT b.id) as total_bookings,
            COUNT(bi.id) as total_items,
            SUM(b.total_amount) as total_revenue,
            SUM(bi.subtotal) as food_revenue,
            SUM(b.total_amount) - SUM(COALESCE(bi.subtotal, 0)) as table_revenue
         FROM bookings b
         LEFT JOIN booking_items bi ON b.id = bi.booking_id
         WHERE b.status = 'completed'
         AND DATE(b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN $1 AND $2
         GROUP BY DATE(b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         ORDER BY date`,
        [startDate, endDate]
    );
    
    return result.rows;
}
  // Get top selling products
static async getTopProducts(startDate, endDate, limit = 10) {
    const result = await pool.query(
        `SELECT 
            p.id,
            p.name,
            p.category_name,
            SUM(bi.quantity) as total_quantity,
            SUM(bi.subtotal) as total_revenue
         FROM booking_items bi
         JOIN bookings b ON bi.booking_id = b.id
         JOIN products p ON bi.product_id = p.id
         WHERE b.status = 'completed'
         AND DATE(b.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN $1 AND $2
         GROUP BY p.id, p.name, p.category_name
         ORDER BY total_revenue DESC
         LIMIT $3`,
        [startDate, endDate, limit]
    );
    
    return result.rows;
}
}

module.exports = Booking;
