// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// === AUTH ===
router.get("/signup", userController.renderSignUpPage);
router.post("/signup", userController.signUpUser);
router.get("/signin", userController.renderSignInPage);
router.post("/signin", userController.signInUser);
router.get("/logout", userController.logout);

// === MAIN PAGES ===
router.get("/", userController.renderIndexPage);
router.get("/homepage", userController.renderHomePage);
router.get("/cart", userController.renderCart);
router.post("/cart", userController.updateCart);

// === THANH TOÁN (Stripe) ===
router.post("/create-checkout-session", userController.createCheckoutSession);
// router.get("/payment-success", userController.saveOrderAfterPayment);
router.get("/payment-cancel", userController.paymentCancel);

// === SAU THANH TOÁN / XEM ĐƠN ===
router.get("/confirmation", userController.renderConfirmationPage);
router.get("/myorders", userController.renderMyOrdersPage);

// === SETTINGS ===
router.get("/settings", userController.renderSettingsPage);
router.post("/address", userController.updateAddress);
router.post("/contact", userController.updateContact);
router.post("/password", userController.updatePassword);

module.exports = router;
