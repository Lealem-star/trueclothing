# True Clothing

Full-stack production web application for **True Clothing**, an authentic Ethiopian seller of shifon and Habesha dresses and fabrics (wholesale, custom design tailoring, and delivery abroad).

Based on the design prototype at `design/true-clothing-ui.html`, this monorepo replaces all prototype local storage mock data with a secure, production-ready full-stack architecture.

---

## Tech Stack

- **Frontend**: React (JavaScript) + Vite + react-router-dom + axios
- **Backend**: Node.js + Express (ES Modules), zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, multer, pino, sharp
- **Database**: MySQL + Prisma ORM (money formatted as `Decimal(12,2)`)
- **Monorepo**: Root workspace with `concurrently` managing `client` and `server`

---

## Project Structure

```text
true-clothing/
├── client/                     # Vite + React frontend
│   ├── public/fonts/           # Bundled Noto Sans Ethiopic font asset
│   ├── src/
│   │   ├── api/                # Axios instance with interceptors & CSRF/cookie support
│   │   ├── components/         # ProductCard, ProductModal, ServiceCard, StatusTag, Modal, DataTable, etc.
│   │   ├── context/            # LanguageContext (EN/AM), AuthContext, SettingsContext, ToastContext
│   │   ├── pages/              # Home, RequestOrder, Account, and /admin subpages
│   │   ├── App.jsx             # React Router structure
│   │   ├── index.css           # Faithful prototype tokens & mobile-first responsive styling
│   │   └── main.jsx
│   ├── .env                    # VITE_API_URL
│   └── package.json
├── server/                     # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma       # MySQL schema with Decimal(12,2) and relations
│   │   └── seed.js             # Seed script (Settings, Admin, Products with generated WebP images, Orders, Requests)
│   ├── src/
│   │   ├── config/             # Environment, Prisma client singleton
│   │   ├── middlewares/        # JWT auth, Multer upload, Rate limiters, Error handler, Logger
│   │   ├── routes/             # Public, Customer (/me), Admin (/orders, /products, /requests, /customers, /settings, /dashboard)
│   │   ├── services/           # Storage (Sharp resize & thumb), SMS OTP (console), Telegram alerts, Activity log
│   │   ├── utils/              # Phone normalization (+251 standard)
│   │   ├── app.js              # Express app setup
│   │   └── index.js            # Server listener
│   ├── uploads/                # Processed WebP images & thumbnails (served statically)
│   ├── test-verification.js    # Automated 35-point end-to-end verification test suite
│   ├── .env                    # Server environment variables
│   ├── .env.example
│   └── package.json
├── design/
│   └── true-clothing-ui.html   # Source-of-truth prototype
├── package.json                # Root monorepo configuration with concurrently
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MySQL or MariaDB running locally (e.g. XAMPP on port 3306 or 3307)

### 2. Environment Configuration

#### Server (`server/.env`):
```env
PORT=5000
DATABASE_URL="mysql://root:@localhost:3307/true_clothing_db"
JWT_SECRET="true_clothing_super_secret_jwt_key_2026_production"
CLIENT_URL="http://localhost:5173"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_ADMIN_CHAT_ID=""
UPLOAD_DIR="uploads"
SMS_PROVIDER="console"
```

#### Client (`client/.env`):
```env
VITE_API_URL="/api"
```

### 3. Installation

Install all workspace dependencies from root:
```bash
npm run install:all
```

### 4. Database Migration & Seed

Run migrations and seed initial data:
```bash
# Apply schema to MySQL
npm run db:migrate

# Seed admin user, settings, sample products with real images, sample orders & requests
npm run db:seed
```

### 5. Running the Application

To run both client and server concurrently in development mode:
```bash
npm run dev
```

- **Frontend Shop**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5000/api/`
- **Health Check**: `http://localhost:5000/api/health`

---

## Seeded Admin Login Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Admin Dashboard URL**: `http://localhost:5173/admin` or `http://localhost:5173/admin/login`

> **Note**: The prototype's hardcoded demo credentials have been replaced with a real bcrypt-hashed database user seeded from `.env`. Admins can update their password anytime in **Settings > Admin Security**.

---

## Customer Login (OTP)

Customers sign in with their phone number (`09...` or `07...` or `+251...`):
- Click **Account** (or **Sign in**).
- Enter phone number (e.g. `0911554433`).
- A 6-digit one-time code is logged to the server console (`SMS_PROVIDER=console`) and displayed in development mode.
- Enter the code to verify. The customer's account dashboard displays their specific orders, status tracking bar, and requests with quotes.

---

## Key Features & Business Rules

1. **Strict Server-Side Price Calculation**: Order totals are strictly computed on the server from the database price multiplied by item quantity. Client-provided prices are never trusted.
2. **Sequential, Monotonic Order Numbers**: Order numbers (`#0001`, `#0002`, `#0003`...) are generated sequentially inside an atomic database transaction using `OrderCounter`.
3. **Sharp Image Processing**: Uploaded images (up to 5 MB, JPG/PNG/WebP) are processed using Sharp to generate a high-resolution WebP (max width 1600px) and a lightweight thumbnail (max width 400px).
4. **Telegram Bot Alerts**: When `alertOnOrders` or `alertOnRequests` is enabled in Settings, the server automatically dispatches formatted notifications to the configured Telegram chat. If unconfigured, it logs gracefully without interrupting customer requests.
5. **Anti-Spam Honeypot**: Public order and request forms include hidden honeypot fields (`hp_true_val`, `hp_tc_check`) to quietly disarm bots without annoying human captchas.
6. **Mobile-First & Bilingual**: Optimized for 360px mobile viewports (most customers arrive from Telegram). Supports seamless English and Amharic with bundled local `Noto Sans Ethiopic` font assets.

---

## End-to-End Verification Suite

To run the automated 35-point verification test suite verifying all customer flows, admin management, and isolation:
```bash
npm run test:verify
```

