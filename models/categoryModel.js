// models/categoryModel.js
const db = require('../db');

module.exports = {
  async findAll() {
    const sql = `SELECT * FROM categories ORDER BY name ASC`;
    return db.query(sql);
  },

  async findById(id) {
    const sql = `SELECT * FROM categories WHERE id = ?`;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }
};
