// Load environment variables first
require('dotenv').config();

// Loading and Using Modules Required
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const path = require("path");

// Import routers
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// --- 1. IMPORT USER CONTROLLER (Để lấy hàm xóa) ---
const userController = require('./controllers/userController');
// --------------------------------------------------

// Initialize Express App
const app = express();

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); 
app.use(cookieParser());

// Cấu hình Session
app.use(session({
    secret: "bi_mat_cua_hung",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 }
}));

app.use(fileUpload());

// Logger middleware
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- 2. CHIÊU CUỐI: KHAI BÁO ROUTE TRỰC TIẾP TẠI ĐÂY ---
// (Đặt nó TRƯỚC các dòng app.use bên dưới để đảm bảo Server nhận diện nó đầu tiên)
app.post('/delete-cart-item', userController.deleteCartItem);
// -------------------------------------------------------

// Gắn routers
app.use('/', indexRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// Redirect
app.get('/adminHomepage', (req, res) => {
  return res.redirect('/admin/adminHomepage');
});

// health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Export app
module.exports = app;