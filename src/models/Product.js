const { pool } = require('../config/database');

class Product {
    // Get all products
    static async getAll(filters = {}) {
        let query = `
            SELECT p.*, c.name as category_name,
                   CASE WHEN p.is_available = 1 THEN 'active' ELSE 'inactive' END as status
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const values = [];
        
        if (filters.category_id) {
            query += ' AND p.category_id = ?';
            values.push(filters.category_id);
        }
        
        if (filters.search) {
            query += ' AND p.name LIKE ?';
            values.push(`%${filters.search}%`);
        }
        
        if (filters.status) {
            query += ' AND p.is_available = ?';
            values.push(filters.status === 'active' ? 1 : 0);
        }
        
        query += ' ORDER BY c.sort_order, p.name';
        
        const [rows] = await pool.execute(query, values);
        return rows;
    }
    
    // Get product by ID
    static async getById(id) {
        const [rows] = await pool.execute(
            `SELECT p.*, c.name as category_name,
                    CASE WHEN p.is_available = 1 THEN 'active' ELSE 'inactive' END as status
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [id]
        );
        return rows[0] || null;
    }
    
    // Create product
    static async create(data) {
        const {
            name,
            description,
            price,
            category_id,
            is_available = 1,
            stock = 0
        } = data;
        
        const [result] = await pool.execute(
            `INSERT INTO products (name, description, price, category_id, is_available, stock)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, description, price, category_id, is_available, stock]
        );
        
        return this.getById(result.insertId);
    }
    
    // Update product
    static async update(id, data) {
        const {
            name,
            description,
            price,
            category_id,
            is_available,
            stock
        } = data;
        
        await pool.execute(
            `UPDATE products 
             SET name = ?, description = ?, price = ?, category_id = ?, is_available = ?, stock = ?
             WHERE id = ?`,
            [name, description, price, category_id, is_available, stock, id]
        );
        
        return this.getById(id);
    }
    
    // Delete product
    static async delete(id) {
        // Check if product is used in any booking
        const [bookings] = await pool.execute(
            'SELECT COUNT(*) as count FROM booking_items WHERE product_id = ?',
            [id]
        );
        
        if (bookings[0].count > 0) {
            throw new Error('Cannot delete product that has been ordered');
        }
        
        await pool.execute(
            'DELETE FROM products WHERE id = ?',
            [id]
        );
        return true;
    }
    
    // Get all categories (chỉ lấy các danh mục đang active)
    static async getAllCategories() {
        const [rows] = await pool.execute(
            'SELECT * FROM product_categories WHERE is_active = 1 ORDER BY sort_order, name'
        );
        return rows;
    }
    
    // Get all categories (kể cả inactive - dùng cho quản lý)
    static async getAllCategoriesForAdmin() {
        const [rows] = await pool.execute(
            'SELECT * FROM product_categories ORDER BY sort_order, name'
        );
        return rows;
    }
    
    // Get category by ID
    static async getCategoryById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM product_categories WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }
    
    // Create category
    static async createCategory(data) {
        const {
            name,
            description,
            sort_order = 0,
            is_active = 1
        } = data;
        
        const [result] = await pool.execute(
            `INSERT INTO product_categories (name, description, sort_order, is_active)
             VALUES (?, ?, ?, ?)`,
            [name, description, sort_order, is_active]
        );
        
        return this.getCategoryById(result.insertId);
    }
    
    // Update category
    static async updateCategory(id, data) {
        const {
            name,
            description,
            sort_order,
            is_active
        } = data;
        
        await pool.execute(
            `UPDATE product_categories 
             SET name = ?, description = ?, sort_order = ?, is_active = ?
             WHERE id = ?`,
            [name, description, sort_order, is_active, id]
        );
        
        return this.getCategoryById(id);
    }
    
    // Delete category
    static async deleteCategory(id) {
        // Check if category has products
        const [products] = await pool.execute(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [id]
        );
        
        if (products[0].count > 0) {
            throw new Error('Cannot delete category with existing products');
        }
        
        await pool.execute(
            'DELETE FROM product_categories WHERE id = ?',
            [id]
        );
        return true;
    }
}

module.exports = Product;
