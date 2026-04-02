const Booking = require('../models/Booking');
const Table = require('../models/Table');

class BookingController {
    constructor(io) {
        this.io = io;
    }
    
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
    
    async handleAddBookingItem(socket, data, callback) {
        try {
            const { bookingId, productId, quantity, notes } = data;
            
            const booking = await Booking.getById(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
            
            const item = await Booking.addBookingItem(bookingId, productId, quantity, notes);
            const updatedBooking = await Booking.getById(bookingId);
            
            callback({
                success: true,
                data: item,
                booking: updatedBooking,
                message: 'Item added successfully'
            });
            
            this.io.to(`table-${booking.table_id}`).emit('booking-item-added', {
                booking: updatedBooking,
                item
            });
            this.io.emit('booking-updated', updatedBooking);
            
        } catch (error) {
            console.error('Error in handleAddBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
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
            
            this.io.to(`table-${booking.table_id}`).emit('booking-item-updated', {
                booking,
                item
            });
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleUpdateBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    async handleRemoveBookingItem(socket, data, callback) {
        try {
            const { itemId } = data;
            
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
            
            this.io.to(`table-${booking.table_id}`).emit('booking-item-removed', {
                booking,
                itemId
            });
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleRemoveBookingItem:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
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
            
            this.io.to(`table-${booking.table_id}`).emit('booking-item-status-changed', {
                booking,
                item
            });
            this.io.emit('booking-updated', booking);
            
        } catch (error) {
            console.error('Error in handleUpdateBookingItemStatus:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
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
            
            if (table && (table.status === 'reserved' || table.status === 'occupied')) {
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
    
    async handleCheckIn(socket, data, callback) {
        try {
            const { id } = data;
            const booking = await Booking.checkIn(id, this.io);
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
    
    async handleCheckOut(socket, data, callback) {
        try {
            const { id, actualEndTime } = data;
            const result = await Booking.checkOut(id, actualEndTime, this.io);
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
    
    async handleGetRealtimeAmount(socket, data, callback) {
        try {
            const { bookingId } = data;
            const amount = await Booking.updateRealtimeAmount(bookingId);
            callback({
                success: true,
                data: amount
            });
        } catch (error) {
            console.error('Error in handleGetRealtimeAmount:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
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
