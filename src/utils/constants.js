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

// Booking item status
const BOOKING_ITEM_STATUS = {
    PENDING: 'pending',
    PREPARING: 'preparing',
    SERVED: 'served',
    CANCELLED: 'cancelled'
};

// Order status (deprecated)
const ORDER_STATUS = {
    PENDING: 'pending',
    PREPARING: 'preparing',
    SERVED: 'served',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// Product categories (deprecated)
const PRODUCT_CATEGORIES = {
    DRINKS: 1,
    FOOD: 2,
    TOBACCO: 3,
    BEER: 4
};

// Socket events
const SOCKET_EVENTS = {
    // Table events
    GET_TABLES: 'get-tables',
    GET_TABLE_BY_ID: 'get-table-by-id',
    GET_TABLES_FULL: 'get-tables-full',
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
    CHECK_AVAILABILITY: 'check-availability',
    GET_REVENUE_REPORT: 'get-revenue-report',
    
    // Invoice events
    GET_INVOICE: 'get-invoice',
    GET_TOTAL_AMOUNT: 'get-total-amount',
    GET_REVENUE_WITH_ORDERS: 'get-revenue-with-orders',
    
    // Booking Items events
    GET_PRODUCTS: 'get-products',
    GET_CATEGORIES: 'get-categories',
    ADD_BOOKING_ITEM: 'add-booking-item',
    UPDATE_BOOKING_ITEM: 'update-booking-item',
    REMOVE_BOOKING_ITEM: 'remove-booking-item',
    UPDATE_BOOKING_ITEM_STATUS: 'update-booking-item-status',
    GET_BOOKING_ITEMS: 'get-booking-items',
    
    // Realtime amount events
    GET_REALTIME_AMOUNT: 'get-realtime-amount',
    BOOKING_AMOUNT_UPDATED: 'booking-amount-updated',
    
    // Product Management Events
    GET_PRODUCT_BY_ID: 'get-product-by-id',
    CREATE_PRODUCT: 'create-product',
    UPDATE_PRODUCT: 'update-product',
    DELETE_PRODUCT: 'delete-product',
    
    // Category Management Events
    GET_CATEGORY_BY_ID: 'get-category-by-id',
    CREATE_CATEGORY: 'create-category',
    UPDATE_CATEGORY: 'update-category',
    DELETE_CATEGORY: 'delete-category',
    
    // Order events (DEPRECATED)
    GET_ORDERS_BY_BOOKING: 'get-orders-by-booking',
    CREATE_ORDER: 'create-order',
    ADD_ORDER_ITEM: 'add-order-item',
    UPDATE_ORDER_ITEM: 'update-order-item',
    REMOVE_ORDER_ITEM: 'remove-order-item',
    UPDATE_ORDER_STATUS: 'update-order-status',
    CANCEL_ORDER: 'cancel-order',
    
    // Real-time updates
    TABLE_CREATED: 'table-created',
    TABLE_UPDATED: 'table-updated',
    TABLE_DELETED: 'table-deleted',
    TABLE_STATUS_CHANGED: 'table-status-changed',
    
    NEW_BOOKING: 'new-booking',
    BOOKING_UPDATED: 'booking-updated',
    BOOKING_CANCELLED: 'booking-cancelled',
    
    BOOKING_ITEM_ADDED: 'booking-item-added',
    BOOKING_ITEM_UPDATED: 'booking-item-updated',
    BOOKING_ITEM_REMOVED: 'booking-item-removed',
    BOOKING_ITEM_STATUS_CHANGED: 'booking-item-status-changed',
    
    PRODUCT_CREATED: 'product-created',
    PRODUCT_UPDATED: 'product-updated',
    PRODUCT_DELETED: 'product-deleted',
    
    CATEGORY_CREATED: 'category-created',
    CATEGORY_UPDATED: 'category-updated',
    CATEGORY_DELETED: 'category-deleted',
    
    ORDER_CREATED: 'order-created',
    ORDER_UPDATED: 'order-updated',
    ORDER_CANCELLED: 'order-cancelled',
    
    // Room events
    JOIN_TABLE_ROOM: 'join-table-room',
    LEAVE_TABLE_ROOM: 'leave-table-room',
    JOIN_KITCHEN_ROOM: 'join-kitchen-room',
    LEAVE_KITCHEN_ROOM: 'leave-kitchen-room',
    
    // Response
    ERROR: 'error',
    SUCCESS: 'success'
};

// Price per hour by table type
const PRICE_PER_HOUR = {
    standard: 50000,
    vip: 100000,
    tournament: 150000
};

// Operating hours
const OPERATING_HOURS = {
    START: 6,
    END: 23
};

// Timezone
const TIMEZONE = {
    VIETNAM: 'Asia/Ho_Chi_Minh',
    UTC: 'UTC'
};

module.exports = {
    TABLE_STATUS,
    TABLE_TYPE,
    BOOKING_STATUS,
    BOOKING_ITEM_STATUS,
    ORDER_STATUS,
    PRODUCT_CATEGORIES,
    SOCKET_EVENTS,
    PRICE_PER_HOUR,
    OPERATING_HOURS,
    TIMEZONE
};
