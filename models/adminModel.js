// models/adminModel.js
const db = require('../db');

module.exports = {
  async login(email, password) {
    const sql = 'SELECT admin_id, admin_name FROM admin WHERE admin_email = ? AND admin_password = ?';
    const rows = await db.query(sql, [email, password]);
    return rows[0] || null;
  },

  async verify(id, name) {
    const sql = 'SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?';
    const rows = await db.query(sql, [id, name]);
    return rows[0] || null;
  }
};
