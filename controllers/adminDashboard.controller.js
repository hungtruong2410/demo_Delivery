// controllers/adminDashboard.controller.js
const pool = require('../db'); // repo của bạn có sẵn db.js ở root

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

exports.renderDashboard = async (req, res) => {
  const { from, to } = { ...defaultRange(), ...req.query };
  res.render('admin_dashboard', { pageTitle: 'Admin Dashboard', from, to });
};

exports.getMetrics = async (req, res) => {
  const { from, to } = (req.query.from && req.query.to) ? req.query : defaultRange();

  const conn = await pool.getConnection();
  try {
    // Giả định bảng: orders(id, user_id, total_amount, status, created_at)
    // order_items(id, order_id, dish_id, quantity, price)
    // dishes(id, name)
    const [[todayRevenue]] = await conn.query(
      `SELECT COALESCE(SUM(total_amount),0) AS value
       FROM orders WHERE DATE(created_at)=CURDATE() AND status IN ('paid','completed')`
    );

    const [[monthRevenue]] = await conn.query(
      `SELECT COALESCE(SUM(total_amount),0) AS value
       FROM orders 
       WHERE DATE_FORMAT(created_at,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')
         AND status IN ('paid','completed')`
    );

    const [[todayOrders]] = await conn.query(
      `SELECT COUNT(*) AS value FROM orders WHERE DATE(created_at)=CURDATE()`
    );

    const [[aov]] = await conn.query(
      `SELECT COALESCE(AVG(total_amount),0) AS value
       FROM orders
       WHERE created_at BETWEEN ? AND ? AND status IN ('paid','completed')`,
      [`${from} 00:00:00`, `${to} 23:59:59`]
    );

    const [[activeUsers]] = await conn.query(
      `SELECT COUNT(DISTINCT user_id) AS value
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    const [dailyRevenue] = await conn.query(
      `SELECT DATE(created_at) AS day, COALESCE(SUM(total_amount),0) AS revenue
       FROM orders
       WHERE created_at BETWEEN ? AND ? AND status IN ('paid','completed')
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [`${from} 00:00:00`, `${to} 23:59:59`]
    );

    const [byStatus] = await conn.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE created_at BETWEEN ? AND ?
       GROUP BY status`,
      [`${from} 00:00:00`, `${to} 23:59:59`]
    );

    const [topDishes] = await conn.query(
      `SELECT oi.dish_id, d.name AS dish_name,
              SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN dishes d ON d.id = oi.dish_id
       WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         AND o.status IN ('paid','completed')
       GROUP BY oi.dish_id, d.name
       ORDER BY qty DESC
       LIMIT 10`
    );

    res.json({
      range: { from, to },
      kpis: {
        todayRevenue: Number(todayRevenue.value),
        monthRevenue: Number(monthRevenue.value),
        todayOrders: Number(todayOrders.value),
        aov: Number(aov.value),
        activeUsers: Number(activeUsers.value),
      },
      charts: { dailyRevenue, byStatus },
      tables: { topDishes }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
};
