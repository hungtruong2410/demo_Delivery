// models/orderModel.js
const db = require('../db');

module.exports = {
  // Thêm đơn hàng mới
  createOrder({ order_id, user_id, item_id, quantity, price, datetime }, conn = db) {
    return new Promise((resolve, reject) => {
      // Sửa: Thêm cột status như chúng ta đã định nghĩa
      const sql = `
        INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Đang xử lý')
      `;
      conn.query(sql, [order_id, user_id, item_id, quantity, price, datetime], (error, result) => {
        if (error) return reject(error);
        resolve({ order_id: result.insertId });
      });
    });
  },

  // Lấy đơn hàng theo ID
  findById(order_id, conn = db) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM orders WHERE order_id = ?`;
      conn.query(sql, [order_id], (error, rows) => {
        if (error) return reject(error);
        resolve(rows[0] || null);
      });
    });
  },

  // Lấy toàn bộ đơn hàng
  getAllOrders() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM orders ORDER BY datetime DESC'; // Đã sửa DESC
      db.query(sql, (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  },

  // Lấy các đơn hàng theo một trạng thái cụ thể
  getOrdersByStatus(status) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM orders WHERE status = ? ORDER BY datetime ASC';
      db.query(sql, [status], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  },

  // Cập nhật trạng thái của một đơn hàng
  updateStatus(order_id, new_status) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE orders SET status = ? WHERE order_id = ?';
      db.query(sql, [new_status, order_id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  // Lấy lịch sử đơn hàng của User (kèm chi tiết món)
  getUserOrderHistory(user_id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT o.order_id, o.user_id, o.quantity, o.price, o.datetime, o.status,
               m.item_id, m.item_name, m.item_img 
        FROM orders o
        JOIN menu m ON m.item_id = o.item_id
        WHERE o.user_id = ?
        ORDER BY o.datetime DESC
      `;
      db.query(sql, [user_id], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  }
};