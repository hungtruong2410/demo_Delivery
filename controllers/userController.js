// controllers/userController.js
require('dotenv').config();
const connection = require('../db.js');
const { v4: uuidv4 } = require('uuid');

// ---- Stripe: lazy init + guard (không crash nếu thiếu key) ----
const Stripe = require('stripe');
const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;
function getStripe() {
  if (!stripeSecret) return null;        // Thiếu key -> trả null, không khởi tạo
  if (!stripe) stripe = Stripe(stripeSecret); // Lazy init 1 lần
  return stripe;
}
// ---------------------------------------------------------------

// --- Biến global cho giỏ hàng (giữ nguyên như code gốc) ---
let citems = [];
let citemdetails = [];
let item_in_cart = 0;
// --------------------------------------------------------

// ========== Auth / Index ==========
function renderIndexPage(req, res) { res.render("index"); }
function renderSignUpPage(req, res) { res.render("signup"); }

function signUpUser(req, res) {
  const { name, address, email, mobile, password } = req.body;

  // NOTE: Mật khẩu đang lưu plain text (khuyến nghị chuyển sang bcrypt sau)
  connection.query(
    "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
    [name, address, email, password, mobile],
    function (error) {
      if (error) {
        console.log(error);
        return res.status(500).render("signup");
      }
      return res.render("signin");
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
      if (error || !results.length || results[0].user_password !== password) {
        return res.render("signin");
      }
      const { user_id, user_name } = results[0];
      res.cookie("cookuid", user_id);
      res.cookie("cookuname", user_name);
      res.clearCookie("is_admin");
      return res.redirect("/homepage");
    }
  );
}

// ========== Home / Cart ==========
function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (err2, items) {
          if (!err2) {
            return res.render("homepage", {
              username: userName,
              userid: userId,
              items: items,
              isAdmin: req.cookies?.is_admin === "1",
            });
          }
          return res.status(500).render("signin");
        });
      } else { return res.render("signin"); }
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
        return res.render("cart", {
          username: userName,
          userid: userId,
          items: citemdetails,
          item_count: item_in_cart,
        });
      } else { return res.render("signin"); }
    }
  );
}

function updateCart(req, res) {
  const cartItems = req.body.cart || [];
  const uniqueItems = [...new Set(cartItems)];
  getItemDetails(uniqueItems, uniqueItems.length);
  return res.json({ success: true, count: item_in_cart });
}

function getItemDetails(citems_ids, size) {
  citems = citems_ids;
  citemdetails = [];
  item_in_cart = 0;

  if (!Array.isArray(citems_ids) || citems_ids.length === 0) {
    item_in_cart = 0;
    return;
  }

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
          item_in_cart = size;
        }
      }
    );
  });
}

// ========== Thanh toán (Stripe) ==========
// Bước 1: Tạo checkout session
async function createCheckoutSession(req, res) {
  const s = getStripe();
  if (!s) {
    // Không có key -> không cho thanh toán, nhưng KHÔNG làm app crash
    return res.status(503).json({ error: 'Payments disabled (missing STRIPE_SECRET_KEY)' });
  }

  const { cart } = req.body; // [{ id, quantity }]
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng rỗng' });
  }

  const itemIds = cart.map(item => item.id);
  const quantities = cart.reduce((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});

  const sql = "SELECT * FROM menu WHERE item_id IN (?)";
  connection.query(sql, [itemIds], async function (error, itemsFromDB) {
    if (error || !itemsFromDB.length) {
      console.log(error);
      return res.status(500).json({ error: 'Không thể lấy thông tin sản phẩm' });
    }

    try {
      const line_items = itemsFromDB.map(item => {
        const quantity = quantities[item.item_id] || 1;
        return {
          price_data: {
            currency: 'inr',
            product_data: { name: item.item_name },
            unit_amount: Math.round(Number(item.item_price) * 100), // INR -> paise
          },
          quantity: quantity,
        };
      });

      // Lưu giỏ hàng tạm
      res.cookie('cart_for_payment', JSON.stringify(cart), { httpOnly: true, maxAge: 10 * 60 * 1000 });

      const session = await s.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/payment-success`,
        cancel_url: `${req.protocol}://${req.get('host')}/cart`,
      });

      return res.json({ id: session.id });
    } catch (stripeError) {
      console.error("Lỗi tạo phiên Stripe:", stripeError);
      return res.status(500).json({ error: 'Lỗi server khi tạo thanh toán' });
    }
  });
}

// Bước 2: Lưu đơn sau khi thanh toán thành công
function saveOrderAfterPayment(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const cartString = req.cookies.cart_for_payment;

  if (!userId || !userName) return res.render("signin");
  if (!cartString) {
    console.log("Lỗi: Không tìm thấy giỏ hàng sau khi thanh toán.");
    return res.render("confirmation", { username: userName, userid: userId });
  }

  const cart = JSON.parse(cartString);
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

    itemsFromDB.forEach((item) => {
      const quantity = quantities[item.item_id] || 1;
      const price = Number(item.item_price) || 0;

      connection.query(
        "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
        [uuidv4(), userId, item.item_id, quantity, price * quantity, currDate],
        function (errInsert) {
          itemsProcessed++;
          if (errInsert) console.log(errInsert);

          if (itemsProcessed === itemsFromDB.length) {
            res.clearCookie('cart_for_payment');
            citems = [];
            citemdetails = [];
            item_in_cart = 0;
            return res.render("confirmation", { username: userName, userid: userId });
          }
        }
      );
    });
  });
}

// Bước 3: Hủy thanh toán
function paymentCancel(req, res) { return res.redirect("/cart"); }

// ========== Pages khác ==========
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        return res.render("confirmation", { username: userName, userid: userId });
      } else { return res.render("signin"); }
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
          function (err2, results) {
            if (!err2) {
              return res.render("myorders", {
                userDetails: resultUser,
                items: results,
                item_count: item_in_cart,
              });
            }
            return res.status(500).render("signin");
          }
        );
      } else { return res.render("signin"); }
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
        return res.render("settings", {
          username: userName,
          userid: userId,
          item_count: item_in_cart,
        });
      }
      return res.render("signin");
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
          function (err2) {
            if (!err2) {
              return res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
            return res.status(500).render("signin");
          }
        );
      } else { return res.render("signin"); }
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
          function (err2) {
            if (!err2) {
              return res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
            return res.status(500).render("signin");
          }
        );
      } else { return res.render("signin"); }
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
          function (err2) {
            if (!err2) {
              return res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
            return res.status(500).render("signin");
          }
        );
      } else { return res.render("signin"); }
    }
  );
}

function logout(req, res) {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.clearCookie("is_admin");
  return res.redirect("/signin");
}

// ====== Export ======
module.exports = {
  renderIndexPage,
  renderSignUpPage,
  signUpUser,
  renderSignInPage,
  signInUser,
  renderHomePage,
  renderCart,
  updateCart,
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
