// public/javascripts/payment.js

// LƯU Ý: Bạn phải thay thế 'YOUR_PUBLISHABLE_KEY' bằng khóa Publishable (Công khai)
// của bạn. Tốt nhất là truyền khóa này từ server xuống EJS.
const stripe = Stripe('YOUR_PUBLISHABLE_KEY');

const checkoutButton = document.getElementById('checkout-button');

if (checkoutButton) {
  checkoutButton.addEventListener('click', async () => {
    
    // 1. Thu thập dữ liệu giỏ hàng từ DOM
    const cartRows = document.querySelectorAll("#cart-table-body tr");
    if (cartRows.length === 0) {
        alert("Giỏ hàng của bạn đang rỗng.");
        return;
    }

    const cartItems = [];
    cartRows.forEach(row => {
        const itemId = row.getAttribute('data-item-id');
        const quantityInput = row.querySelector('.quantity');
        const quantity = parseInt(quantityInput.value);

        if (itemId && quantity > 0) {
            cartItems.push({
                id: itemId,
                quantity: quantity
            });
        }
    });

    if (cartItems.length === 0) {
        alert("Giỏ hàng không hợp lệ.");
        return;
    }

    // 2. Gửi dữ liệu giỏ hàng lên server
    try {
      const response = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart: cartItems }), // Gửi giỏ hàng lên server
      });

      if (!response.ok) {
        throw new Error('Không thể tạo phiên thanh toán');
      }

      const session = await response.json();

      // 3. Chuyển hướng đến trang thanh toán của Stripe
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng thử lại.');
    }
  });
}