const { pool } = require('../config/database');
const { TABLE_STATUS, TABLE_TYPE } = require('../utils/constants');

class Table {
    // Get all tables
    static async getAll(filters = {}) {
        let query = 'SELECT * FROM tables WHERE is_active = 1';
        const values = [];
        
        if (filters.status) {
            query += ' AND status = ?';
            values.push(filters.status);
        }
        
        if (filters.table_type) {
            query += ' AND table_type = ?';
            values.push(filters.table_type);
        }
        
        query += ' ORDER BY table_number';
        
        try {
            const [rows] = await pool.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Error in Table.getAll:', error);
            throw error;
        }
    }
    
    // Get table by ID
    static async getById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tables WHERE id = ? AND is_active = 1',
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Table.getById:', error);
            throw error;
        }
    }
    
    // Get table by table number
    static async getByTableNumber(tableNumber) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tables WHERE table_number = ? AND is_active = 1',
                [tableNumber]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Table.getByTableNumber:', error);
            throw error;
        }
    }
    
    // Create new table
    static async create(data) {
        const {
            table_number,
            table_name,
            table_type = TABLE_TYPE.STANDARD,
            price_per_hour,
            description = null,
            location = null
        } = data;
        
        try {
            const [result] = await pool.execute(
                `INSERT INTO tables (table_number, table_name, table_type, price_per_hour, description, location, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [table_number, table_name, table_type, price_per_hour, description, location, TABLE_STATUS.AVAILABLE]
            );
            
            return await this.getById(result.insertId);
        } catch (error) {
            console.error('Error in Table.create:', error);
            throw error;
        }
    }
    
    // Update table
    static async update(id, data) {
        const updates = [];
        const values = [];
        
        const allowedFields = ['table_number', 'table_name', 'table_type', 'price_per_hour', 'description', 'location', 'status', 'is_active'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        
        if (updates.length === 0) return null;
        
        values.push(id);
        
        try {
            await pool.execute(
                `UPDATE tables SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
            
            return await this.getById(id);
        } catch (error) {
            console.error('Error in Table.update:', error);
            throw error;
        }
    }
  
  // Thêm method này vào class Table
static async getAllWithBooking() {
    const [rows] = await pool.execute(`
        SELECT 
            t.*,
            b.id as booking_id,
            b.start_time,
            b.customer_name,
            b.customer_phone,
            b.total_amount as booking_total_amount,
            (
                SELECT COALESCE(SUM(bi.subtotal), 0)
                FROM booking_items bi
                WHERE bi.booking_id = b.id
            ) as food_total
        FROM tables t
        LEFT JOIN bookings b 
            ON t.id = b.table_id 
            AND b.status = 'checked_in'
        WHERE t.is_active = 1
        ORDER BY t.table_number
    `);

    // Tính tiền realtime cho các bàn đang chơi
    for (const table of rows) {
        if (table.booking_id && table.start_time) {
            const startTime = new Date(table.start_time);
            const now = new Date();
            const hoursPlayed = Math.max(0, (now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
            const currentTableAmount = Math.ceil(hoursPlayed) * table.price_per_hour;
            
            table.current_table_amount = currentTableAmount;
            table.hours_played = hoursPlayed;
            table.food_total = Number(table.food_total) || 0;
            table.current_total_amount = currentTableAmount + (table.food_total || 0);
        } else {
            table.current_table_amount = 0;
            table.hours_played = 0;
            table.food_total = 0;
            table.current_total_amount = 0;
        }
    }

    return rows;
}
    
    // Update table status
    static async updateStatus(id, status) {
        try {
            await pool.execute(
                'UPDATE tables SET status = ? WHERE id = ?',
                [status, id]
            );
            return await this.getById(id);
        } catch (error) {
            console.error('Error in Table.updateStatus:', error);
            throw error;
        }
    }
    
    // Delete table (soft delete)
    static async delete(id) {
        try {
            await pool.execute(
                'UPDATE tables SET is_active = 0 WHERE id = ?',
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error in Table.delete:', error);
            throw error;
        }
    }
    
    // Check if table is available for booking
    static async isAvailableForBooking(tableId, startTime, endTime) {
        try {
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
        } catch (error) {
            console.error('Error in Table.isAvailableForBooking:', error);
            throw error;
        }
    }
    
    // Get table statistics
    static async getStatistics() {
        try {
            const [total] = await pool.execute(
                'SELECT COUNT(*) as total FROM tables WHERE is_active = 1'
            );
            
            const [byStatus] = await pool.execute(
                'SELECT status, COUNT(*) as count FROM tables WHERE is_active = 1 GROUP BY status'
            );
            
            const [byType] = await pool.execute(
                'SELECT table_type, COUNT(*) as count FROM tables WHERE is_active = 1 GROUP BY table_type'
            );
            
            return {
                total: total[0].total,
                byStatus,
                byType
            };
        } catch (error) {
            console.error('Error in Table.getStatistics:', error);
            throw error;
        }
    }
}

module.exports = Table;
