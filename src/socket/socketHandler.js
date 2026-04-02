const TableController = require('../controllers/TableController');
const BookingController = require('../controllers/BookingController');
const ProductController = require('../controllers/ProductController');
const AuthController = require('../controllers/AuthController');
const Table = require('../models/Table'); // Thêm import Table model
const { SOCKET_EVENTS, USER_EVENTS } = require('../utils/constants'); // Thêm USER_EVENTS

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.tableController = new TableController(io);
        this.bookingController = new BookingController(io);
        this.productController = new ProductController(io);
        this.authController = new AuthController(io);
    }
    
    initialize() {
        this.io.on('connection', (socket) => {
            console.log(`🟢 Client connected: ${socket.id}`);


      socket.on(USER_EVENTS.LOGIN, (data, callback) => 
                this.authController.handleLogin(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.REGISTER, (data, callback) => 
                this.authController.handleRegister(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.GET_CURRENT_USER, (data, callback) => 
                this.authController.handleGetCurrentUser(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.GET_USERS, (data, callback) => 
                this.authController.handleGetUsers(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.UPDATE_USER, (data, callback) => 
                this.authController.handleUpdateUser(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.CHANGE_PASSWORD, (data, callback) => 
                this.authController.handleChangePassword(socket, data, callback)
            );
            
            socket.on(USER_EVENTS.GET_USER_STATISTICS, (data, callback) => 
                this.authController.handleGetUserStatistics(socket, data, callback)
            );

            
            // ========== TABLE EVENTS ==========
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

            // Event lấy tất cả bàn kèm thông tin booking đang hoạt động
            socket.on('get-tables-full', async (_, callback) => {
                try {
                    const tables = await Table.getAllWithBooking();
                    callback({ success: true, data: tables });
                } catch (err) {
                    console.error('Error in get-tables-full:', err);
                    callback({ success: false, error: err.message });
                }
            });
            
            // ========== BOOKING EVENTS ==========
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
            
            socket.on(SOCKET_EVENTS.CHECK_AVAILABILITY, (data, callback) => 
                this.bookingController.handleCheckAvailability(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_REVENUE_REPORT, (data, callback) => 
                this.bookingController.handleGetRevenueReport(socket, data, callback)
            );
            
            // ========== BOOKING ITEMS EVENTS ==========
            socket.on(SOCKET_EVENTS.GET_INVOICE, (data, callback) => 
                this.bookingController.handleGetInvoice(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.ADD_BOOKING_ITEM, (data, callback) => 
                this.bookingController.handleAddBookingItem(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_BOOKING_ITEM, (data, callback) => 
                this.bookingController.handleUpdateBookingItem(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.REMOVE_BOOKING_ITEM, (data, callback) => 
                this.bookingController.handleRemoveBookingItem(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_BOOKING_ITEM_STATUS, (data, callback) => 
                this.bookingController.handleUpdateBookingItemStatus(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_BOOKING_ITEMS, (data, callback) => 
                this.bookingController.handleGetBookingItems(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_REALTIME_AMOUNT, (data, callback) => 
                this.bookingController.handleGetRealtimeAmount(socket, data, callback)
            );
            
            // ========== PRODUCT EVENTS ==========
            socket.on(SOCKET_EVENTS.GET_PRODUCTS, (data, callback) => 
                this.productController.handleGetProducts(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_PRODUCT_BY_ID, (data, callback) => 
                this.productController.handleGetProductById(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CREATE_PRODUCT, (data, callback) => 
                this.productController.handleCreateProduct(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_PRODUCT, (data, callback) => 
                this.productController.handleUpdateProduct(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.DELETE_PRODUCT, (data, callback) => 
                this.productController.handleDeleteProduct(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_CATEGORIES, (data, callback) => 
                this.productController.handleGetCategories(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.GET_CATEGORY_BY_ID, (data, callback) => 
                this.productController.handleGetCategoryById(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.CREATE_CATEGORY, (data, callback) => 
                this.productController.handleCreateCategory(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.UPDATE_CATEGORY, (data, callback) => 
                this.productController.handleUpdateCategory(socket, data, callback)
            );
            
            socket.on(SOCKET_EVENTS.DELETE_CATEGORY, (data, callback) => 
                this.productController.handleDeleteCategory(socket, data, callback)
            );
            
            // ========== ROOM EVENTS ==========
            socket.on(SOCKET_EVENTS.JOIN_TABLE_ROOM, (data) => {
                const { tableId } = data;
                if (tableId) {
                    socket.join(`table-${tableId}`);
                    console.log(`Socket ${socket.id} joined room table-${tableId}`);
                }
            });
            
            socket.on(SOCKET_EVENTS.LEAVE_TABLE_ROOM, (data) => {
                const { tableId } = data;
                if (tableId) {
                    socket.leave(`table-${tableId}`);
                    console.log(`Socket ${socket.id} left room table-${tableId}`);
                }
            });
            
            socket.on(SOCKET_EVENTS.JOIN_KITCHEN_ROOM, () => {
                socket.join('kitchen-room');
                console.log(`Socket ${socket.id} joined kitchen-room`);
            });
            
            socket.on(SOCKET_EVENTS.LEAVE_KITCHEN_ROOM, () => {
                socket.leave('kitchen-room');
                console.log(`Socket ${socket.id} left kitchen-room`);
            });
            
            // Disconnect
            socket.on('disconnect', () => {
                console.log(`🔴 Client disconnected: ${socket.id}`);
            });
        });
    }
}

module.exports = SocketHandler;
