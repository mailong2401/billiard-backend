const TableService = require('../services/tableService');
const { SOCKET_EVENTS } = require('../utils/constants');

class TableController {
    constructor(io) {
        this.io = io;
        this.tableService = new TableService();
    }
    
    // Get all tables
    async handleGetTables(socket, data, callback) {
        try {
            const tables = await this.tableService.getAllTables(data?.filters || {});
            callback({
                success: true,
                data: tables
            });
        } catch (error) {
            console.error('Error in handleGetTables:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get table by ID
    async handleGetTableById(socket, data, callback) {
        try {
            const { id } = data;
            const table = await this.tableService.getTableById(id);
            
            if (!table) {
                throw new Error('Table not found');
            }
            
            callback({
                success: true,
                data: table
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Create table
    async handleCreateTable(socket, data, callback) {
        try {
            const table = await this.tableService.createTable(data);
            
            callback({
                success: true,
                data: table,
                message: 'Table created successfully'
            });
            
            // Broadcast to all clients - CHỈ gửi 1 lần
            this.io.emit(SOCKET_EVENTS.TABLE_CREATED, table);
            
        } catch (error) {
            console.error('Error in handleCreateTable:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update table
    async handleUpdateTable(socket, data, callback) {
        try {
            const { id, ...updateData } = data;
            const table = await this.tableService.updateTable(id, updateData);
            
            callback({
                success: true,
                data: table,
                message: 'Table updated successfully'
            });
            
            // Broadcast to all clients - CHỈ gửi khi có thay đổi
            this.io.emit(SOCKET_EVENTS.TABLE_UPDATED, table);
            
        } catch (error) {
            console.error('Error in handleUpdateTable:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Delete table
    async handleDeleteTable(socket, data, callback) {
        try {
            const { id } = data;
            await this.tableService.deleteTable(id);
            
            callback({
                success: true,
                message: 'Table deleted successfully'
            });
            
            // Broadcast to all clients
            this.io.emit(SOCKET_EVENTS.TABLE_DELETED, { tableId: id });
            
        } catch (error) {
            console.error('Error in handleDeleteTable:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update table status
    async handleUpdateTableStatus(socket, data, callback) {
        try {
            const { id, status } = data;
            const table = await this.tableService.updateTableStatus(id, status);
            
            callback({
                success: true,
                data: table,
                message: 'Table status updated successfully'
            });
            
            // Broadcast to all clients
            this.io.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, table);
            
        } catch (error) {
            console.error('Error in handleUpdateTableStatus:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get table statistics
    async handleGetStatistics(socket, data, callback) {
        try {
            const stats = await this.tableService.getStatistics();
            callback({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error in handleGetStatistics:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = TableController;
