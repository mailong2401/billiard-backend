const TableController = require('../controllers/tableController');
const BookingController = require('../controllers/bookingController');
const { SOCKET_EVENTS } = require('../utils/constants');

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.tableController = new TableController(io);
        this.bookingController = new BookingController(io);
    }
    
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`🟢 Client connected: ${socket.id}`);
            
            // Table events
            socket.on(SOCKET_EVENTS.GET_TABLES, (data, callback) => 
                this.tableController.handleGetTables(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_TABLE_BY_ID, (data, callback) => 
                this.tableController.handleGetTableById(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CREATE_TABLE, (data, callback) => 
                this.tableController.handleCreateTable(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_TABLE, (data, callback) => 
                this.tableController.handleUpdateTable(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.DELETE_TABLE, (data, callback) => 
                this.tableController.handleDeleteTable(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_TABLE_STATUS, (data, callback) => 
                this.tableController.handleUpdateTableStatus(socket, data, callback)
            );
            
            // Booking events
            socket.on(SOCKET_EVENTS.GET_BOOKINGS, (data, callback) => 
                this.bookingController.handleGetBookings(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_BOOKING_BY_ID, (data, callback) => 
                this.bookingController.handleGetBookingById(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CREATE_BOOKING, (data, callback) => 
                this.bookingController.handleCreateBooking(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_BOOKING, (data, callback) => 
                this.bookingController.handleUpdateBooking(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CANCEL_BOOKING, (data, callback) => 
                this.bookingController.handleCancelBooking(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CHECK_IN, (data, callback) => 
                this.bookingController.handleCheckIn(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CHECK_OUT, (data, callback) => 
                this.bookingController.handleCheckOut(socket, data, callback)
            );
            
            socket.on('check-availability', (data, callback) => 
                this.bookingController.handleCheckAvailability(socket, data, callback)
            );
            
            socket.on('get-revenue-report', (data, callback) => 
                this.bookingController.handleGetRevenueReport(socket, data, callback)
            );
            
            // Disconnect
            socket.on('disconnect', () => {
                console.log(`🔴 Client disconnected: ${socket.id}`);
            });
        });
    }
}

module.exports = SocketHandler;
