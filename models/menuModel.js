// models/menuModel.js
const db = require('../db');

module.exports = {
  async getAll() {
    const sql = 'SELECT * FROM menu ORDER BY item_id DESC';
    return db.query(sql);
  },

  async getById(id) {
    const sql = 'SELECT * FROM menu WHERE item_id = ?';
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async add(item) {
    const sql = `
      INSERT INTO menu
      (item_name, item_type, item_category, item_serving, item_calories, item_price, item_rating, item_img)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [
      item.item_name, item.item_type, item.item_category,
      item.item_serving, item.item_calories, item.item_price,
      item.item_rating, item.item_img
    ]);
    return result.insertId;
  },

  async delete(id) {
    await db.query('DELETE FROM menu WHERE item_id = ?', [id]);
    return true;
  },

  async update(id, item) {
    const sql = `
      UPDATE menu
      SET item_name=?, item_type=?, item_category=?, item_serving=?, item_calories=?, item_price=?, item_rating=?, item_img=?
      WHERE item_id=?
    `;
    await db.query(sql, [
      item.item_name, item.item_type, item.item_category,
      item.item_serving, item.item_calories, item.item_price,
      item.item_rating, item.item_img, id
    ]);
    return true;
  },

  async changePrice(name, price) {
    const sql = 'UPDATE menu SET item_price = ? WHERE item_name = ?';
    await db.query(sql, [price, name]);
    return true;
  }
};
