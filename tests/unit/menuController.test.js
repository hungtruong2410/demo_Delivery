// tests/unit/menuController.test.js
// mock db để chắc chắn không bao giờ connect thật khi unit test
jest.mock('../../db.js', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

const menuController = require('../../controllers/menuController');
const Food = require('../../models/foodModel');

jest.mock('../../models/foodModel');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('menuController.listFoods', () => {
  it('trả về danh sách món ăn (JSON) khi thành công', async () => {
    const fakeFoods = [{ id: 1, name: 'Pizza' }];
    Food.findAllActive.mockResolvedValue(fakeFoods);

    const req = {};
    const res = createRes();
    const next = jest.fn();

    await menuController.listFoods(req, res, next);

    expect(Food.findAllActive).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(fakeFoods);
    expect(next).not.toHaveBeenCalled();
  });

  it('gọi next(err) khi Food.findAllActive ném lỗi', async () => {
    const error = new Error('DB error');
    Food.findAllActive.mockRejectedValue(error);

    const req = {};
    const res = createRes();
    const next = jest.fn();

    await menuController.listFoods(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('menuController.getFood', () => {
  it('trả về món ăn khi tìm thấy', async () => {
    const fakeFood = { id: 123, name: 'Burger' };
    Food.findById = jest.fn().mockResolvedValue(fakeFood);

    const req = { params: { id: '123' } };
    const res = createRes();
    const next = jest.fn();

    await menuController.getFood(req, res, next);

    expect(Food.findById).toHaveBeenCalledWith('123');
    expect(res.json).toHaveBeenCalledWith(fakeFood);
    expect(next).not.toHaveBeenCalled();
  });

  it('trả về 404 khi không tìm thấy món ăn', async () => {
    Food.findById = jest.fn().mockResolvedValue(null);

    const req = { params: { id: '999' } };
    const res = createRes();
    const next = jest.fn();

    await menuController.getFood(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Food not found' });
    expect(next).not.toHaveBeenCalled();
  });
});
test('dummy fails on purpose', () => {
  expect(1).toBe(2); // cố tình sai để CI fail
});
