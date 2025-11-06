const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// >>> THÊM DÒNG NÀY
const adminDashboard = require('../controllers/adminDashboard.controller');

// Đăng nhập Admin
router.get("/admin_signin", adminController.renderAdminSignInPage);
router.post("/admin_signin", adminController.adminSignIn);
router.get("/adminHomepage", requireAdmin, adminController.renderAdminHomepage);

// Quản lý món ăn (CRUD)
router.get("/admin_addFood", requireAdmin, adminController.renderAddFoodPage);
router.post("/admin_addFood", requireAdmin, adminController.addFood);

router.get("/admin_deleteFood", requireAdmin, adminController.renderDeleteFoodPage);
router.post("/admin_deleteFood/:id", requireAdmin, adminController.deleteFood);

// Quản lý giá
router.get("/admin_change_price", requireAdmin, adminController.renderChangePricePage);
router.post("/admin_change_price", requireAdmin, adminController.changePrice);

// Quản lý đơn hàng
router.get("/admin_view_dispatch_orders", requireAdmin, adminController.renderViewDispatchOrdersPage);
router.post("/admin_view_dispatch_orders", requireAdmin, adminController.dispatchOrders);

// Quản lý sản phẩm
router.get("/admin_products", requireAdmin, adminController.renderAdminProducts);
router.get("/admin_products/:id", requireAdmin, adminController.renderAdminProductDetail);
router.get("/admin_products/:id/edit", requireAdmin, adminController.renderAdminProductEdit);
router.post("/admin_products/:id/edit", requireAdmin, adminController.updateAdminProduct);

// >>> THÊM 2 ROUTE DASHBOARD (page + API JSON)
router.get("/admin_dashboard", requireAdmin, adminDashboard.renderDashboard);
router.get("/admin_dashboard/metrics", requireAdmin, adminDashboard.getMetrics);

module.exports = router;
    