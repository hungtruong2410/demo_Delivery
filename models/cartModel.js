// FILE: models/cartModel.js
const db = require('../db'); 

module.exports = {
    async addToCart(username, itemId, quantity) {
        // Kiểm tra xem đã có món này chưa
        const checkSql = "SELECT * FROM cart WHERE user_name = ? AND item_id = ?";
        const [existing] = await db.promise().query(checkSql, [username, itemId]);

        if (existing.length > 0) {
            // Có rồi -> Tăng số lượng
            const updateSql = "UPDATE cart SET quantity = quantity + ? WHERE user_name = ? AND item_id = ?";
            await db.promise().query(updateSql, [quantity, username, itemId]);
        } else {
            // Chưa có -> Thêm mới (ĐÂY LÀ LỆNH BẠN ĐANG CẦN)
            const insertSql = "INSERT INTO cart (user_name, item_id, quantity) VALUES (?, ?, ?)";
            await db.promise().query(insertSql, [username, itemId, quantity]);
        }
    },
    
    // Hàm lấy danh sách để hiển thị
    async getCartByUser(username) {
        const sql = `
            SELECT c.cart_id, c.quantity, m.item_name, m.item_price, m.item_img, 
                   (c.quantity * m.item_price) as total_price
            FROM cart c
            JOIN menu m ON c.item_id = m.item_id
            WHERE c.user_name = ?
        `;
        const [rows] = await db.promise().query(sql, [username]);
        return rows;
    }
};