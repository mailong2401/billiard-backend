const Booking = require('../models/Booking');
const Table = require('../models/Table');
const { BOOKING_STATUS } = require('../utils/constants');
const moment = require('moment-timezone');

class BookingService {
    // Get all bookings
    async getAllBookings(filters = {}) {
        return await Booking.getAll(filters);
    }
    
    // Get booking by ID
    async getBookingById(id) {
        return await Booking.getById(id);
    }
    
    // Create booking
    async createBooking(data) {
        const { table_id, start_time, end_time, customer_name, customer_phone } = data;
        
        // Validate table exists
        const table = await Table.getById(table_id);
        if (!table) {
            throw new Error('Table not found');
        }
        
        // Check if table is available
        if (table.status !== 'available') {
            throw new Error('Table is not available');
        }
        
        // Check time slot availability
        const isAvailable = await Booking.checkAvailability(table_id, start_time, end_time);
        if (!isAvailable) {
            throw new Error('Time slot is already booked');
        }
        
        // Calculate duration and total amount
        const start = moment(start_time);
        const end = moment(end_time);
        const durationHours = end.diff(start, 'hours', true);
        const totalAmount = durationHours * table.price_per_hour;
        
        // Create booking
        const booking = await Booking.create({
            ...data,
            duration_hours: durationHours,
            total_amount: totalAmount
        });
        
        // Update table status to reserved
        await Table.updateStatus(table_id, 'reserved');
        
        return booking;
    }
    
    // Update booking
    async updateBooking(id, data) {
        const booking = await Booking.getById(id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        // If changing time, check availability
        if (data.start_time || data.end_time) {
            const startTime = data.start_time || booking.start_time;
            const endTime = data.end_time || booking.end_time;
            
            const isAvailable = await Booking.checkAvailability(booking.table_id, startTime, endTime);
            if (!isAvailable && booking.status !== 'cancelled') {
                throw new Error('New time slot is not available');
            }
            
            // Recalculate total amount if time changes
            if (booking.status === 'confirmed') {
                const table = await Table.getById(booking.table_id);
                const start = moment(startTime);
                const end = moment(endTime);
                const durationHours = end.diff(start, 'hours', true);
                data.total_amount = durationHours * table.price_per_hour;
                data.duration_hours = durationHours;
            }
        }
        
        return await Booking.update(id, data);
    }
    
    // Cancel booking
    async cancelBooking(id, reason = null) {
        const booking = await Booking.getById(id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        if (booking.status === 'completed') {
            throw new Error('Cannot cancel completed booking');
        }
        
        // Update table status back to available
        await Table.updateStatus(booking.table_id, 'available');
        
        return await Booking.cancel(id, reason);
    }
    
    // Check-in
    async checkIn(id) {
        const booking = await Booking.getById(id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        if (booking.status !== 'confirmed') {
            throw new Error('Booking is not confirmed');
        }
        
        return await Booking.checkIn(id);
    }
    
    // Check-out
    async checkOut(id, actualEndTime) {
        const booking = await Booking.getById(id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        if (booking.status !== 'checked_in') {
            throw new Error('Booking is not checked in');
        }
        
        // Calculate actual amount
        const start = moment(booking.start_time);
        const end = moment(actualEndTime);
        const actualHours = end.diff(start, 'hours', true);
        
        const table = await Table.getById(booking.table_id);
        const actualAmount = actualHours * table.price_per_hour;
        
        return await Booking.checkOut(id, actualEndTime, actualAmount);
    }
    
    // Get bookings by date
    async getBookingsByDate(date) {
        return await Booking.getByDate(date);
    }
    
    // Get revenue report
    async getRevenueReport(startDate, endDate) {
        return await Booking.getRevenue(startDate, endDate);
    }
    
    // Check table availability
    async checkTableAvailability(tableId, startTime, endTime) {
        const table = await Table.getById(tableId);
        if (!table) {
            throw new Error('Table not found');
        }
        
        const isAvailable = await Booking.checkAvailability(tableId, startTime, endTime);
        const tableStatus = table.status;
        
        return {
            table_id: tableId,
            table_number: table.table_number,
            table_name: table.table_name,
            is_available: isAvailable && tableStatus === 'available',
            table_status: tableStatus,
            time_slot: { start_time: startTime, end_time: endTime }
        };
    }
}

module.exports = BookingService;
