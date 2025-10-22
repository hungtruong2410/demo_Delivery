const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // <-- Gọi controller

// Đăng ký, Đăng nhập, Đăng xuất
router.get("/signup", userController.renderSignUpPage);
router.post("/signup", userController.signUpUser);
router.get("/signin", userController.renderSignInPage);
router.post("/signin", userController.signInUser);
router.get("/logout", userController.logout);

// Các trang nghiệp vụ
router.get("/homepage", userController.renderHomePage);
router.get("/cart", userController.renderCart);
router.post("/cart", userController.updateCart);
router.post("/checkout", userController.checkout);
router.get("/confirmation", userController.renderConfirmationPage);
router.get("/myorders", userController.renderMyOrdersPage);

// Cài đặt
router.get("/settings", userController.renderSettingsPage);
router.post("/address", userController.updateAddress);
router.post("/contact", userController.updateContact);
router.post("/password", userController.updatePassword);

module.exports = router;