// models/menuModel.js
const db = require('../db');

module.exports = {
  getAll() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM menu ORDER BY item_id DESC';
      db.query(sql, (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  },

  getById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM menu WHERE item_id = ?';
      db.query(sql, [id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0] || null);
      });
    });
  },

  add(item) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO menu
        (item_name, item_type, item_category, item_serving, item_calories, item_price, item_rating, item_img)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sql, [
        item.item_name, item.item_type, item.item_category,
        item.item_serving, item.item_calories, item.item_price,
        item.item_rating, item.item_img
      ], (error, result) => {
        if (error) return reject(error);
        resolve(result.insertId);
      });
    });
  },

  delete(id) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM menu WHERE item_id = ?', [id], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  update(id, item) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE menu
        SET item_name=?, item_type=?, item_category=?, item_serving=?, item_calories=?, item_price=?, item_rating=?, item_img=?
        WHERE item_id=?
      `;
      db.query(sql, [
        item.item_name, item.item_type, item.item_category,
        item.item_serving, item.item_calories, item.item_price,
        item.item_rating, item.item_img, id
      ], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  },

  changePrice(name, price) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE menu SET item_price = ? WHERE item_name = ?';
      db.query(sql, [price, name], (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    });
  }
};