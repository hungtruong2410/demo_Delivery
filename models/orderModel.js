// models/orderModel.js
const db = require('../db');

module.exports = {
  // Thêm đơn hàng mới
  async createOrder({ user_id, status = 'pending', total_amount = 0, address = null, notes = null }, conn = db) {
    const sql = `
      INSERT INTO orders (user_id, status, total_amount, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await conn.query(sql, [user_id, status, total_amount, address, notes]);
    return { order_id: result.insertId, user_id, status, total_amount, address, notes };
  },

  // Cập nhật tổng tiền + trạng thái
  async updateOrderTotals(order_id, { total_amount, status }, conn = db) {
    const sql = `UPDATE orders SET total_amount = ?, status = ? WHERE order_id = ?`;
    await conn.query(sql, [total_amount, status, order_id]);
    return this.findById(order_id, conn);
  },

  // Lấy đơn hàng theo ID
  async findById(order_id, conn = db) {
    const sql = `SELECT * FROM orders WHERE order_id = ?`;
    const rows = await conn.query(sql, [order_id]);
    return rows[0] || null;
  },

  // Lấy đơn hàng kèm chi tiết món
  async findWithItems(order_id) {
    const sql = `
      SELECT o.*, oi.id AS order_item_id, oi.food_id, oi.quantity, oi.line_total,
             m.item_name AS food_name, m.item_price AS food_price, m.item_img AS image_url
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      LEFT JOIN menu m ON m.item_id = oi.food_id
      WHERE o.order_id = ?
    `;
    return db.query(sql, [order_id]);
  },

  // Lấy toàn bộ đơn hàng
  async getAllOrders() {
    const sql = 'SELECT * FROM orders ORDER BY datetime';
    return db.query(sql);
  },

  // Lấy đơn hàng cụ thể (để dispatch)
  async getById(order_id) {
    const sql = 'SELECT * FROM orders WHERE order_id = ?';
    const rows = await db.query(sql, [order_id]);
    return rows[0] || null;
  },

  // Thêm bản ghi vào order_dispatch
  async insertDispatch({ order_id, user_id, item_id, quantity, price, datetime }) {
    const sql = `
      INSERT INTO order_dispatch (order_id, user_id, item_id, quantity, price, datetime)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.query(sql, [order_id, user_id, item_id, quantity, price, datetime]);
    return true;
  },

  // Xoá đơn hàng sau khi dispatch
  async deleteOrder(order_id) {
    const sql = 'DELETE FROM orders WHERE order_id = ?';
    await db.query(sql, [order_id]);
    return true;
  }
};
