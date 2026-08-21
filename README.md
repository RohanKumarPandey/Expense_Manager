# Flatmate Expense Manager 🏠💸

A full-stack, debt-simplified expense-sharing web application built for flatmates and shared households, featuring a greedy debt-simplification algorithm, strict integer-paise financial precision, MongoDB aggregation pipelines, and natural-language expense parsing with offline local fallback.

🔗 **Live Demo:** [https://flatmate-expense-manager.vercel.app](https://flatmate-expense-manager.vercel.app) *(Deployment template configured)*

---

## 💡 Why I Built This

Splitting household expenses with roommates is notoriously messy:
1. **Floating-point rounding errors** in naive division often cause split totals to mismatch the bill amount.
2. **Circular debt loops** (e.g. A owes B, B owes C, C owes A) cause dozens of redundant small payments when a single direct transfer would settle everyone.
3. **Manual form friction** discourages flatmates from recording quick payments in real time.

This project was engineered to solve these core issues through clean mathematical modeling, algorithmic debt simplification, and a natural-language expense parser.

---

## ✨ Key Engineering Highlights

### 1. Greedy Debt Simplification Algorithm ($O(n \log n)$)
- **Problem:** In a group of $N$ flatmates, a naive settlement approach requires up to $N(N-1)/2$ peer-to-peer payments.
- **Solution:** `backend/src/services/balanceService.js` implements a greedy matching algorithm:
  1. Computes the exact net balance position for every member across all expenses and settlements.
  2. Partitions members into **Debtors** (net negative) and **Creditors** (net positive).
  3. Greedily pairs the largest debtor with the largest creditor, settling the minimum of `|debt|` and `|credit|` in each step.
- **Result:** Settles all group debts in at most $N - 1$ total transactions with zero balance drift.

### 2. Zero Floating-Point Precision Drift (Integer-Paise Money Math)
- All monetary amounts are stored and calculated strictly in integer **Paise** (1 Rupee = 100 Paise) in MongoDB and backend services (`toPaise` / `toRupees`).
- Unequal splits strictly validate $\sum \text{shares} = \text{total}$.
- Percentage splits utilize the **Largest Remainder Method (Hamilton-Hare method)** to apportion rounding remainders deterministically without losing a single paise.

### 3. Natural-Language Expense Parser (Hybrid AI + Offline Local NLP)
- Parses free-form natural language prompts (e.g., *"Maine Rohan ke saath dinner par 600 rupaye kharch kiye, hum dono mein barabar baant do"*).
- Extracts amount, category, clean description (*"Dinner"*), and resolves relational participants (*"hum dono"*, *"with Rohan"* $\rightarrow$ active user + flatmate).
- **Safety by Design:** The AI strictly generates an editable **draft candidate**; it never writes directly to the database. Confirmed entries pass through standard server-side Zod validation.
- **Offline Resilient:** Supports Google Gemini API (free tier) with instant fallback to a built-in rule-based NLP parser requiring **zero API keys or credits**.

### 4. Cross-Group Financial Analytics (MongoDB Aggregation Pipelines)
- `backend/src/services/dashboardService.js` leverages multi-stage aggregation pipelines to calculate:
  - Cross-group net balance aggregates (Total Owed vs Total Owing).
  - Category breakdown using each member's personal share rather than gross amounts.
  - 6-month monthly spend trends and unified chronological activity feeds.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, Recharts, Custom Responsive CSS |
| **Backend** | Node.js, Express.js, REST API Architecture |
| **Database** | MongoDB Atlas, Mongoose ODM (Indexes, Schemas, Aggregations) |
| **Validation** | Zod (Strict Schema Validation & Apportionment Guards) |
| **Authentication**| JWT (JSON Web Tokens), bcryptjs password hashing |
| **Testing** | Jest, Supertest (44 automated tests across 4 test suites) |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend), MongoDB Atlas (Database) |

---

## 📁 Repository Structure

```
Expense_Manager/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Environment validation
│   │   ├── controllers/     # Auth, Group, Expense, Balance, Settlement, Dashboard, AI
│   │   ├── middleware/      # JWT Auth & Group Membership guards
│   │   ├── models/          # User, Group, Expense, Settlement schemas
│   │   ├── routes/          # Express route handlers
│   │   ├── services/        # Balance, Simplification, Dashboard & AI services
│   │   ├── utils/           # Money math helpers (toPaise/toRupees) & Error handlers
│   │   └── validators/      # Zod validation schemas
│   ├── tests/               # 44 Jest unit & integration tests
│   ├── render.yaml          # Render deployment infrastructure-as-code
│   └── package.json
├── frontend/
│   ├── app/                 # Next.js App Router (Dashboard, Groups, Settle, AI Add)
│   ├── components/          # Reusable Charts, LoadingSpinner, EmptyState, ErrorBanner
│   ├── lib/                 # AuthContext & API Client
│   ├── vercel.json          # Vercel deployment configuration
│   └── package.json
└── README.md
```

---

## 🚀 Running Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (local instance or MongoDB Atlas cluster URI)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET in backend/.env
npm run dev
# Server running at http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

---

## 🧪 Testing

The backend includes a comprehensive Jest test suite verifying mathematical accuracy, debt simplification, MongoDB query filters, and natural language parsing:

```bash
cd backend
npm test
```

```
PASS tests/aiService.test.js
PASS tests/dashboardService.test.js
PASS tests/balanceService.test.js
PASS tests/expenseQuery.test.js

Test Suites: 4 passed, 4 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        3.082 s
```

To run the standalone integer-paise money math regression suite:
```bash
node src/test/expense.test.js
```

---

## 🚢 Deployment Guide

### 1. Database (MongoDB Atlas)
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow network access (`0.0.0.0/0`).
3. Copy your connection string into `MONGO_URI`.

### 2. Backend (Render / Railway)
1. Create a new Web Service pointing to `backend/`.
2. Build Command: `npm install`
3. Start Command: `node src/server.js`
4. Set Environment Variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`.
5. Health Check: `GET /api/health` returns `{"status": "ok"}`.

### 3. Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com) with root directory set to `frontend/`.
2. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`.
3. Deploy!

---

## 📄 License
MIT License. Built with clean architecture and mathematical precision.
