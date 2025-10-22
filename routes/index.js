const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // <-- Gọi controller

// Trang chủ
router.get("/", userController.renderIndexPage);

module.exports = router;