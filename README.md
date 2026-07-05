# E-Commerce REST API

A production-ready Node.js + Express backend for an e-commerce platform with JWT authentication and MySQL database.

## Tech Stack
- Node.js 18 + Express 5
- MySQL 8.0 with mysql2
- JWT Authentication (bcryptjs + jsonwebtoken)
- Helmet, CORS, Morgan middleware

## API Endpoints

### Auth
- POST /api/auth/register — Register new customer
- POST /api/auth/login    — Login and get JWT token
- GET  /api/auth/me       — Get current user (protected)

### Products
- GET /api/products          — List all products (filter by category, price, search)
- GET /api/products/:id      — Product details with variants and reviews
- GET /api/products/stats    — Revenue and sales stats (protected)
- GET /api/products/lowstock — Low stock alert (protected)

### Orders
- GET   /api/orders     — My orders (protected)
- GET   /api/orders/:id — Order details (protected)
- POST  /api/orders     — Place new order with coupon support (protected)
- PATCH /api/orders/:id — Update order status (protected)

## Run Locally
git clone https://github.com/AmritaSingh18/ecommerce-backend.git
cd ecommerce-backend
npm install
cp .env.example .env
node server.js
