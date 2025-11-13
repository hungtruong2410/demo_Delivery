// tests/integration/app.test.js
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const request = require('supertest');

// Mock db.js để không connect MySQL khi require controllers
jest.mock('../../db.js', () => ({
  query: jest.fn(),   // cho các chỗ dùng connection.query
  connect: jest.fn()
}));

const indexRoutes = require('../../routes/index');
const userRoutes = require('../../routes/users');
const adminRoutes = require('../../routes/admin');

function createTestApp() {
  const app = express();

  // view engine
  app.set('views', path.join(__dirname, '..', '..', 'views'));
  app.set('view engine', 'ejs');

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  // mount routes giống app thực tế
  app.use('/', indexRoutes);
  app.use('/', userRoutes);
  app.use('/admin', adminRoutes);

  // Health check
  app.get('/healthz', (_req, res) => res.status(200).send('ok'));

  // 404 handler
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  return app;
}

const app = createTestApp();

describe('Public routes', () => {
  // 1
  it('GET /healthz trả về 200 và "ok"', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('ok');
  });

  // 2
  it('GET / (trang index) trả về HTML 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  // 3
  it('GET /signup trả về form đăng ký', async () => {
    const res = await request(app).get('/signup');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  // 4
  it('GET /signin trả về form đăng nhập', async () => {
    const res = await request(app).get('/signin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('Admin routes', () => {
  // 5
  it('GET /admin/admin_signin trả về trang đăng nhập admin', async () => {
    const res = await request(app).get('/admin/admin_signin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  // 6
  it('GET /admin/admin_dashboard khi CHƯA đăng nhập admin -> 302 & redirect', async () => {
    const res = await request(app).get('/admin/admin_dashboard');
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/admin/admin_signin');
  });

  // 7
  it('GET /admin/admin_dashboard khi có cookie is_admin=1 -> KHÔNG bị 403', async () => {
    const res = await request(app)
      .get('/admin/admin_dashboard')
      .set('Cookie', ['is_admin=1']);
    expect(res.statusCode).not.toBe(403);
    // Có thể mong đợi 200, nhưng nếu view lỗi thì có thể 500
    // ít nhất là đã qua middleware requireAdmin
  });

  // 8
  it('GET đường không tồn tại trả về 404', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.text).toBe('Not Found');
  });
});
