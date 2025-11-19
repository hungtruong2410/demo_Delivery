const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const adminDashboard = require('../controllers/adminDashboard.controller');
const { requireAdmin } = require('../middleware/authMiddleware');

// Đăng nhập Admin
router.get('/admin_signin', adminController.renderAdminSignInPage);
router.post('/admin_signin', adminController.adminSignIn);

// Trang chủ admin
router.get('/adminHomepage', requireAdmin, adminController.renderAdminHomepage);

// Thêm món
router.get('/admin_addFood', requireAdmin, adminController.renderAddFoodPage);
router.post('/admin_addFood', requireAdmin, adminController.addFood);

// Xoá món
router.get('/admin_deleteFood', requireAdmin, adminController.renderDeleteFoodPage);
router.post('/admin_deleteFood/:id', requireAdmin, adminController.deleteFood);

// Đổi giá
router.get('/admin_change_price', requireAdmin, adminController.renderChangePricePage);
router.post('/admin_change_price', requireAdmin, adminController.changePrice);

// View & Dispatch Orders
router.get(
  '/admin_view_dispatch_orders',
  requireAdmin,
  adminController.renderViewDispatchOrdersPage
);

router.post(
  '/admin_view_dispatch_orders',
  requireAdmin,
  adminController.dispatchOrders
);

// Products
router.get('/admin_products', requireAdmin, adminController.renderAdminProducts);
router.get('/admin_products/:id', requireAdmin, adminController.renderAdminProductDetail);
router.get('/admin_products/:id/edit', requireAdmin, adminController.renderAdminProductEdit);
router.post('/admin_products/:id/edit', requireAdmin, adminController.updateAdminProduct);

// Dashboard
router.get('/admin_dashboard', requireAdmin, adminDashboard.renderDashboard);
router.get('/admin_dashboard/metrics', requireAdmin, adminDashboard.getMetrics);

module.exports = router;
