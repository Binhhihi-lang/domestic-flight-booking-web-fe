# =====================================================================
# Frontend Angular — build bằng Node rồi phục vụ file tĩnh bằng nginx.
# Máy đích KHÔNG cần Node: chỉ chạy image kết quả.
#
#   docker build -t vinafly/frontend .
#   docker run -p 4200:80 vinafly/frontend
#
# nginx vừa phục vụ file tĩnh vừa proxy /api → backend:8080,
# nên trình duyệt chỉ nói chuyện với một origin duy nhất (không cần CORS).
# =====================================================================

# ---------- Stage 1: build Angular ----------
FROM node:24-alpine AS build
WORKDIR /app

# Copy riêng manifest trước để layer npm ci được cache lại.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: nginx phục vụ file tĩnh ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/domestic-flight-booking-web-frontend/browser /usr/share/nginx/html

EXPOSE 80
