// FILE: controllers/searchController.js
const SearchModel = require("../models/searchModel");
const CartModel = require("../models/cartModel"); // <--- Phải có dòng này để gọi Model

module.exports = {
  // 1. Chức năng Tìm kiếm (Giữ nguyên)
  async search(req, res) {
    try {
      const keyword = req.query.q || "";
      const products = await SearchModel.search(keyword);
      const currentUser = (req.session && req.session.username) ? req.session.username : "Guest";
      
      res.render("search_results", {
        keyword: keyword,
        products: products,
        username: currentUser,
        items: products
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi Server");
    }
  },

  // 2. Chức năng Thêm vào giỏ (SỬA LẠI ĐOẠN NÀY)
  async addToCart(req, res) {
     try {
         const { item_id } = req.body;
         
         // Lấy tên người dùng đang đăng nhập
         const username = (req.session && req.session.username) ? req.session.username : null;

         // Nếu chưa đăng nhập thì báo lỗi
         if (!username || username === "Guest") {
             return res.json({ success: false, message: "Bạn cần đăng nhập để mua hàng!" });
         }

         console.log(`⚡️ User [${username}] đang thêm món ID [${item_id}] vào Database...`);

         // --- LỆNH QUAN TRỌNG NHẤT: LƯU VÀO DB ---
         await CartModel.addToCart(username, item_id, 1);
         // -----------------------------------------

         res.json({ success: true, message: "Đã thêm vào giỏ thành công!" });
         
     } catch (err) {
         console.error("Lỗi Add Cart:", err);
         res.status(500).json({ success: false, message: "Lỗi Server: " + err.message });
     }
  }
};