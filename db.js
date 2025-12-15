require('dotenv').config();
const mysql = require("mysql2");

// Dùng createPool thay vì createConnection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Nên thêm fallback port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test kết nối
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('LỖI KẾT NỐI DATABASE: ' + err.stack);
    } else {
      console.log('Đã kết nối database thành công via Pool');
      connection.release(); // Trả kết nối về pool ngay sau khi test
    }
  });
}

module.exports = pool;