const connection = require('../db.js');
const fs = require('fs');
const path = require('path');
const { safeFilename } = require('../utils/helpers.js'); // <-- Lấy helper

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
        res.cookie("is_admin", "1");
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
  
  // ★★★ SỬA LẠI ĐƯỜNG DẪN: Thêm ".." để đi ra khỏi thư mục 'controllers'
  const savePath = path.join(__dirname, "..", "public", "images", "dish", fileName);

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
}

// Delete Food (chuyển từ app.post)
function deleteFood(req, res) {
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
      
      // ★★★ SỬA LẠI ĐƯỜNG DẪN: Thêm ".."
      const imgPath  = path.join(__dirname, "..", "public", "images", "dish", onlyName);

      fs.unlink(imgPath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== "ENOENT") {
          console.warn("Không xóa được ảnh:", unlinkErr.message);
        }
        return res.redirect("/adminHomepage");
      });
    });
  });
}
  
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
  const totalOrder = req.body.order_id_s; // Lưu ý: 'totalOrder' đang là biến global ngầm
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
        res.render("signin"); // Chỗ này nên là admin_signin?
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
              res.render("adminHomepage"); // Nên redirect về /adminHomepage
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
          
          if (hasFile && oldImgName && oldImgName !== finalImgName) {
            // ★★★ SỬA LẠI ĐƯỜNG DẪN: Thêm ".."
            const oldPath = path.join(__dirname, "..", "public", "images", "dish", path.basename(oldImgName));
            fs.unlink(oldPath, () => {}); // ignore error
          }
          return res.redirect("/admin_products/" + id);
        }
      );
    };

    if (!hasFile) {
      runUpdate(oldImgName || "");
    } else {
      const f = req.files.item_img;
      const ok = ["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(f.mimetype);
      if (!ok) return res.status(400).send("Chỉ chấp nhận jpg/png/webp");

      const newName = Date.now() + "_" + safeFilename(f.name);
      
      // ★★★ SỬA LẠI ĐƯỜNG DẪN: Thêm ".."
      const savePath = path.join(__dirname, "..", "public", "images", "dish", newName);
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

// ================= ADMIN: View Products (LIST) =================
function renderAdminProducts(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ?",
    [adminId],
    (e1, r1) => {
      if (e1 || !r1.length) return res.render("admin_signin");

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

  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ?",
    [adminId],
    (e1, r1) => {
      if (e1 || !r1.length) return res.render("admin_signin");

      connection.query("SELECT * FROM menu WHERE item_id = ?", [id], (e2, r2) => {
        if (e2) return res.status(500).send("DB error");
        const item = r2 && r2[0] ? r2[0] : null;
        res.render("admin_product_detail", { username: adminName, item });
      });
    }
  );
}

// ================= EXPORT TẤT CẢ CÁC HÀM =================
module.exports = {
  renderAdminSignInPage,
  adminSignIn,
  renderAdminHomepage,
  renderAddFoodPage,
  renderDeleteFoodPage,
  addFood,
  deleteFood,
  renderViewDispatchOrdersPage,
  dispatchOrders,
  renderChangePricePage,
  changePrice,
  renderAdminProductEdit,
  updateAdminProduct,
  renderAdminProducts,
  renderAdminProductDetail
};