# E-Commerce Backend (Node.js + Express + MongoDB Atlas)

Starter REST API with JWT auth, customer/admin roles, product CRUD, cart, and order creation.

## Requirements
- Node.js 20+ and npm
- MongoDB Atlas cluster
- Postman or another API client

## 1. Install
```bash
npm install
cp .env.example .env
```
On Windows PowerShell, use `Copy-Item .env.example .env`.

## 2. Configure MongoDB Atlas
1. Create a cluster at https://cloud.mongodb.com/.
2. Create a **database user** in Database Access.
3. Add your current development IP in Network Access. Avoid `0.0.0.0/0` except for temporary testing.
4. Open your cluster's Connect → Drivers panel and copy the connection URI.
5. Put it in `MONGODB_URI` in `.env`, replacing the username/password placeholders. URL-encode special characters in the password.
6. Set a long, random `JWT_SECRET`. Never commit `.env`.

## 3. Run
```bash
npm run dev
```
Check `GET http://localhost:5000/api/health`.

## 4. Make your first requests
### Register
`POST http://localhost:5000/api/auth/register`
```json
{ "name": "Demo Customer", "email": "customer@example.com", "password": "StrongPass123" }
```
Copy `token` from the response.

### Login
`POST http://localhost:5000/api/auth/login`
```json
{ "email": "customer@example.com", "password": "StrongPass123" }
```

For protected routes, set header:
`Authorization: Bearer YOUR_TOKEN`

### List products
`GET http://localhost:5000/api/products?page=1&limit=12&sort=newest`

### Create product (admin only)
First register a user, then promote it to admin **manually in Atlas UI**:
- Open the `ecommerce_db` database → `users` collection.
- Find your user document and change `role` from `customer` to `admin`.
- Never expose a public endpoint that lets users set their own role.
Then send:
`POST http://localhost:5000/api/products`
```json
{
  "name": "Everyday Backpack",
  "description": "A durable everyday backpack.",
  "category": "Bags",
  "brand": "Example",
  "price": 799,
  "stock": 25,
  "imageUrl": "https://example.com/backpack.jpg"
}
```

### Cart
`POST /api/cart/items`
```json
{ "productId": "PRODUCT_OBJECT_ID", "quantity": 2 }
```
`GET /api/cart`
`PATCH /api/cart/items/PRODUCT_OBJECT_ID` with `{ "quantity": 1 }`
`DELETE /api/cart/items/PRODUCT_OBJECT_ID`

### Create order (cash on delivery example)
`POST /api/orders`
```json
{
  "paymentMethod": "cod",
  "shippingAddress": {
    "fullName": "Demo Customer",
    "phone": "9000000000",
    "addressLine": "12 Example Road",
    "city": "Kolkata",
    "state": "West Bengal",
    "postalCode": "700001",
    "country": "India"
  }
}
```
Shipping is a demo rule: ₹80 below ₹1000 and free at/above ₹1000. Change it for your business.

## API route summary

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Logged in | Current user |
| GET | `/api/products` | Public | Search/list/filter/sort |
| GET | `/api/products/:id` | Public | Product details |
| POST | `/api/products` | Admin | Create product |
| PATCH | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft-delete product |
| GET | `/api/cart` | Logged in | Get cart |
| POST | `/api/cart/items` | Logged in | Add item |
| PATCH | `/api/cart/items/:productId` | Logged in | Change quantity |
| DELETE | `/api/cart/items/:productId` | Logged in | Remove item |
| DELETE | `/api/cart` | Logged in | Clear cart |
| POST | `/api/orders` | Logged in | Create order |
| GET | `/api/orders/my` | Logged in | Own orders |
| GET | `/api/orders` | Admin | All orders |
| PATCH | `/api/orders/:id/status` | Admin | Update status |

## Important production notes
- Online payment is **not implemented** in this starter. For Razorpay/Stripe, create orders server-side and verify signed webhooks before marking an order paid. Never trust a frontend `paymentStatus`.
- Use a real email verification/password reset flow before production.
- Add tests, request logging/monitoring, backups, and stricter validation.
- Configure CORS to your exact frontend origin in production.
- Order creation uses MongoDB transactions, so use an Atlas replica-set deployment. Test the transaction flow in your chosen Atlas tier.
- Stock is reserved by decrementing it during order creation; implement transactional stock restoration for cancellations and an audit trail before production.
- For image uploads, upload files to Cloudinary/S3 and store the resulting URL, not the file itself in MongoDB.
- Consider refresh-token/session strategy, cookie settings, CSRF protections if using cookies, and account lockout/rate limiting for production.
