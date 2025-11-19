// Load environment variables first
require('dotenv').config();

// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const path = require("path");

// Import routers
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Initialize Express App
const app = express();

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Logger middleware
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// Gắn routers
app.use('/', indexRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// 👉 THÊM ĐOẠN REDIRECT NGAY Ở ĐÂY
app.get('/adminHomepage', (req, res) => {
  return res.redirect('/admin/adminHomepage');
});

// health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Export app
module.exports = app;
