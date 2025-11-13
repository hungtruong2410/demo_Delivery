require('dotenv').config();
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306
});

// Chỉ connect khi KHÔNG phải môi trường test
if (process.env.NODE_ENV !== 'test') {
  connection.connect((err) => {
    if (err) {
      console.error('LỖI KẾT NỐI DATABASE: ' + err.stack);
      return;
    }
    console.log('Đã kết nối database (ID ' + connection.threadId + ')');
  });
}

module.exports = connection;
