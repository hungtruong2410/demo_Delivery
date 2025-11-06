// models/adminModel.js
const db = require('../db');

module.exports = {
  
  // Sửa hàm login để trả về một Promise
  login(email, password) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT admin_id, admin_name FROM admin WHERE admin_email = ? AND admin_password = ?';
      
      // Sử dụng cú pháp callback (giống như userController.js)
      db.query(sql, [email, password], (error, results) => {
        if (error) {
          return reject(error); // Báo lỗi
        }
        if (results && results.length > 0) {
          resolve(results[0]); // Trả về admin nếu tìm thấy
        } else {
          resolve(null); // Trả về null nếu không tìm thấy
        }
      });
    });
  },

  // Sửa hàm verify để trả về một Promise
  verify(id, name) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?';
      
      db.query(sql, [id, name], (error, results) => {
        if (error) {
          return reject(error);
        }
        if (results && results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
  }
};