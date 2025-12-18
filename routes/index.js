const express = require('express');
const router = express.Router();

// 1. IMPORT CÁC CONTROLLER
const userController = require('../controllers/userController'); 
const searchController = require('../controllers/searchController'); // <--- Thêm dòng này

// 2. CÁC ROUTE TRANG CHỦ
router.get("/", userController.renderIndexPage);

// Nếu bạn đang vào bằng đường dẫn /homepage thì nên giữ dòng này (nếu có ở file cũ)
// router.get("/homepage", userController.renderIndexPage); 

// 3. ROUTE TÌM KIẾM (Để sửa lỗi Cannot GET /search)
router.get("/search", searchController.search);

// 4. ROUTE THÊM VÀO GIỎ HÀNG (Để nút dấu cộng hoạt động)
// Lưu ý: Đảm bảo trong searchController.js bạn đã viết hàm addToCart nhé
router.post("/add-to-cart", searchController.addToCart);
//Xoá sản phẩm
router.post('/delete-cart-item', userController.deleteCartItem);
module.exports = router;