// Table status
const TABLE_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    RESERVED: 'reserved',
    MAINTENANCE: 'maintenance',
    CLEANING: 'cleaning'
};

// Table types
const TABLE_TYPE = {
    STANDARD: 'standard',
    VIP: 'vip',
    TOURNAMENT: 'tournament'
};

// Booking status
const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// Socket events
// Socket events
const SOCKET_EVENTS = {
    // Table events
    GET_TABLES: 'get-tables',
    GET_TABLE_BY_ID: 'get-table-by-id',
    CREATE_TABLE: 'create-table',
    UPDATE_TABLE: 'update-table',
    DELETE_TABLE: 'delete-table',
    UPDATE_TABLE_STATUS: 'update-table-status',
    
    // Booking events
    CREATE_BOOKING: 'create-booking',
    GET_BOOKINGS: 'get-bookings',
    GET_BOOKING_BY_ID: 'get-booking-by-id',
    UPDATE_BOOKING: 'update-booking',
    CANCEL_BOOKING: 'cancel-booking',
    CHECK_IN: 'check-in',
    CHECK_OUT: 'check-out',
    
    // Real-time updates
    TABLE_CREATED: 'table-created',
    TABLE_UPDATED: 'table-updated',
    TABLE_DELETED: 'table-deleted',
    TABLE_STATUS_CHANGED: 'table-status-changed',
    NEW_BOOKING: 'new-booking',
    BOOKING_UPDATED: 'booking-updated',
    BOOKING_CANCELLED: 'booking-cancelled',
    
    // Response
    ERROR: 'error',
    SUCCESS: 'success'
};

module.exports = {
    TABLE_STATUS,
    TABLE_TYPE,
    BOOKING_STATUS,
    SOCKET_EVENTS
};
