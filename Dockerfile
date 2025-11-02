# 1. Chọn "hệ điều hành" cơ sở (dùng Node 18 bản mỏng nhẹ)
FROM node:18-alpine

# 2. Tạo một thư mục bên trong "hộp" để chứa code
WORKDIR /app

# 3. Sao chép file quản lý package vào trước
COPY package.json package-lock.json ./

# 4. Cài đặt dependencies (dùng 'ci' cho production)
RUN npm ci --omit=dev

# 5. Sao chép TOÀN BỘ code của bạn (app, routes, controllers...) vào
COPY . .

# 6. Báo cho Docker biết app của bạn chạy ở cổng 3000
EXPOSE 3000

# 7. Lệnh để khởi động app khi "hộp" chạy
CMD [ "node", "app.js" ]