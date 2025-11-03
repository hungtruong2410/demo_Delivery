// models/foodModel.js
const db = require('../db');

module.exports = {
  async findAllActive() {
    const sql = `
      SELECT f.*, c.name AS category_name
      FROM foods f
      JOIN categories c ON c.id = f.category_id
      WHERE f.is_active = 1
      ORDER BY f.id DESC
    `;
    const rows = await db.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT f.*, c.name AS category_name
      FROM foods f
      JOIN categories c ON c.id = f.category_id
      WHERE f.id = ?
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ name, description, price, image_url, category_id, is_active = 1 }) {
    const sql = `
      INSERT INTO foods (name, description, price, image_url, category_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [name, description, price, image_url, category_id, is_active ? 1 : 0]);
    return { id: result.insertId, name, description, price, image_url, category_id, is_active };
  },

  async update(id, { name, description, price, image_url, category_id, is_active }) {
    const sql = `
      UPDATE foods
      SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?, is_active = ?
      WHERE id = ?
    `;
    await db.query(sql, [name, description, price, image_url, category_id, is_active ? 1 : 0, id]);
    return this.findById(id);
  },

  async remove(id) {
    const sql = `DELETE FROM foods WHERE id = ?`;
    await db.query(sql, [id]);
    return true;
  }
};
