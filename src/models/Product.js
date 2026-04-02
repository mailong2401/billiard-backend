const { pool } = require('../config/database');

class Product {
    // Get all products
    static async getAll(filters = {}) {
        let query = `
            SELECT p.*, c.name as category_name,
                   CASE WHEN p.is_available = true THEN 'active' ELSE 'inactive' END as status
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;
        
        if (filters.category_id) {
            query += ` AND p.category_id = $${paramCount}`;
            values.push(filters.category_id);
            paramCount++;
        }
        
        if (filters.search) {
            query += ` AND p.name LIKE $${paramCount}`;
            values.push(`%${filters.search}%`);
            paramCount++;
        }
        
        if (filters.status) {
            query += ` AND p.is_available = $${paramCount}`;
            values.push(filters.status === 'active');
            paramCount++;
        }
        
        query += ' ORDER BY c.sort_order, p.name';
        
        const result = await pool.query(query, values);
        return result.rows;
    }
    
    // Get product by ID
    static async getById(id) {
        const result = await pool.query(
            `SELECT p.*, c.name as category_name,
                    CASE WHEN p.is_available = true THEN 'active' ELSE 'inactive' END as status
             FROM products p 
             LEFT JOIN product_categories c ON p.category_id = c.id 
             WHERE p.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }
    
    // Create product
    static async create(data) {
        const {
            name,
            description,
            price,
            category_id,
            is_available = true,
            stock = 0
        } = data;
        
        const result = await pool.query(
            `INSERT INTO products (name, description, price, category_id, is_available, stock)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [name, description, price, category_id, is_available, stock]
        );
        
        return this.getById(result.rows[0].id);
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
        
        await pool.query(
            `UPDATE products 
             SET name = $1, description = $2, price = $3, category_id = $4, is_available = $5, stock = $6
             WHERE id = $7`,
            [name, description, price, category_id, is_available, stock, id]
        );
        
        return this.getById(id);
    }
    
    // Delete product
    static async delete(id) {
        // Check if product is used in any booking
        const bookingsResult = await pool.query(
            'SELECT COUNT(*) as count FROM booking_items WHERE product_id = $1',
            [id]
        );
        
        if (parseInt(bookingsResult.rows[0].count) > 0) {
            throw new Error('Cannot delete product that has been ordered');
        }
        
        await pool.query(
            'DELETE FROM products WHERE id = $1',
            [id]
        );
        return true;
    }
    
    // Get all categories (chỉ lấy các danh mục đang active)
    static async getAllCategories() {
        const result = await pool.query(
            'SELECT * FROM product_categories WHERE is_active = true ORDER BY sort_order, name'
        );
        return result.rows;
    }
    
    // Get all categories (kể cả inactive - dùng cho quản lý)
    static async getAllCategoriesForAdmin() {
        const result = await pool.query(
            'SELECT * FROM product_categories ORDER BY sort_order, name'
        );
        return result.rows;
    }
    
    // Get category by ID
    static async getCategoryById(id) {
        const result = await pool.query(
            'SELECT * FROM product_categories WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }
    
    // Create category
    static async createCategory(data) {
        const {
            name,
            description,
            sort_order = 0,
            is_active = true
        } = data;
        
        const result = await pool.query(
            `INSERT INTO product_categories (name, description, sort_order, is_active)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [name, description, sort_order, is_active]
        );
        
        return this.getCategoryById(result.rows[0].id);
    }
    
    // Update category
    static async updateCategory(id, data) {
        const {
            name,
            description,
            sort_order,
            is_active
        } = data;
        
        await pool.query(
            `UPDATE product_categories 
             SET name = $1, description = $2, sort_order = $3, is_active = $4
             WHERE id = $5`,
            [name, description, sort_order, is_active, id]
        );
        
        return this.getCategoryById(id);
    }
    
    // Delete category
    static async deleteCategory(id) {
        // Check if category has products
        const productsResult = await pool.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
            [id]
        );
        
        if (parseInt(productsResult.rows[0].count) > 0) {
            throw new Error('Cannot delete category with existing products');
        }
        
        await pool.query(
            'DELETE FROM product_categories WHERE id = $1',
            [id]
        );
        return true;
    }
}

module.exports = Product;
