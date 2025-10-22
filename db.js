require('dotenv').config(); // <-- Đặt ở đầu file
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port : 3306 // (hoặc process.env.DB_PORT nếu bạn muốn)
});


// 1. Thực thi kết nối
connection.connect((err) => {
  if (err) {
    console.error('LỖI KẾT NỐI DATABASE: ' + err.stack);
    return;
  }
  console.log('Đã kết nối database (ID ' + connection.threadId + ')');
});

// 2. Export connection ra để các file controller có thể dùng
module.exports = connection;