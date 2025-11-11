const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// >>> THÊM DÒNG NÀY
const adminDashboard = require('../controllers/adminDashboard.controller');

// === DEBUG: in ra xem có undefined không
console.log('[routes/admin] typeof requireAdmin =', typeof requireAdmin);
console.log('[routes/admin] adminController keys =', Object.keys(adminController || {}));
console.log('[routes/admin] adminDashboard keys =', adminDashboard && Object.keys(adminDashboard) || 'UNDEFINED');

// === Wrapper: báo lỗi rõ ràng handler nào bị undefined
const ensureFn = (fn, name) => {
  if (typeof fn !== 'function') {
    throw new Error(`Route handler "${name}" is undefined`);
  }
  return fn;
};
// // Đăng nhập Admin
// router.get("/admin_signin", adminController.renderAdminSignInPage);
// router.post("/admin_signin", adminController.adminSignIn);
// router.get("/adminHomepage", requireAdmin, adminController.renderAdminHomepage);

// // Quản lý món ăn (CRUD)
// router.get("/admin_addFood", requireAdmin, adminController.renderAddFoodPage);
// router.post("/admin_addFood", requireAdmin, adminController.addFood);

// router.get("/admin_deleteFood", requireAdmin, adminController.renderDeleteFoodPage);
// router.post("/admin_deleteFood/:id", requireAdmin, adminController.deleteFood);

// // Quản lý giá
// router.get("/admin_change_price", requireAdmin, adminController.renderChangePricePage);
// router.post("/admin_change_price", requireAdmin, adminController.changePrice);

// // Quản lý đơn hàng
// router.get("/admin_view_dispatch_orders", requireAdmin, adminController.renderViewDispatchOrdersPage);
// router.post("/admin_view_dispatch_orders", requireAdmin, adminController.dispatchOrders);

// // Quản lý sản phẩm
// router.get("/admin_products", requireAdmin, adminController.renderAdminProducts);
// router.get("/admin_products/:id", requireAdmin, adminController.renderAdminProductDetail);
// router.get("/admin_products/:id/edit", requireAdmin, adminController.renderAdminProductEdit);
// router.post("/admin_products/:id/edit", requireAdmin, adminController.updateAdminProduct);

// // >>> THÊM 2 ROUTE DASHBOARD (page + API JSON)
// router.get("/admin_dashboard", requireAdmin, adminDashboard.renderDashboard);
// router.get("/admin_dashboard/metrics", requireAdmin, adminDashboard.getMetrics);
router.get("/admin_signin", ensureFn(adminController.renderAdminSignInPage, 'renderAdminSignInPage'));
router.post("/admin_signin", ensureFn(adminController.adminSignIn, 'adminSignIn'));
router.get("/adminHomepage", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.renderAdminHomepage, 'renderAdminHomepage'));

router.get("/admin_addFood", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.renderAddFoodPage, 'renderAddFoodPage'));
router.post("/admin_addFood", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.addFood, 'addFood'));

router.get("/admin_deleteFood", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.renderDeleteFoodPage, 'renderDeleteFoodPage'));
router.post("/admin_deleteFood/:id", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.deleteFood, 'deleteFood'));

router.get("/admin_change_price", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.renderChangePricePage, 'renderChangePricePage'));
router.post("/admin_change_price", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.changePrice, 'changePrice'));

router.get("/admin_view_dispatch_orders", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.renderViewDispatchOrdersPage, 'renderViewDispatchOrdersPage'));
router.post("/admin_view_dispatch_orders", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminController.dispatchOrders, 'dispatchOrders'));

// Dashboard (nếu thiếu file/export, wrapper sẽ nêu đích danh)
router.get("/admin_dashboard", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminDashboard?.renderDashboard, 'adminDashboard.renderDashboard'));
router.get("/admin_dashboard/metrics", ensureFn(requireAdmin, 'requireAdmin'), ensureFn(adminDashboard?.getMetrics, 'adminDashboard.getMetrics'));


module.exports = router;
    