const db = require('../../db'); // Import kết nối DB thật

describe('Database Connectivity & Integrity Tests', () => {
  
  // 1. Test kết nối: Đảm bảo NodeJS thông được với MySQL
  it('Should connect to MySQL database successfully', (done) => {
    db.query('SELECT 1 + 1 AS solution', (err, results) => {
      if (err) return done(err); // Nếu lỗi kết nối thì báo fail ngay
      expect(results[0].solution).toBe(2); // 1 + 1 phải bằng 2
      done();
    });
  });

  // 2. Test cấu trúc bảng: Đảm bảo bảng 'users' quan trọng nhất đang tồn tại
  it('Table "users" should exist in database', (done) => {
    db.query('SHOW TABLES LIKE "users"', (err, results) => {
      if (err) return done(err);
      expect(results.length).toBe(1); // Phải tìm thấy 1 bảng tên là users
      done();
    });
  });

  // 3. Test dữ liệu: Đảm bảo lấy được danh sách món ăn (menu)
  // (Giả sử bạn đã có dữ liệu mẫu từ file .sql)
  it('Should retrieve data from "menu" table', (done) => {
    db.query('SELECT * FROM menu LIMIT 1', (err, results) => {
      if (err) return done(err);
      // Không bắt buộc phải có dữ liệu, nhưng query phải chạy thành công (không lỗi SQL)
      expect(Array.isArray(results)).toBe(true); 
      done();
    });
  });

  // 4. Test toàn vẹn dữ liệu (Optional): Thử insert rồi xóa ngay để check quyền ghi
  // Cẩn thận: Chỉ chạy cái này nếu bạn chắc chắn cấu trúc bảng
});

// Quan trọng: Đóng kết nối sau khi test xong để không bị treo Jest
afterAll((done) => {
    // Nếu db.js của bạn có hàm end(), hãy gọi nó. 
    // Nếu không, Jest sẽ cảnh báo một chút nhưng không sao.
    // db.end(done); 
    done();
});