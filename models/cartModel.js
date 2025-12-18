// FILE: models/cartModel.js
const db = require('../db'); 

module.exports = {
    // 1. Thêm vào giỏ (Giữ nguyên)
    addToCart: (username, itemId, quantity) => {
        return new Promise((resolve, reject) => {
            const checkSql = "SELECT * FROM cart WHERE user_name = ? AND item_id = ?";
            db.query(checkSql, [username, itemId], (err, result) => {
                if (err) return reject(err);
                if (result.length > 0) {
                    const updateSql = "UPDATE cart SET quantity = quantity + ? WHERE user_name = ? AND item_id = ?";
                    db.query(updateSql, [quantity, username, itemId], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                } else {
                    const insertSql = "INSERT INTO cart (user_name, item_id, quantity) VALUES (?, ?, ?)";
                    db.query(insertSql, [username, itemId, quantity], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                }
            });
        });
    },

    // 2. Lấy danh sách (ĐÃ SỬA: Thêm m.item_id để thanh toán được)
    getCartByUser: (username) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.cart_id, c.quantity, m.item_id, m.item_name, m.item_price, m.item_img, 
                       (c.quantity * m.item_price) as total_price
                FROM cart c
                JOIN menu m ON c.item_id = m.item_id
                WHERE c.user_name = ?
            `;
            db.query(sql, [username], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    // 3. Hàm Xoá món khỏi giỏ (MỚI)
    deleteFromCart: (cartId) => {
        return new Promise((resolve, reject) => {
            const sql = "DELETE FROM cart WHERE cart_id = ?";
            db.query(sql, [cartId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
};