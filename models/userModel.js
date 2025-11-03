// models/userModel.js
const db = require('../db');

module.exports = {
  async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const rows = await db.query(sql, [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const sql = `SELECT * FROM users WHERE id = ?`;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ name, email, password_hash, phone = null, role = 'user' }) {
    const sql = `
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [name, email, password_hash, phone, role]);
    return { id: result.insertId, name, email, phone, role };
  }
};
