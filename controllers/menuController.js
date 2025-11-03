// controllers/menuController.js
const Food = require('../models/foodModel');

module.exports = {
  async listFoods(req, res, next) {
    try {
      const foods = await Food.findAllActive();
      // return res.render('menu/list', { foods });
      return res.json(foods);
    } catch (err) { next(err); }
  },

  async getFood(req, res, next) {
    try {
      const food = await Food.findById(req.params.id);
      if (!food) return res.status(404).json({ message: 'Food not found' });
      // return res.render('menu/detail', { food });
      return res.json(food);
    } catch (err) { next(err); }
  },
};
