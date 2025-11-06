// middleware/auth.js
module.exports.requireAdmin = (req, res, next) => {
  // TÙY DỰ ÁN: bạn đang lưu user ở đâu sau đăng nhập?
  // - Nếu dùng cookie/session: gán req.user lúc authenticate.
  // - Ở đây mình check đơn giản theo cookie 'role=admin' hoặc req.user.role.
  const roleFromCookie = req.cookies?.role;
  const role = req.user?.role || roleFromCookie;

  if (role !== 'admin') {
    return res.status(403).render('errors/403', { message: 'Forbidden' });
  }
  next();
};