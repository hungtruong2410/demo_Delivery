// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const path = require("path"); // <-- Vẫn cần path

// *** KHÔNG CẦN: mysql, fs, uuid ***

// Import routers
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Initialize Express App
const app = express();

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // <-- Dùng path.join cho an toàn
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Logger middleware (giữ lại)
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- XÓA HẾT TẤT CẢ app.get(), app.post() CŨ ---
// --- XÓA HẾT TẤT CẢ CÁC HÀM LOGIC (renderIndexPage, signUpUser...) ---
// --- XÓA HẾT KẾT NỐI DATABASE (đã chuyển sang db.js) ---

// Gắn (Mount) các routers
app.use('/', indexRoutes);  // Gắn route cho trang chủ
app.use('/', userRoutes);   // Gắn tất cả route cho user
app.use('/', adminRoutes);  // Gắn tất cả route cho admin

// Export app (cho server.js hoặc test)
module.exports = app;

/*
// Nếu bạn dùng file này để chạy server (ví dụ `node app.js`)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
*/