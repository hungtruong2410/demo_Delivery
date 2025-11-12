# Dockerfile
FROM node:20-alpine

# 1) Thư mục làm việc trong container
WORKDIR /app

# 2) Copy file package để cache layer cài deps
COPY package*.json ./

# 3) Cài dependencies (chỉ production)
RUN npm ci --only=production

# 4) Copy toàn bộ source vào image
COPY . .

# 5) Biến môi trường & cổng
ENV NODE_ENV=production
EXPOSE 3000

# 6) Start app theo cấu trúc Express (bin/www)
CMD ["node", "./bin/www"]
