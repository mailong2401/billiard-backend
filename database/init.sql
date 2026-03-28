-- Create database
CREATE DATABASE IF NOT EXISTS billiard_management;
USE billiard_management;

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_number VARCHAR(10) UNIQUE NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    table_type ENUM('standard', 'vip', 'tournament') DEFAULT 'standard',
    status ENUM('available', 'occupied', 'reserved', 'maintenance', 'cleaning') DEFAULT 'available',
    price_per_hour DECIMAL(10,2) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_table_type (table_type)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    table_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_hours DECIMAL(5,2),
    total_amount DECIMAL(10,2),
    status ENUM('pending', 'confirmed', 'checked_in', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
    INDEX idx_table_id (table_id),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time)
);

-- Insert sample data
INSERT INTO tables (table_number, table_name, table_type, price_per_hour, description, location) VALUES
('T01', 'Bàn Standard 1', 'standard', 50000, 'Bàn bi da tiêu chuẩn', 'Tầng 1 - Khu A'),
('T02', 'Bàn Standard 2', 'standard', 50000, 'Bàn bi da tiêu chuẩn', 'Tầng 1 - Khu A'),
('T03', 'Bàn Standard 3', 'standard', 50000, 'Bàn bi da tiêu chuẩn', 'Tầng 1 - Khu B'),
('T04', 'Bàn VIP 1', 'vip', 100000, 'Bàn VIP cao cấp', 'Tầng 2 - Khu VIP'),
('T05', 'Bàn VIP 2', 'vip', 100000, 'Bàn VIP cao cấp', 'Tầng 2 - Khu VIP'),
('T06', 'Bàn Tournament', 'tournament', 150000, 'Bàn chuẩn giải đấu', 'Tầng 2 - Khu Tournament');

INSERT INTO bookings (booking_code, table_id, customer_name, customer_phone, start_time, end_time, duration_hours, total_amount, status, notes) VALUES
('BK001', 1, 'Nguyễn Văn A', '0901234567', '2024-01-20 14:00:00', '2024-01-20 16:00:00', 2, 100000, 'completed', 'Đặt bàn 2 tiếng'),
('BK002', 2, 'Trần Thị B', '0901234568', '2024-01-20 15:00:00', '2024-01-20 17:00:00', 2, 100000, 'checked_in', 'Có nước uống kèm'),
('BK003', 4, 'Lê Văn C', '0901234569', '2024-01-20 19:00:00', '2024-01-20 21:00:00', 2, 200000, 'confirmed', 'Bàn VIP');
