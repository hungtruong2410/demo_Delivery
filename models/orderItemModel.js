// models/orderItemModel.js
const db = require('../db');

module.exports = {
  async createItem({ order_id, food_id, quantity, line_total }, conn = db) {
    const sql = `
      INSERT INTO order_items (order_id, food_id, quantity, line_total)
      VALUES (?, ?, ?, ?)
    `;
    const result = await conn.query(sql, [order_id, food_id, quantity, line_total]);
    return { id: result.insertId, order_id, food_id, quantity, line_total };
  }
};
