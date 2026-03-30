const Product = require('../models/Product');
const { SOCKET_EVENTS } = require('../utils/constants');

class ProductController {
    constructor(io) {
        this.io = io;
    }
    
    // Get all products
    async handleGetProducts(socket, data, callback) {
        try {
            const products = await Product.getAll(data?.filters || {});
            callback({
                success: true,
                data: products
            });
        } catch (error) {
            console.error('Error in handleGetProducts:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get product by ID
    async handleGetProductById(socket, data, callback) {
        try {
            const { id } = data;
            const product = await Product.getById(id);
            
            if (!product) {
                throw new Error('Product not found');
            }
            
            callback({
                success: true,
                data: product
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Create product
    async handleCreateProduct(socket, data, callback) {
        try {
            const product = await Product.create(data);
            
            callback({
                success: true,
                data: product,
                message: 'Product created successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('product-created', product);
            
        } catch (error) {
            console.error('Error in handleCreateProduct:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update product
    async handleUpdateProduct(socket, data, callback) {
        try {
            const { id, ...updateData } = data;
            const product = await Product.update(id, updateData);
            
            callback({
                success: true,
                data: product,
                message: 'Product updated successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('product-updated', product);
            
        } catch (error) {
            console.error('Error in handleUpdateProduct:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Delete product
    async handleDeleteProduct(socket, data, callback) {
        try {
            const { id } = data;
            await Product.delete(id);
            
            callback({
                success: true,
                message: 'Product deleted successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('product-deleted', { id });
            
        } catch (error) {
            console.error('Error in handleDeleteProduct:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get all categories
    async handleGetCategories(socket, data, callback) {
        try {
            const categories = await Product.getAllCategories();
            callback({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error in handleGetCategories:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Get category by ID
    async handleGetCategoryById(socket, data, callback) {
        try {
            const { id } = data;
            const category = await Product.getCategoryById(id);
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            callback({
                success: true,
                data: category
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Create category
    async handleCreateCategory(socket, data, callback) {
        try {
            const category = await Product.createCategory(data);
            
            callback({
                success: true,
                data: category,
                message: 'Category created successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('category-created', category);
            
        } catch (error) {
            console.error('Error in handleCreateCategory:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Update category
    async handleUpdateCategory(socket, data, callback) {
        try {
            const { id, ...updateData } = data;
            const category = await Product.updateCategory(id, updateData);
            
            callback({
                success: true,
                data: category,
                message: 'Category updated successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('category-updated', category);
            
        } catch (error) {
            console.error('Error in handleUpdateCategory:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
    
    // Delete category
    async handleDeleteCategory(socket, data, callback) {
        try {
            const { id } = data;
            await Product.deleteCategory(id);
            
            callback({
                success: true,
                message: 'Category deleted successfully'
            });
            
            // Broadcast to all clients
            this.io.emit('category-deleted', { id });
            
        } catch (error) {
            console.error('Error in handleDeleteCategory:', error);
            callback({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ProductController;
