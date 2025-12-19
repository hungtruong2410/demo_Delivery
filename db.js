require('dotenv').config();
const mysql = require("mysql2");

// Dùng createPool thay vì createConnection
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // Đảm bảo biến này khớp với trong CI
  database: process.env.DB_NAME || 'foodorderingwesitedb',
  port: process.env.DB_PORT || 3306,
  
  // --- 👇 DÒNG QUAN TRỌNG NHẤT ĐỂ FIX LỖI CI 👇 ---
  charset: 'UTF8_GENERAL_CI', 
  // ---------------------------------------------

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test kết nối (Chỉ log khi không phải môi trường test để đỡ rác log)
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ LỖI KẾT NỐI DATABASE: ' + err.message);
    } else {
      console.log('✅ Đã kết nối database thành công via Pool');
      connection.release(); 
    }
  });
}

module.exports = pool;