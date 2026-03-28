const Table = require('../models/Table');
const { TABLE_STATUS } = require('../utils/constants');

class TableService {
    // Get all tables
    async getAllTables(filters = {}) {
        return await Table.getAll(filters);
    }
    
    // Get table by ID
    async getTableById(id) {
        return await Table.getById(id);
    }
    
    // Create table
    async createTable(data) {
        // Check if table number exists
        const existing = await Table.getByTableNumber(data.table_number);
        if (existing) {
            throw new Error('Table number already exists');
        }
        
        return await Table.create(data);
    }
    
    // Update table
    async updateTable(id, data) {
        const table = await Table.getById(id);
        if (!table) {
            throw new Error('Table not found');
        }
        
        // Check table number uniqueness if updating
        if (data.table_number && data.table_number !== table.table_number) {
            const existing = await Table.getByTableNumber(data.table_number);
            if (existing) {
                throw new Error('Table number already exists');
            }
        }
        
        return await Table.update(id, data);
    }
    
    // Delete table
    async deleteTable(id) {
        const table = await Table.getById(id);
        if (!table) {
            throw new Error('Table not found');
        }
        
        // Check if table has active bookings
        const activeBookings = await this.getActiveBookings(id);
        if (activeBookings > 0) {
            throw new Error('Cannot delete table with active bookings');
        }
        
        return await Table.delete(id);
    }
    
    // Update table status
    async updateTableStatus(id, status) {
        const table = await Table.getById(id);
        if (!table) {
            throw new Error('Table not found');
        }
        
        if (!Object.values(TABLE_STATUS).includes(status)) {
            throw new Error('Invalid status');
        }
        
        return await Table.updateStatus(id, status);
    }
    
    // Get active bookings for table
    async getActiveBookings(tableId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE table_id = ? AND status IN ("confirmed", "checked_in")',
            [tableId]
        );
        return rows[0].count;
    }
    
    // Get table statistics
    async getStatistics() {
        return await Table.getStatistics();
    }
}

module.exports = TableService;
