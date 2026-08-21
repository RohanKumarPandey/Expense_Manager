const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const groupRoutes = require("./routes/groupRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/groups/:groupId/expenses", expenseRoutes);
app.use("/api/groups/:groupId/balances", balanceRoutes);
app.use("/api/groups/:groupId/settlements", settlementRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use(errorHandler); // must be last

module.exports = app;
