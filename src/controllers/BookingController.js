const Booking = require('../models/Booking');
const Table = require('../models/Table');
const { SOCKET_EVENTS } = require('../utils/constants');

class BookingController {
    constructor(io) {
        this.io = io;
    }
    
    // Get all bookings
    async handleGetBookings(socket, data, callback) {
        try {
            const bookings = await Booking.getAll(data?.filters || {});
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
            const booking = await Booking.getById(id);
            
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
    
    // Get invoice with all items
    async handleGetInvoice(socket, data, callback) {
        try {
            const { bookingId } = data;
            const invoice = await Booking.getInvoice(bookingId);
            
            if (!invoice) {
                throw new Error('Booking not found');
            }
            
            callback({
                success: true,
                data: invoice
            });
        } catch (error) {
            console.error('Error in handleGetInvoice:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get booking items
    async handleGetBookingItems(socket, data, callback) {
        try {
            const { bookingId } = data;
            const items = await Booking.getBookingItems(bookingId);
            
            callback({
                success: true,
                data: items
            });
        } catch (error) {
            console.error('Error in handleGetBookingItems:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Add item to booking
    async handleAddBookingItem(socket, data, callback) {
        try {
            const { bookingId, productId, quantity, notes } = data;
            
            const booking = await Booking.getById(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            
            const item = await Booking.addBookingItem(bookingId, productId, quantity, notes);
            
            // Get updated booking
            const updatedBooking = await Booking.getById(bookingId);
            
            callback({
                success: true,
                data: item,
                booking: updatedBooking,
                message: 'Item added successfully'
            });
            
            // Broadcast to table room
            this.io.to(`table-${booking.table_id}`).emit('booking-item-added', {
                booking: updatedBooking,
                item
            });
            
            // Broadcast general update
            this.io.emit('booking-updated', updatedBooking);
            
        } catch (error) {
            console.error('Error in handleAddBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update booking item
    async handleUpdateBookingItem(socket, data, callback) {
        try {
            const { itemId, quantity } = data;
            
            const item = await Booking.updateBookingItem(itemId, quantity);
            const booking = await Booking.getById(item.booking_id);
            
            callback({
                success: true,
                data: item,
                booking,
                message: 'Item updated successfully'
            });
            
            // Broadcast to table room
            this.io.to(`table-${booking.table_id}`).emit('booking-item-updated', {
                booking,
                item
            });
            
            // Broadcast general update
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleUpdateBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Remove booking item
    async handleRemoveBookingItem(socket, data, callback) {
        try {
            const { itemId } = data;
            
            // Get item before deleting to get booking_id
            const item = await Booking.getBookingItemById(itemId);
            if (!item) {
                throw new Error('Item not found');
            }
            
            await Booking.removeBookingItem(itemId);
            const booking = await Booking.getById(item.booking_id);
            
            callback({
                success: true,
                booking,
                message: 'Item removed successfully'
            });
            
            // Broadcast to table room
            this.io.to(`table-${booking.table_id}`).emit('booking-item-removed', {
                booking,
                itemId
            });
            
            // Broadcast general update
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleRemoveBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update booking item status (for kitchen)
    async handleUpdateBookingItemStatus(socket, data, callback) {
        try {
            const { itemId, status } = data;
            
            const item = await Booking.updateBookingItemStatus(itemId, status);
            const booking = await Booking.getById(item.booking_id);
            
            callback({
                success: true,
                data: item,
                booking,
                message: 'Item status updated'
            });
            
            // Broadcast to table room
            this.io.to(`table-${booking.table_id}`).emit('booking-item-status-changed', {
                booking,
                item
            });
            
            // Broadcast general update
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleUpdateBookingItemStatus:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Create booking
    async handleCreateBooking(socket, data, callback) {
        try {
            const booking = await Booking.create(data);
            
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
            
            this.io.emit('new-booking', {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            if (table) {
                const updatedTable = await Table.updateStatus(booking.table_id, 'reserved');
                this.io.emit('table-status-changed', updatedTable);
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
            const booking = await Booking.update(id, updateData);
            
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
            
            this.io.emit('booking-updated', {
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
            const booking = await Booking.cancel(id, reason);
            
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
            
            this.io.emit('booking-cancelled', {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            if (table && table.status === 'reserved') {
                const updatedTable = await Table.updateStatus(booking.table_id, 'available');
                this.io.emit('table-status-changed', updatedTable);
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
            const booking = await Booking.checkIn(id);
            
            const table = await Table.getById(booking.table_id);
            
            callback({
                success: true,
                data: {
                    ...booking,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: 'Check-in thành công! Bắt đầu tính giờ.'
            });
            
            this.io.emit('booking-updated', {
                ...booking,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            if (table) {
                const updatedTable = await Table.updateStatus(booking.table_id, 'occupied');
                this.io.emit('table-status-changed', updatedTable);
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
            const result = await Booking.checkOut(id, actualEndTime);
            
            const table = await Table.getById(result.table_id);
            
            callback({
                success: true,
                data: {
                    ...result,
                    table_name: table?.table_name,
                    table_number: table?.table_number
                },
                message: `Check-out thành công! Tiền bàn: ${result.table_amount?.toLocaleString('vi-VN')} VNĐ - Tiền đồ: ${result.food_amount?.toLocaleString('vi-VN')} VNĐ - Tổng: ${result.total_amount?.toLocaleString('vi-VN')} VNĐ`
            });
            
            this.io.emit('booking-updated', {
                ...result,
                table_name: table?.table_name,
                table_number: table?.table_number
            });
            
            if (table) {
                const updatedTable = await Table.updateStatus(result.table_id, 'available');
                this.io.emit('table-status-changed', updatedTable);
            }
            
        } catch (error) {
            console.error('Check-out error:', error);
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
            const report = await Booking.getRevenueWithOrders(startDate, endDate);
            
            callback({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Error in handleGetRevenueReport:', error);
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
            const availability = await Booking.checkAvailability(tableId, startTime, endTime);
            
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
}

module.exports = BookingController;
