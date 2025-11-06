function requireAdmin(req, res, next) {
  // Ưu tiên session nếu bạn có gắn khi đăng nhập
  const roleFromSession = req.session?.user?.role || req.user?.role;

  // Cookie DEV/test
  const isAdminCookie = req.cookies?.is_admin === '1';   // <-- tên cookie bạn đang dùng

  if (roleFromSession === 'admin' || isAdminCookie) {
    return next();
  }

  // Đổi thành redirect thay vì send thuần, UX tốt hơn
  return res.status(403).redirect('/admin_signin');
}

module.exports = { requireAdmin };
