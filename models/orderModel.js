// models/orderModel.js
const db = require('../db');

module.exports = {
  async createOrder({ user_id, status = 'pending', total_amount = 0, address = null, notes = null }, conn = db) {
    const sql = `
      INSERT INTO orders (user_id, status, total_amount, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await conn.query(sql, [user_id, status, total_amount, address, notes]);
    return { id: result.insertId, user_id, status, total_amount, address, notes };
  },

  async updateOrderTotals(id, { total_amount, status }, conn = db) {
    const sql = `UPDATE orders SET total_amount = ?, status = ? WHERE id = ?`;
    await conn.query(sql, [total_amount, status, id]);
    return this.findById(id, conn);
  },

  async findById(id, conn = db) {
    const sql = `SELECT * FROM orders WHERE id = ?`;
    const rows = await conn.query(sql, [id]);
    return rows[0] || null;
  },

  async findWithItems(id) {
    const sql = `
      SELECT o.*, oi.id AS order_item_id, oi.food_id, oi.quantity, oi.line_total,
             f.name AS food_name, f.price AS food_price, f.image_url
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN foods f ON f.id = oi.food_id
      WHERE o.id = ?
    `;
    return db.query(sql, [id]);
  }
};
