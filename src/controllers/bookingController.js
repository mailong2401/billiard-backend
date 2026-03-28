const BookingService = require('../services/bookingService');
const Table = require('../models/Table');
const { SOCKET_EVENTS } = require('../utils/constants');

class BookingController {
    constructor(io) {
        this.io = io;
        this.bookingService = new BookingService();
    }
    
    // Get all bookings
    async handleGetBookings(socket, data, callback) {
        try {
            const bookings = await this.bookingService.getAllBookings(data?.filters || {});
            callback({
                success: true,
                data: bookings
            });
        } catch (error) {
            console.error('Error in handleGetBookings:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get booking by ID
    async handleGetBookingById(socket, data, callback) {
        try {
            const { id } = data;
            const booking = await this.bookingService.getBookingById(id);
            
            if (!booking) {
                throw new Error('Booking not found');
            }
            
            callback({
                success: true,
                data: booking
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Create booking
    async handleCreateBooking(socket, data, callback) {
        try {
            const booking = await this.bookingService.createBooking(data);
            
            // Lấy thông tin table
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Booking created successfully'
            });
            
            // Broadcast với đầy đủ thông tin
            this.io.emit(SOCKET_EVENTS.NEW_BOOKING, {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            // Broadcast table status change - CHỈ gửi 1 lần
            if (table) {
                const updatedTable = await Table.updateStatus(booking.table_id, 'reserved');
                this.io.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, updatedTable);
            }
            
        } catch (error) {
            console.error('Create booking error:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update booking
    async handleUpdateBooking(socket, data, callback) {
        try {
            const { id, ...updateData } = data;
            const booking = await this.bookingService.updateBooking(id, updateData);
            
            // Lấy thông tin table
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Booking updated successfully'
            });
            
            // Broadcast với đầy đủ thông tin
            this.io.emit(SOCKET_EVENTS.BOOKING_UPDATED, {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
        } catch (error) {
            console.error('Update booking error:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Cancel booking
    async handleCancelBooking(socket, data, callback) {
        try {
            const { id, reason } = data;
            const booking = await this.bookingService.cancelBooking(id, reason);
            
            // Lấy thông tin table
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Booking cancelled successfully'
            });
            
            // Broadcast với đầy đủ thông tin
            this.io.emit(SOCKET_EVENTS.BOOKING_CANCELLED, {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            // Update table status back to available
            if (table && table.status === 'reserved') {
                const updatedTable = await Table.updateStatus(booking.table_id, 'available');
                this.io.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, updatedTable);
            }
            
        } catch (error) {
            console.error('Cancel booking error:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Check-in
    async handleCheckIn(socket, data, callback) {
        try {
            const { id } = data;
            const booking = await this.bookingService.checkIn(id);
            
            // Lấy thông tin table
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Checked in successfully'
            });
            
            // Broadcast với đầy đủ thông tin
            this.io.emit(SOCKET_EVENTS.BOOKING_UPDATED, {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            // Update table status
            if (table) {
                const updatedTable = await Table.updateStatus(booking.table_id, 'occupied');
                this.io.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, updatedTable);
            }
            
        } catch (error) {
            console.error('Check-in error:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Check-out
    async handleCheckOut(socket, data, callback) {
        try {
            const { id, actualEndTime } = data;
            const booking = await this.bookingService.checkOut(id, actualEndTime);
            
            // Lấy thông tin table
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Checked out successfully'
            });
            
            // Broadcast với đầy đủ thông tin
            this.io.emit(SOCKET_EVENTS.BOOKING_UPDATED, {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            // Update table status back to available
            if (table) {
                const updatedTable = await Table.updateStatus(booking.table_id, 'available');
                this.io.emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, updatedTable);
            }
            
        } catch (error) {
            console.error('Check-out error:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Check table availability
    async handleCheckAvailability(socket, data, callback) {
        try {
            const { tableId, startTime, endTime } = data;
            const availability = await this.bookingService.checkTableAvailability(tableId, startTime, endTime);
            
            callback({
                success: true,
                data: availability
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get revenue report
    async handleGetRevenueReport(socket, data, callback) {
        try {
            const { startDate, endDate } = data;
            const report = await this.bookingService.getRevenueReport(startDate, endDate);
            
            callback({
                success: true,
                data: report
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = BookingController;
