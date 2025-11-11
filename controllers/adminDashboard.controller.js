// controllers/adminDashboard.controller.js
const db = require('../db');
const dayjs = require('dayjs');

// --- helpers ---
function defaultRange() {
  const to = dayjs().format('YYYY-MM-DD');
  const from = dayjs().startOf('month').format('YYYY-MM-DD');
  return { from, to };
}
function parseRange(qs) {
  const { from, to } = qs || {};
  const okFrom = dayjs(from, 'YYYY-MM-DD', true).isValid() ? from : null;
  const okTo   = dayjs(to,   'YYYY-MM-DD', true).isValid() ? to   : null;
  return (okFrom && okTo) ? { from: okFrom, to: okTo } : defaultRange();
}

// ---- pages ----
exports.renderDashboard = (req, res) => {
  const { from, to } = defaultRange();
  return res.render('admin_dashboard', {
    pageTitle: 'Admin Dashboard',
    from,
    to
  });
};

// ---- API /admin_dashboard/metrics ----
exports.getMetrics = async (req, res) => {
  const conn = db.promise();
  try {
    console.log('[dashboard.getMetrics] v3 loaded');

    const { from, to } = parseRange(req.query);
    const fromDT = `${from} 00:00:00`;
    const toDT   = `${to} 23:59:59`;
    const today  = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    // --- Kiểm tra schema: orders có cột status không? ---
    const [cols] = await conn.query('SHOW COLUMNS FROM orders');
    const hasStatus = cols.some(c => c.Field === 'status');
    console.log('[dashboard.getMetrics] orders.status exists?', hasStatus);

    // Nguồn dữ liệu: gộp 2 bảng (đúng với DB của bạn)
    const unionSQL = `
      SELECT order_id, user_id, item_id, quantity, price, datetime FROM orders
      UNION ALL
      SELECT order_id, user_id, item_id, quantity, price, datetime FROM order_dispatch
    `;

    // --- KPI ---
    const [[todayRev]] = await conn.query(
      `SELECT COALESCE(SUM(price),0) AS v FROM (${unionSQL}) x WHERE DATE(datetime)=?`, [today]
    );
    const [[monthRev]] = await conn.query(
      `SELECT COALESCE(SUM(price),0) AS v FROM (${unionSQL}) x WHERE datetime BETWEEN ? AND ?`,
      [`${monthStart} 00:00:00`, `${today} 23:59:59`]
    );
    const [[todayCnt]] = await conn.query(
      `SELECT COUNT(*) AS v FROM (${unionSQL}) x WHERE DATE(datetime)=?`, [today]
    );
    const [[aovRow]] = await conn.query(
      `SELECT COALESCE(SUM(price),0) AS rev, COUNT(*) AS cnt
       FROM (${unionSQL}) x
       WHERE datetime BETWEEN ? AND ?`,
      [fromDT, toDT]
    );
    const aov = aovRow.cnt ? Math.round((aovRow.rev / aovRow.cnt) * 100) / 100 : 0;

    // --- Doanh thu theo ngày ---
    const [dailyRows] = await conn.query(
      `SELECT DATE(datetime) AS day, COALESCE(SUM(price),0) AS revenue
       FROM (${unionSQL}) x
       WHERE datetime BETWEEN ? AND ?
       GROUP BY DATE(datetime)
       ORDER BY DATE(datetime)`,
      [fromDT, toDT]
    );

    // --- Đơn theo trạng thái ---
    // Nếu có cột status (ít gặp), dùng trực tiếp; nếu KHÔNG có, tự dựng 2 nhóm pending/dispatched
    let byStatusRows;
    if (hasStatus) {
      const [rows] = await conn.query(
        `SELECT status, COUNT(*) AS count
         FROM orders
         WHERE datetime BETWEEN ? AND ?
         GROUP BY status
         UNION ALL
         SELECT 'dispatched' AS status, COUNT(*) AS count
         FROM order_dispatch
         WHERE datetime BETWEEN ? AND ?`,
        [fromDT, toDT, fromDT, toDT]
      );
      byStatusRows = rows;
    } else {
      const [rows] = await conn.query(
        `SELECT 'pending' AS status,   COUNT(*) AS count FROM orders
           WHERE datetime BETWEEN ? AND ?
         UNION ALL
         SELECT 'dispatched' AS status, COUNT(*) AS count FROM order_dispatch
           WHERE datetime BETWEEN ? AND ?`,
        [fromDT, toDT, fromDT, toDT]
      );
      byStatusRows = rows;
    }

    // --- Top món 7 ngày gần nhất ---
    const sevenAgo = dayjs(to).subtract(6, 'day').format('YYYY-MM-DD') + ' 00:00:00';
    const [topRows] = await conn.query(
      `SELECT item_id, SUM(quantity) AS qty, SUM(price) AS revenue
       FROM (${unionSQL}) x
       WHERE datetime BETWEEN ? AND ?
       GROUP BY item_id
       ORDER BY qty DESC
       LIMIT 10`,
      [sevenAgo, `${to} 23:59:59`]
    );

    // Map tên món (optional)
    const menuMap = new Map();
    try {
      const [menu] = await conn.query('SELECT item_id, item_name FROM menu');
      for (const m of menu) menuMap.set(m.item_id, m.item_name);
    } catch {}

    return res.json({
      range: { from, to },
      kpis: {
        todayRevenue: Number(todayRev?.v) || 0,
        monthRevenue: Number(monthRev?.v) || 0,
        todayOrders : Number(todayCnt?.v) || 0,
        aov
      },
      charts: {
        dailyRevenue: dailyRows.map(r => ({
          day: dayjs(r.day).format('YYYY-MM-DD'),
          revenue: Number(r.revenue) || 0
        })),
        byStatus: byStatusRows.map(r => ({
          status: r.status,
          count: Number(r.count) || 0
        }))
      },
      tables: {
        topDishes: topRows.map((r, i) => ({
          rank: i + 1,
          item_id: r.item_id,
          dish_name: menuMap.get(r.item_id) || `Item #${r.item_id}`,
          qty: Number(r.qty) || 0,
          revenue: Number(r.revenue) || 0
        }))
      }
    });
  } catch (err) {
    console.error('[DASHBOARD_METRICS]', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
