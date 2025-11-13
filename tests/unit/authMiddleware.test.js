// tests/unit/authMiddleware.test.js
const { requireAdmin } = require('../../middleware/authMiddleware');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware requireAdmin', () => {
  it('cho phép đi tiếp nếu có cookie is_admin = 1', () => {
    const req = {
      session: {},
      user: {},
      cookies: { is_admin: '1' }
    };
    const res = createRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirect về /admin/admin_signin nếu không phải admin', () => {
    const req = {
      session: {},
      user: {},
      cookies: {} // không có is_admin
    };
    const res = createRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.redirect).toHaveBeenCalledWith('/admin/admin_signin');
    expect(next).not.toHaveBeenCalled();
  });
});
