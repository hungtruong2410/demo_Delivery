// controllers/userController.js
require('dotenv').config(); // <-- THÊM VÀO ĐẦU FILE
const connection = require('../db.js');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // <-- THÊM VÀO

// --- Biến global cho giỏ hàng (Giữ nguyên như file gốc) ---
let citems = [];
let citemdetails = [];
let item_in_cart = 0;
// --------------------------------------------------------

// ... (Giữ nguyên các hàm từ renderIndexPage đến signInUser) ...
//
function renderIndexPage(req, res) { res.render("index"); }
function renderSignUpPage(req, res) { res.render("signup"); }
function signUpUser(req, res) {
  const { name, address, email, mobile, password } = req.body;
  // LƯU Ý: Code gốc của bạn lưu mật khẩu dạng văn bản thuần
  // Đây là lỗ hổng bảo mật. Bạn nên dùng 'bcrypt' như tôi đã đề xuất trước đó.
  connection.query(
    "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
    [name, address, email, password, mobile],
    function (error, results) {
      if (error) { console.log(error); } 
      else { res.render("signin"); }
    }
  );
}
function renderSignInPage(req, res) { res.render("signin"); }
function signInUser(req, res) {
  const { email, password } = req.body;
  connection.query(
    "SELECT user_id, user_name, user_email, user_password FROM users WHERE user_email = ?",
    [email],
    function (error, results) {
      // LƯU Ý: So sánh mật khẩu thuần
      if (error || !results.length || results[0].user_password !== password) {
        res.render("signin");
      } else {
        const { user_id, user_name } = results[0];
        res.cookie("cookuid", user_id);
        res.cookie("cookuname", user_name);
        res.clearCookie("is_admin");
        res.redirect("/homepage");
      }
    }
  );
}

// ... (Giữ nguyên renderHomePage, renderCart, updateCart, getItemDetails) ...
//
function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("homepage", {
              username: userName,
              userid: userId,
              items: results,
              isAdmin: req.cookies?.is_admin === "1",
            });
          }
        });
      } else { res.render("signin"); }
    }
  );
}
function renderCart(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("cart", {
          username: userName,
          userid: userId,
          items: citemdetails,
          item_count: item_in_cart,
        });
      } else { res.render("signin"); }
    }
  );
}
function updateCart(req, res) {
  const cartItems = req.body.cart;
  const uniqueItems = [...new Set(cartItems)];
  getItemDetails(uniqueItems, uniqueItems.length);
  // Phản hồi JSON để báo cho client biết đã xong (Tùy chọn)
  res.json({ success: true, count: item_in_cart });
}
function getItemDetails(citems_ids, size) {
  citems = citems_ids; // Cập nhật global citems
  citemdetails = []; // Reset
  item_in_cart = 0;
  
  if (citems_ids.length === 0) {
    item_in_cart = 0;
    return;
  }
  
  // Dùng counter để biết khi nào xong
  let itemsProcessed = 0;
  citems_ids.forEach((item) => {
    connection.query(
      "SELECT * FROM menu WHERE item_id = ?",
      [item],
      function (error, results_item) {
        itemsProcessed++;
        if (!error && results_item.length) {
          citemdetails.push(results_item[0]);
        }
        if (itemsProcessed === citems_ids.length) {
           item_in_cart = size; // Cập nhật số lượng
        }
      }
    );
  });
}

// === HÀM THANH TOÁN MỚI (SỬA LỖI) ===

// [HÀM MỚI] Bước 1: Tạo phiên thanh toán Stripe
function createCheckoutSession(req, res) {
  const { cart } = req.body; // Lấy giỏ hàng {id, quantity} từ cart.ejs
  
  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng rỗng' });
  }

  // 1. Lấy ID và Số lượng
  const itemIds = cart.map(item => item.id);
  const quantities = cart.reduce((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});

  // 2. Lấy chi tiết sản phẩm từ DB
  const sql = "SELECT * FROM menu WHERE item_id IN (?)";
  connection.query(sql, [itemIds], async function (error, itemsFromDB) {
    if (error || !itemsFromDB.length) {
      console.log(error);
      return res.status(500).json({ error: 'Không thể lấy thông tin sản phẩm' });
    }

    try {
      // 3. Chuyển đổi giỏ hàng sang định dạng của Stripe
      const line_items = itemsFromDB.map(item => {
        const quantity = quantities[item.item_id];
        return {
          price_data: {
            currency: 'inr', // (Đã sửa ở lượt trước)
            product_data: {
              name: item.item_name,
              // images: [...] // (Vẫn vô hiệu hóa)
            },
            
            // === SỬA LỖI Ở ĐÂY ===
            // Chuyển Rupee sang Paise (ví dụ: 40 INR -> 4000 Paise)
            unit_amount: item.item_price * 100, 
            // ====================

          },
          quantity: quantity,
        };
      });

      // 4. Lưu giỏ hàng vào cookie để dùng ở bước 3
      res.cookie('cart_for_payment', JSON.stringify(cart), { httpOnly: true, maxAge: 600000 }); // 10 phút

      // 5. Tạo phiên thanh toán
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: line_items,
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/payment-success`,
        cancel_url: `${req.protocol}://${req.get('host')}/cart`,
      });

      res.json({ id: session.id });

    } catch (stripeError) {
      console.error("Lỗi tạo phiên Stripe:", stripeError);
      res.status(500).json({ error: 'Lỗi server khi tạo thanh toán' });
    }
  });
}

// [HÀM MỚI] Bước 2: Lưu đơn hàng sau khi thanh toán thành công
function saveOrderAfterPayment(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const cartString = req.cookies.cart_for_payment; // Lấy giỏ hàng từ cookie

  if (!userId || !userName) return res.render("signin");
  if (!cartString) {
    console.log("Lỗi: Không tìm thấy giỏ hàng sau khi thanh toán.");
    // Vẫn render confirmation vì khách đã trả tiền
    return res.render("confirmation", { username: userName, userid: userId });
  }

  const cart = JSON.parse(cartString); // [{id, quantity}]
  
  // Lấy chi tiết giá từ DB
  const itemIds = cart.map(item => item.id);
  const quantities = cart.reduce((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});

  const sql = "SELECT item_id, item_price FROM menu WHERE item_id IN (?)";
  connection.query(sql, [itemIds], function (error, itemsFromDB) {
    if (error) {
      console.log(error);
      return res.status(500).send("Lỗi khi lưu đơn hàng.");
    }
    
    const currDate = new Date();
    let itemsProcessed = 0;
    
    // Dùng counter để biết khi nào xong
    itemsFromDB.forEach((item) => {
      const quantity = quantities[item.item_id];
      const price = item.item_price;
      
      connection.query(
        "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
        [
          uuidv4(),
          userId,
          item.item_id,
          quantity,
          price * quantity, // Tính tổng giá
          currDate,
        ],
        function (error, results) {
          itemsProcessed++;
          if (error) console.log(error);
          
          // Khi đã insert xong
          if (itemsProcessed === itemsFromDB.length) {
            // Xóa cookie giỏ hàng
            res.clearCookie('cart_for_payment');
            
            // Xóa giỏ hàng global (nếu người dùng quay lại /cart)
            citems = [];
            citemdetails = [];
            item_in_cart = 0;
            
            // Hiển thị xác nhận
            res.render("confirmation", { username: userName, userid: userId });
          }
        }
      );
    });
  });
}

// [HÀM MỚI] Bước 3: Người dùng hủy thanh toán
function paymentCancel(req, res) {
  // Người dùng đã nhấp hủy trên trang Stripe, đưa họ về giỏ hàng
  res.redirect("/cart");
}


// ... (Giữ nguyên các hàm từ renderConfirmationPage đến logout) ...
//
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("confirmation", { username: userName, userid: userId });
      } else { res.render("signin"); }
    }
  );
}
function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name, user_address, user_email, user_mobileno FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, resultUser) {
      if (!error && resultUser.length) {
        connection.query(
          "SELECT order_dispatch.order_id, order_dispatch.user_id, order_dispatch.quantity, order_dispatch.price, order_dispatch.datetime, menu.item_id, menu.item_name, menu.item_img FROM order_dispatch, menu WHERE order_dispatch.user_id = ? AND menu.item_id = order_dispatch.item_id ORDER BY order_dispatch.datetime DESC",
          [userId],
          function (error, results) {
            if (!error) {
              res.render("myorders", {
                userDetails: resultUser,
                items: results,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else { res.render("signin"); }
    }
  );
}
function renderSettingsPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("settings", {
          username: userName,
          userid: userId,
          item_count: item_in_cart,
        });
      }
    }
  );
}
function updateAddress(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const address = req.body.address;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_address = ? WHERE user_id = ?",
          [address, userId],
          function (error, results) {
            if (!error) {
              res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else { res.render("signin"); }
    }
  );
}
function updateContact(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const mobileno = req.body.mobileno;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_mobileno = ? WHERE user_id = ?",
          [mobileno, userId],
          function (error, results) {
            if (!error) {
              res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else { res.render("signin"); }
    }
  );
}
function updatePassword(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const oldPassword = req.body.old_password;
  const newPassword = req.body.new_password;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ? AND user_password = ?",
    [userId, userName, oldPassword],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_password = ? WHERE user_id = ?",
          [newPassword, userId],
          function (error, results) {
            if (!error) {
              res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else { res.render("signin"); }
    }
  );
}
function logout(req, res) {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.clearCookie("is_admin");
  return res.redirect("/signin");
}

// Export tất cả các hàm, BAO GỒM CÁC HÀM MỚI
module.exports = {
  renderIndexPage,
  renderSignUpPage,
  signUpUser,
  renderSignInPage,
  signInUser,
  renderHomePage,
  renderCart,
  updateCart,
  // checkout: checkout, // <-- HÀM CHECKOUT CŨ ĐÃ BỊ XÓA
  
  // HÀM MỚI
  createCheckoutSession,
  saveOrderAfterPayment,
  paymentCancel,

  renderConfirmationPage,
  renderMyOrdersPage,
  renderSettingsPage,
  updateAddress,
  updateContact,
  updatePassword,
  logout
};