function requireAdmin(req, res, next) {
  // chỉ cho admin (cookie is_admin=1) được gọi các route admin-protected
  if (req.cookies?.is_admin !== "1") {
    return res.status(403).send("Forbidden: Admin only");
  }
  next();
}module.exports = {
  requireAdmin
};