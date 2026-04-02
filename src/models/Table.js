const { pool } = require('../config/database');
const { TABLE_STATUS, TABLE_TYPE } = require('../utils/constants');

class Table {
    // Get all tables
    static async getAll(filters = {}) {
        let query = 'SELECT * FROM tables WHERE is_active = true';
        const values = [];
        let paramCount = 1;
        
        if (filters.status) {
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }
        
        if (filters.table_type) {
            query += ` AND table_type = $${paramCount}`;
            values.push(filters.table_type);
            paramCount++;
        }
        
        query += ' ORDER BY table_number';
        
        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Error in Table.getAll:', error);
            throw error;
        }
    }
    
    // Get table by ID
    static async getById(id) {
        try {
            const result = await pool.query(
                'SELECT * FROM tables WHERE id = $1 AND is_active = true',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error in Table.getById:', error);
            throw error;
        }
    }
    
    // Get table by table number
    static async getByTableNumber(tableNumber) {
        try {
            const result = await pool.query(
                'SELECT * FROM tables WHERE table_number = $1 AND is_active = true',
                [tableNumber]
            );
            return result.rows[0] || null;
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
            const result = await pool.query(
                `INSERT INTO tables (table_number, table_name, table_type, price_per_hour, description, location, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [table_number, table_name, table_type, price_per_hour, description, location, TABLE_STATUS.AVAILABLE]
            );
            
            return await this.getById(result.rows[0].id);
        } catch (error) {
            console.error('Error in Table.create:', error);
            throw error;
        }
    }
    
    // Update table
    static async update(id, data) {
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = ['table_number', 'table_name', 'table_type', 'price_per_hour', 'description', 'location', 'status', 'is_active'];
        
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = $${paramCount}`);
                values.push(data[field]);
                paramCount++;
            }
        }
        
        if (updates.length === 0) return null;
        
        values.push(id);
        
        try {
            await pool.query(
                `UPDATE tables SET ${updates.join(', ')} WHERE id = $${paramCount}`,
                values
            );
            
            return await this.getById(id);
        } catch (error) {
            console.error('Error in Table.update:', error);
            throw error;
        }
    }
  
    // Get all tables with booking info
    static async getAllWithBooking() {
        const result = await pool.query(`
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
            WHERE t.is_active = true
            ORDER BY t.table_number
        `);

        // Tính tiền realtime cho các bàn đang chơi
        for (const table of result.rows) {
            if (table.booking_id && table.start_time) {
                const startTime = new Date(table.start_time);
                const now = new Date();
                const hoursPlayed = Math.max(0, (now.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                const currentTableAmount = Math.ceil(hoursPlayed) * parseFloat(table.price_per_hour);
                
                table.current_table_amount = currentTableAmount;
                table.hours_played = hoursPlayed;
                table.food_total = parseFloat(table.food_total) || 0;
                table.current_total_amount = currentTableAmount + (table.food_total || 0);
            } else {
                table.current_table_amount = 0;
                table.hours_played = 0;
                table.food_total = 0;
                table.current_total_amount = 0;
            }
        }

        return result.rows;
    }
    
    // Update table status
    static async updateStatus(id, status) {
        try {
            await pool.query(
                'UPDATE tables SET status = $1 WHERE id = $2',
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
            await pool.query(
                'UPDATE tables SET is_active = false WHERE id = $1',
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
        } catch (error) {
            console.error('Error in Table.isAvailableForBooking:', error);
            throw error;
        }
    }
    
    // Get table statistics
    static async getStatistics() {
        try {
            const totalResult = await pool.query(
                'SELECT COUNT(*) as total FROM tables WHERE is_active = true'
            );
            
            const byStatusResult = await pool.query(
                'SELECT status, COUNT(*) as count FROM tables WHERE is_active = true GROUP BY status'
            );
            
            const byTypeResult = await pool.query(
                'SELECT table_type, COUNT(*) as count FROM tables WHERE is_active = true GROUP BY table_type'
            );
            
            return {
                total: parseInt(totalResult.rows[0].total),
                byStatus: byStatusResult.rows,
                byType: byTypeResult.rows
            };
        } catch (error) {
            console.error('Error in Table.getStatistics:', error);
            throw error;
        }
    }
}

module.exports = Table;
