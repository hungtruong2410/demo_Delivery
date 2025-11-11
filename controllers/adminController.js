// controllers/adminController.js
const fs = require('fs');
const path = require('path');
const { safeFilename } = require('../utils/helpers');
const Admin = require('../models/adminModel');
const Menu = require('../models/menuModel');
// const Order = require('../models/orderModel'); // nếu cần, hiện tại dùng db trực tiếp
const db = require('../db');

/* =========================
   AUTH
========================= */
exports.renderAdminSignInPage = (req, res) => res.render('admin_signin');

exports.adminSignIn = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.login(email, password);
  if (!admin) return res.render('admin_signin');

  res.cookie('cookuid', admin.admin_id);
  res.cookie('cookuname', admin.admin_name);
  res.cookie('is_admin', '1', {
    path: '/',           // cookie dùng cho mọi URL
    httpOnly: true,
    sameSite: 'lax',
    // secure: true,      // bật khi dùng HTTPS
    maxAge: 24 * 60 * 60 * 1000
  });

  return res.redirect('/admin/adminHomepage');
};

/* =========================
   HOMEPAGE
========================= */
exports.renderAdminHomepage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  const menu = await Menu.getAll();
  return res.render('adminHomepage', {
    username: cookuname,
    userid: cookuid,
    items: menu,
    isAdmin: true
  });
};

/* =========================
   ADD FOOD
========================= */
exports.renderAddFoodPage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  return res.render('admin_addFood', { username: cookuname, userid: cookuid });
};

exports.addFood = async (req, res) => {
  try {
    const { FoodName, FoodType, FoodCategory, FoodServing, FoodCalories, FoodPrice, FoodRating } = req.body;

    if (!req.files) return res.status(400).send('Image was not uploaded');
    const fimage = req.files.FoodImg;
    const ok = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(fimage.mimetype);
    if (!ok) return res.status(400).send('Chỉ chấp nhận jpg/png/webp');

    const fileName = Date.now() + '_' + safeFilename(fimage.name);
    const savePath = path.join(__dirname, '..', 'public', 'images', 'dish', fileName);
    await fimage.mv(savePath);

    await Menu.add({
      item_name: FoodName,
      item_type: FoodType,
      item_category: FoodCategory,
      item_serving: FoodServing,
      item_calories: Number(String(FoodCalories).replace(/[^\d.]/g, '')),
      item_price: Number(String(FoodPrice).replace(/[^\d.]/g, '')),
      item_rating: String(FoodRating).replace(/[^\d]/g, '') || '5',
      item_img: fileName
    });

    return res.redirect('/admin/admin_addFood');
  } catch (err) {
    console.error('[addFood]', err);
    return res.status(500).send('DB error');
  }
};

/* =========================
   DELETE FOOD
========================= */
exports.renderDeleteFoodPage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  const menu = await Menu.getAll();
  return res.render('admin_deleteFood', { username: cookuname, userid: cookuid, items: menu });
};

exports.deleteFood = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await Menu.getById(id);
    if (!item) return res.status(404).send('Item not found');

    await Menu.delete(id);

    if (item.item_img) {
      const imgPath = path.join(__dirname, '..', 'public', 'images', 'dish', path.basename(item.item_img));
      fs.unlink(imgPath, (err) => {
        if (err && err.code !== 'ENOENT') console.warn('[deleteFood] Không xóa được ảnh:', err?.message);
      });
    }

    return res.redirect('/admin/adminHomepage');
  } catch (err) {
    console.error('[deleteFood]', err);
    return res.status(500).send('DB error');
  }
};

/* =========================
   VIEW / DISPATCH ORDERS
========================= */
// Trang danh sách đơn chờ + checkbox
exports.renderViewDispatchOrdersPage = async (req, res) => {
  try {
    const { cookuid, cookuname } = req.cookies;
    const admin = await Admin.verify(cookuid, cookuname);
    if (!admin) return res.render('admin_signin');

    const [rows] = await db.promise().query(
      'SELECT order_id, user_id, item_id, quantity, price, datetime FROM orders ORDER BY datetime DESC'
    );

    return res.render('admin_view_dispatch_orders', {
      username: cookuname,
      userid: cookuid,
      orders: rows
    });
  } catch (e) {
    console.error('[renderViewDispatchOrdersPage]', e);
    return res.status(500).send('DB error');
  }
};

// Dispatch: MOVE orders -> order_dispatch (đúng schema SQL bạn cung cấp)
exports.dispatchOrders = async (req, res) => {
  const conn = db.promise();
  try {
    const raw =
      req.body.orderIds ?? req.body.ids ?? req.body.orderId ??
      req.body.order_id_s ?? req.body['orderIds[]'] ?? req.body['ids[]'] ?? req.body['orderId[]'];

    let ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    ids = [...new Set(ids.map(String).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ ok: false, moved: 0, error: 'No order IDs' });

    await conn.beginTransaction();

    // 1) Insert sang order_dispatch
    const insertSql = `
      INSERT INTO order_dispatch (order_id, user_id, item_id, quantity, price, datetime)
      SELECT order_id,      user_id,  item_id,  quantity,  price,  datetime
      FROM orders
      WHERE order_id IN (?)
    `;
    const [ins] = await conn.query(insertSql, [ids]);

    // 2) Xóa khỏi orders
    const [del] = await conn.query(`DELETE FROM orders WHERE order_id IN (?)`, [ids]);

    const moved = del.affectedRows || ins.affectedRows || 0;
    if (!moved) {
      await conn.rollback();
      return res.status(409).json({ ok: false, moved: 0, error: 'No matching orders to move' });
    }

    await conn.commit();
    return res.json({ ok: true, moved, mode: 'move' });
  } catch (err) {
    try { await db.promise().rollback(); } catch {}
    console.error('[DISPATCH_ERROR]', err);
    return res.status(500).json({ ok: false, moved: 0, error: err.message || 'Server error' });
  }
};

/* =========================
   CHANGE PRICE
========================= */
exports.renderChangePricePage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  const items = await Menu.getAll();
  return res.render('admin_change_price', { username: cookuname, items });
};

exports.changePrice = async (req, res) => {
  const { item_name, NewFoodPrice } = req.body;
  try {
    await Menu.changePrice(item_name, NewFoodPrice);
    return res.redirect('/admin/adminHomepage');
  } catch (err) {
    console.error('[changePrice]', err);
    return res.status(500).send('Something went wrong');
  }
};

/* =========================
   PRODUCTS
========================= */
exports.renderAdminProducts = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  const items = await Menu.getAll();
  return res.render('admin_products', { username: cookuname, items });
};

exports.renderAdminProductDetail = async (req, res) => {
  const { id } = req.params;
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');

  const item = await Menu.getById(id);
  return res.render('admin_product_detail', { username: cookuname, item });
};

exports.renderAdminProductEdit = async (req, res) => {
  const { id } = req.params;
  const admin = await Admin.verify(req.cookies.cookuid, req.cookies.cookuname);
  if (!admin) return res.render('admin_signin');

  const item = await Menu.getById(id);
  return res.render('admin_product_edit', { item });
};

exports.updateAdminProduct = async (req, res) => {
  const id = req.params.id;
  const {
    item_name, item_type, item_category,
    item_serving, item_calories, item_price, item_rating
  } = req.body;

  try {
    const old = await Menu.getById(id);
    if (!old) return res.status(404).send('Not found');

    let finalImg = old.item_img;

    if (req.files && req.files.item_img) {
      const f = req.files.item_img;
      const ok = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(f.mimetype);
      if (!ok) return res.status(400).send('Chỉ chấp nhận jpg/png/webp');

      const newName = Date.now() + '_' + safeFilename(f.name);
      const savePath = path.join(__dirname, '..', 'public', 'images', 'dish', newName);
      await f.mv(savePath);
      finalImg = newName;

      // Xoá ảnh cũ (best-effort)
      const oldPath = path.join(__dirname, '..', 'public', 'images', 'dish', path.basename(old.item_img || ''));
      fs.unlink(oldPath, () => {});
    }

    await Menu.update(id, {
      item_name, item_type, item_category,
      item_serving,
      item_calories: Number(String(item_calories).replace(/[^\d.]/g, '')),
      item_price: Number(String(item_price).replace(/[^\d.]/g, '')),
      item_rating: String(item_rating).replace(/[^\d]/g, '') || '5',
      item_img: finalImg
    });

    return res.redirect('/admin/admin_products/' + id);
  } catch (err) {
    console.error('[updateAdminProduct]', err);
    return res.status(500).send('DB error');
  }
};
