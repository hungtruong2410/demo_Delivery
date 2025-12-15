// models/searchModel.js
const db = require("../db");

module.exports = {
  async search(keyword) {
    const sql = `
      SELECT * 
      FROM menu 
      WHERE item_name LIKE ?
    `;

    const [rows] = await db.promise().query(sql, [`%${keyword}%`]);
    return rows;
  }
};
