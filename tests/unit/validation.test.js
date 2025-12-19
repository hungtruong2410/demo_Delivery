// tests/unit/validation.test.js
const { isValidEmail, isValidPassword, calculateTotal } = require('../../utils/validation');

describe('UT-003: Validation Utilities', () => {

    // 1. Test Email
    describe('isValidEmail', () => {
        it('TC-01: Trả về true nếu email hợp lệ', () => {
            expect(isValidEmail('student@example.com')).toBe(true);
        });

        it('TC-02: Trả về false nếu email thiếu @', () => {
            expect(isValidEmail('studentexample.com')).toBe(false);
        });

        it('TC-03: Trả về false nếu email rỗng', () => {
            expect(isValidEmail('')).toBe(false);
        });
    });

    // 2. Test Password
    describe('isValidPassword', () => {
        it('TC-04: Trả về true nếu pass >= 6 ký tự', () => {
            expect(isValidPassword('123456')).toBe(true);
        });

        it('TC-05: Trả về false nếu pass < 6 ký tự', () => {
            expect(isValidPassword('12345')).toBe(false);
        });
    });

    // 3. Test Tính tiền (Thêm cái này để báo cáo đa dạng hơn)
    describe('calculateTotal', () => {
        it('TC-06: Tính đúng tổng tiền', () => {
            expect(calculateTotal(100, 2)).toBe(200);
        });

        it('TC-07: Trả về 0 nếu số lượng âm', () => {
            expect(calculateTotal(100, -1)).toBe(0);
        });
    });
});