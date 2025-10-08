// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql2");
const fs = require("fs");           // (nếu chưa có ở đầu file thì thêm)
const path = require("path");       // <— THÊM DÒNG NÀY
// Initialize Express App
const app = express();
function safeFilename(name) {       // <— THÊM HÀM NÀY (đặt ngay sau require)
  return String(name)
    .replace(/[\\/:"*?<>|]+/g, "_")
    .replace(/\s+/g, "_");
}
// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});
function requireAdmin(req, res, next) {
  // chỉ cho admin (cookie is_admin=1) được gọi các route admin-protected
  if (req.cookies?.is_admin !== "1") {
    return res.status(403).send("Forbidden: Admin only");
  }
  next();
}

// Database Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hung24102004",
  database: "foodorderingwesitedb",
  port : 3306
});
connection.connect();

/*****************************  User-End Portal ***************************/

// Routes for User Sign-up, Sign-in, Home Page, Cart, Checkout, Order Confirmation, My Orders, and Settings
app.get("/", renderIndexPage);
app.get("/signup", renderSignUpPage);
app.post("/signup", signUpUser);
app.get("/signin", renderSignInPage);
app.post("/signin", signInUser);
app.get("/homepage", renderHomePage);
app.get("/cart", renderCart);
app.post("/cart", updateCart);
app.post("/checkout", checkout);
app.get("/confirmation", renderConfirmationPage);
app.get("/myorders", renderMyOrdersPage);
app.get("/settings", renderSettingsPage);
app.post("/address", updateAddress);
app.post("/contact", updateContact);
app.post("/password", updatePassword);

/***************************************** Admin End Portal ********************************************/
// Routes for Admin Sign-in, Admin Homepage, Adding Food, Viewing and Dispatching Orders, Changing Price, and Logout
// Admin
app.get("/admin_signin", renderAdminSignInPage);
app.post("/admin_signin", adminSignIn);
app.get("/adminHomepage", renderAdminHomepage);

app.get("/admin_addFood", renderAddFoodPage);
app.post("/admin_addFood", addFood);

app.get("/admin_view_dispatch_orders", renderViewDispatchOrdersPage);
app.post("/admin_view_dispatch_orders", dispatchOrders);

app.get("/admin_change_price", renderChangePricePage);
app.post("/admin_change_price", changePrice);

// DELETE PAGE riêng (chỉ xem để xoá)
app.get("/admin_deleteFood", requireAdmin, renderDeleteFoodPage);

// PRODUCTS: xem danh sách & xem chi tiết (không xoá ở đây)
app.get("/admin_products", requireAdmin, renderAdminProducts);
app.get("/admin_products/:id", requireAdmin, renderAdminProductDetail);

// EDIT FORM + UPDATE SUBMIT (THÊM MỚI)
app.get("/admin_products/:id/edit", requireAdmin, renderAdminProductEdit);
app.post("/admin_products/:id/edit", requireAdmin, updateAdminProduct);


app.get("/logout", logout);

/***************************** Route Handlers ***************************/

// Index Page
function renderIndexPage(req, res) {
  res.render("index");
}

// User Sign-up
function renderSignUpPage(req, res) {
  res.render("signup");
}

function signUpUser(req, res) {
  const { name, address, email, mobile, password } = req.body;
  connection.query(
    "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
    [name, address, email, password, mobile],
    function (error, results) {
      if (error) {
        console.log(error);
      } else {
        res.render("signin");
      }
    }
  );
}

// User Sign-in

function renderSignInPage(req, res) {
  res.render("signin");
}

function signInUser(req, res) {
  const { email, password } = req.body;
  connection.query(
    "SELECT user_id, user_name, user_email, user_password FROM users WHERE user_email = ?",
    [email],
    function (error, results) {
      if (error || !results.length || results[0].user_password !== password) {
        res.render("signin");
      } else {
        const { user_id, user_name } = results[0];
        res.cookie("cookuid", user_id);
        res.cookie("cookuname", user_name);
        res.clearCookie("is_admin");                 // <-- THÊM DÒNG NÀY
        res.redirect("/homepage");
      }
    }
  );
}

// Render Home Page
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
              isAdmin: req.cookies?.is_admin === "1", // <-- truyền isAdmin xuống homepage để hiện nút delete
            });
          }
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Render Cart Page
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
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Cart
function updateCart(req, res) {
  const cartItems = req.body.cart;
  const uniqueItems = [...new Set(cartItems)];

  // Function to fetch details of items in the cart
  getItemDetails(uniqueItems, uniqueItems.length);

  // Update cart logic if necessary
}

// Function to fetch details of items in the cart
let citems = [];
let citemdetails = [];
let item_in_cart = 0;
function getItemDetails(citems, size) {
  citems.forEach((item) => {
    connection.query(
      "SELECT * FROM menu WHERE item_id = ?",
      [item],
      function (error, results_item) {
        if (!error && results_item.length) {
          citemdetails.push(results_item[0]);
        }
      }
    );
  });
  item_in_cart = size;
}

// Checkout
function checkout(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        const { itemid, quantity, subprice } = req.body;
        const userid = userId;
        const currDate = new Date();

        if (
          Array.isArray(itemid) &&
          Array.isArray(quantity) &&
          Array.isArray(subprice)
        ) {
          itemid.forEach((item, index) => {
            if (quantity[index] != 0) {
              connection.query(
                "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  uuidv4(),
                  userid,
                  item,
                  quantity[index],
                  subprice[index] * quantity[index],
                  currDate,
                ],
                function (error, results, fields) {
                  if (error) {
                    console.log(error);
                    res.sendStatus(500);
                  }
                }
              );
            }
          });
        } else {
          if (quantity != 0) {
            connection.query(
              "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
              [
                uuidv4(),
                userid,
                itemid,
                quantity,
                subprice * quantity,
                currDate,
              ],
              function (error, results, fields) {
                if (error) {
                  console.log(error);
                  res.sendStatus(500);
                }
              }
            );
          }
        }

        citems = [];
        citemdetails = [];
        item_in_cart = 0;
        getItemDetails(citems, 0);
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
}

// Render Confirmation Page
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
}

// Render My Orders Page
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
      } else {
        res.render("signin");
      }
    }
  );
}

// Render Settings Page
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
// Update Address
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
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Contact
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
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Password
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
      } else {
        res.render("signin");
      }
    }
  );
}

// Admin Sign-in

function renderAdminSignInPage(req, res) {
  res.render("admin_signin");
}

function adminSignIn(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_email = ? AND admin_password = ?",
    [email, password],
    function (error, results) {
      if (error || !results.length) {
        res.render("admin_signin");
      } else {
        const { admin_id, admin_name } = results[0];
        res.cookie("cookuid", admin_id);
        res.cookie("cookuname", admin_name);
        res.cookie("is_admin", "1");                 // <-- THÊM DÒNG NÀY
        res.redirect("/adminHomepage");
      }
    }
  );
}
// GET /adminHomepage
function renderAdminHomepage(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  // xác thực admin đăng nhập
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    (error, rows) => {
      if (error) return res.status(500).send("Database error");
      if (!rows.length) return res.render("admin_signin");

      // lấy menu để render bảng quản lý
      connection.query("SELECT * FROM menu ORDER BY item_id DESC", (e2, menu) => {
        if (e2) return res.status(500).send("DB error");
        return res.render("adminHomepage", {
          username: adminName,
          userid: adminId,
          items: menu,     // ★ truyền danh sách món
          isAdmin: true    // để view biết là admin
        });
      });
    }
  );
}


// Render Add Food Page
function renderAddFoodPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("admin_addFood", {
          username: userName,
          userid: userId,
          items: results,
        });
      } else {
        res.render("admin_signin");
      }
    }
  );
}
// Render Delete Food Page
function renderDeleteFoodPage(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  // Xác thực admin giống các trang admin khác
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    (error, results) => {
      if (error) return res.status(500).send("Database error");
      if (!results.length) return res.render("admin_signin");

      // Lấy danh sách món để hiển thị bảng xoá
      connection.query("SELECT * FROM menu ORDER BY item_id DESC", (e2, menu) => {
        if (e2) return res.status(500).send("DB error");

        return res.render("admin_deleteFood", {
          username: adminName,
          userid: adminId,
          items: menu,
        });
      });
    }
  );
}

// Add Food
function addFood(req, res) {
  const { FoodName, FoodType, FoodCategory, FoodServing, FoodCalories, FoodPrice, FoodRating } = req.body;

  if (!req.files) return res.status(400).send("Image was not uploaded");

  const fimage = req.files.FoodImg;
  const ok = ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(fimage.mimetype);
  if (!ok) return res.status(400).send("Chỉ chấp nhận jpg/png/webp");

  const fileName = Date.now() + "_" + safeFilename(fimage.name);
  const savePath = path.join(__dirname, "public", "images", "dish", fileName);

  fimage.mv(savePath, (err) => {
    if (err) return res.status(500).send(err);

    connection.query(
      `INSERT INTO menu
       (item_name, item_type, item_category, item_serving, item_calories, item_price, item_rating, item_img)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        FoodName,
        FoodType,
        FoodCategory,
        FoodServing,
        Number(String(FoodCalories).replace(/[^\d.]/g, "")),
        Number(String(FoodPrice).replace(/[^\d.]/g, "")),
        String(FoodRating).replace(/[^\d]/g, "") || "5",
        fileName,
      ],
      (error) => {
        if (error) return res.status(500).send("DB error");
        return res.redirect("/admin_addFood");
      }
    );
  });
} // <<< HẾT HÀM addFood


app.post("/admin_deleteFood/:id", requireAdmin, (req, res) => {
  const id = req.params.id;

  // 1) Lấy tên ảnh
  connection.query("SELECT item_img FROM menu WHERE item_id = ?", [id], (e, r) => {
    if (e) return res.status(500).send("DB error");
    const img = r?.[0]?.item_img || null;

    // 2) Xoá record DB
    connection.query("DELETE FROM menu WHERE item_id = ?", [id], (err) => {
      if (err) {
        console.error("DELETE menu error:", err);
        return res.status(409).send("Không thể xóa do ràng buộc dữ liệu (đơn hàng tham chiếu).");
      }

      // 3) Xoá file ảnh (nếu có)
      if (!img) return res.redirect("/adminHomepage");
      const onlyName = path.basename(String(img));
      const imgPath  = path.join(__dirname, "public", "images", "dish", onlyName);

      fs.unlink(imgPath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== "ENOENT") {
          console.warn("Không xóa được ảnh:", unlinkErr.message);
        }
        return res.redirect("/adminHomepage");
      });
    });
  });
});

  // Lấy tên file ảnh để xóa trên disk
  

// Render Admin View and Dispatch Orders Page
function renderViewDispatchOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "SELECT * FROM orders ORDER BY datetime",
          function (error, results2) {
            res.render("admin_view_dispatch_orders", {
              username: userName,
              userid: userId,
              orders: results2,
            });
          }
        );
      } else {
        res.render("admin_signin");
      }
    }
  );
}

// Dispatch Orders
function dispatchOrders(req, res) {
  totalOrder = req.body.order_id_s;
  const unique = [...new Set(totalOrder)];
  unique.forEach((orderId) => {
    connection.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [orderId],
      function (error, resultsItem) {
        if (!error && resultsItem.length) {
          const currDate = new Date();
          connection.query(
            "INSERT INTO order_dispatch (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
            [
              resultsItem[0].order_id,
              resultsItem[0].user_id,
              resultsItem[0].item_id,
              resultsItem[0].quantity,
              resultsItem[0].price,
              currDate,
            ],
            function (error, results) {
              if (!error) {
                connection.query(
                  "DELETE FROM orders WHERE order_id = ?",
                  [resultsItem[0].order_id],
                  function (error, results2) {
                    if (error) {
                      res.status(500).send("Something went wrong");
                    }
                  }
                );
              } else {
                res.status(500).send("Something went wrong");
              }
            }
          );
        } else {
          res.status(500).send("Something went wrong");
        }
      }
    );
  });
  connection.query(
    "SELECT * FROM orders ORDER BY datetime",
    function (error, results2_dis) {
      res.render("admin_view_dispatch_orders", {
        username: req.cookies.cookuname,
        orders: results2_dis,
      });
    }
  );
}

// Render Admin Change Price Page
// Render Admin Change Price Page
function renderChangePricePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("admin_change_price", {
              username: userName,
              items: results,
            });
          }
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Change Price
function changePrice(req, res) {
  const item_name = req.body.item_name;
  const new_food_price = req.body.NewFoodPrice;
  connection.query(
    "SELECT item_name FROM menu WHERE item_name = ?",
    [item_name],
    function (error, results1) {
      if (!error && results1.length) {
        connection.query(
          "UPDATE menu SET item_price = ? WHERE item_name = ?",
          [new_food_price, item_name],
          function (error, results2) {
            if (!error) {
              res.render("adminHomepage");
            } else {
              res.status(500).send("Something went wrong");
            }
          }
        );
      } else {
        res.status(500).send("Something went wrong");
      }
    }
  );
}

// ================= ADMIN: Product Edit (GET) =================
function renderAdminProductEdit(req, res) {
  const id = req.params.id;
  const adminId = req.cookies.cookuid;

  connection.query("SELECT admin_id FROM admin WHERE admin_id = ?", [adminId], (e1, r1) => {
    if (e1 || !r1.length) return res.render("admin_signin");

    connection.query("SELECT * FROM menu WHERE item_id = ?", [id], (e2, r2) => {
      if (e2) return res.status(500).send("DB error");
      if (!r2.length) return res.status(404).send("Not found");
      const item = r2[0];
      res.render("admin_product_edit", { item });
    });
  });
}

// ================= ADMIN: Product Edit (POST) =================
// Cho phép đổi text fields; ảnh mới là OPTIONAL
function updateAdminProduct(req, res) {
  const id = req.params.id;

  const {
    item_name,
    item_type,
    item_category,
    item_serving,
    item_calories,
    item_price,
    item_rating
  } = req.body;

  // 1) Nếu có file ảnh mới -> lưu file & set newImgName, nếu không giữ ảnh cũ
  const hasFile = req.files && req.files.item_img;
  const doAfterGetOld = (oldImgName) => {
    const runUpdate = (finalImgName) => {
      connection.query(
        `UPDATE menu SET
           item_name = ?, item_type = ?, item_category = ?,
           item_serving = ?, item_calories = ?, item_price = ?,
           item_rating = ?, item_img = ?
         WHERE item_id = ?`,
        [
          item_name,
          item_type,
          item_category,
          item_serving,
          Number(String(item_calories).replace(/[^\d.]/g, "")),
          Number(String(item_price).replace(/[^\d.]/g, "")),
          String(item_rating).replace(/[^\d]/g, "") || "5",
          finalImgName,
          id
        ],
        (e3) => {
          if (e3) return res.status(500).send("DB error");
          // nếu có ảnh mới thì xóa ảnh cũ (nếu tồn tại)
          if (hasFile && oldImgName && oldImgName !== finalImgName) {
            const oldPath = path.join(__dirname, "public", "images", "dish", path.basename(oldImgName));
            fs.unlink(oldPath, () => {}); // ignore error
          }
          return res.redirect("/admin_products/" + id); // về trang chi tiết (view-only)
        }
      );
    };

    if (!hasFile) {
      // không upload ảnh mới → giữ tên cũ
      runUpdate(oldImgName || "");
    } else {
      const f = req.files.item_img;
      const ok = ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(f.mimetype);
      if (!ok) return res.status(400).send("Chỉ chấp nhận jpg/png/webp");

      const newName = Date.now() + "_" + safeFilename(f.name);
      const savePath = path.join(__dirname, "public", "images", "dish", newName);
      f.mv(savePath, (err) => {
        if (err) return res.status(500).send(err);
        runUpdate(newName);
      });
    }
  };

  // Lấy tên ảnh cũ trước
  connection.query("SELECT item_img FROM menu WHERE item_id = ?", [id], (e2, r2) => {
    if (e2) return res.status(500).send("DB error");
    const oldImg = r2 && r2[0] ? r2[0].item_img : null;
    doAfterGetOld(oldImg);
  });
}

// Logout
function logout(req, res) {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.clearCookie("is_admin");                       // <-- THÊM DÒNG NÀY
  return res.redirect("/signin");
}
// ================= ADMIN: View Products (LIST) =================
function renderAdminProducts(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  // xác thực admin
  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ?",
    [adminId],
    (e1, r1) => {
      if (e1 || !r1.length) return res.render("admin_signin");

      // lấy danh sách sản phẩm (view-only)
      connection.query(
        "SELECT item_id, item_name, item_type, item_category, item_price, item_img FROM menu ORDER BY item_id DESC",
        (e2, items) => {
          if (e2) return res.status(500).send("DB error");
          res.render("admin_products", { username: adminName, items });
        }
      );
    }
  );
}

// ================= ADMIN: Product Detail (VIEW ONLY) =================
function renderAdminProductDetail(req, res) {
  const id = req.params.id;
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  // xác thực admin
  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ?",
    [adminId],
    (e1, r1) => {
      if (e1 || !r1.length) return res.render("admin_signin");

      // lấy chi tiết 1 sản phẩm
      connection.query("SELECT * FROM menu WHERE item_id = ?", [id], (e2, r2) => {
        if (e2) return res.status(500).send("DB error");
        const item = r2 && r2[0] ? r2[0] : null;
        res.render("admin_product_detail", { username: adminName, item });
      });
    }
  );
}

module.exports = app;
