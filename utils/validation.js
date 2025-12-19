// utils/validation.js

// Hàm kiểm tra Email
function isValidEmail(email) {
    if (!email) return false;
    // Regex đơn giản kiểm tra email
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Hàm kiểm tra Password (ví dụ: phải >= 6 ký tự)
function isValidPassword(password) {
    if (!password) return false;
    return password.length >= 6;
}

// Hàm tính tổng tiền (Ví dụ thêm để báo cáo cho đẹp)
function calculateTotal(price, quantity) {
    if (price < 0 || quantity < 0) return 0;
    return price * quantity;
}

module.exports = { isValidEmail, isValidPassword, calculateTotal };