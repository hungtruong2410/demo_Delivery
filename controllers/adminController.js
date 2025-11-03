// controllers/adminController.js
const fs = require('fs');
const path = require('path');
const { safeFilename } = require('../utils/helpers');
const Admin = require('../models/adminModel');
const Menu = require('../models/menuModel');
const Order = require('../models/orderModel');

// ---------- AUTH ----------
exports.renderAdminSignInPage = (req, res) => res.render('admin_signin');

exports.adminSignIn = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.login(email, password);
  if (!admin) return res.render('admin_signin');
  res.cookie('cookuid', admin.admin_id);
  res.cookie('cookuname', admin.admin_name);
  res.cookie('is_admin', '1');
  return res.redirect('/adminHomepage');
};

// ---------- HOMEPAGE ----------
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

// ---------- ADD FOOD ----------
exports.renderAddFoodPage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  res.render('admin_addFood', { username: cookuname, userid: cookuid });
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
    res.redirect('/admin_addFood');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
};

// ---------- DELETE FOOD ----------
exports.renderDeleteFoodPage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  const menu = await Menu.getAll();
  res.render('admin_deleteFood', { username: cookuname, userid: cookuid, items: menu });
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
        if (err && err.code !== 'ENOENT') console.warn('Không xóa được ảnh:', err.message);
      });
    }
    res.redirect('/adminHomepage');
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
};

// ---------- VIEW/DISPATCH ORDERS ----------
exports.renderViewDispatchOrdersPage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  const orders = await Order.getAllOrders();
  res.render('admin_view_dispatch_orders', { username: cookuname, userid: cookuid, orders });
};

exports.dispatchOrders = async (req, res) => {
  try {
    const orderIds = [...new Set(req.body.order_id_s || [])];
    for (const id of orderIds) {
      const o = await Order.getById(id);
      if (!o) continue;
      await Order.insertDispatch({
        order_id: o.order_id,
        user_id: o.user_id,
        item_id: o.item_id,
        quantity: o.quantity,
        price: o.price,
        datetime: new Date()
      });
      await Order.deleteOrder(o.order_id);
    }
    const updated = await Order.getAllOrders();
    res.render('admin_view_dispatch_orders', { username: req.cookies.cookuname, orders: updated });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

// ---------- CHANGE PRICE ----------
exports.renderChangePricePage = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  const items = await Menu.getAll();
  res.render('admin_change_price', { username: cookuname, items });
};

exports.changePrice = async (req, res) => {
  const { item_name, NewFoodPrice } = req.body;
  try {
    await Menu.changePrice(item_name, NewFoodPrice);
    res.redirect('/adminHomepage');
  } catch (err) {
    res.status(500).send('Something went wrong');
  }
};

// ---------- PRODUCTS ----------
exports.renderAdminProducts = async (req, res) => {
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  const items = await Menu.getAll();
  res.render('admin_products', { username: cookuname, items });
};

exports.renderAdminProductDetail = async (req, res) => {
  const { id } = req.params;
  const { cookuid, cookuname } = req.cookies;
  const admin = await Admin.verify(cookuid, cookuname);
  if (!admin) return res.render('admin_signin');
  const item = await Menu.getById(id);
  res.render('admin_product_detail', { username: cookuname, item });
};

exports.renderAdminProductEdit = async (req, res) => {
  const { id } = req.params;
  const admin = await Admin.verify(req.cookies.cookuid, req.cookies.cookuname);
  if (!admin) return res.render('admin_signin');
  const item = await Menu.getById(id);
  res.render('admin_product_edit', { item });
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

      // xoá ảnh cũ
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
    res.redirect('/admin_products/' + id);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
};
