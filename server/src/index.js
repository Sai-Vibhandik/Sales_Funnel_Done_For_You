const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const paymentRoutes = require("./routes/paymentRoutes");

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, "../uploads");
const taskDeliverablesDir = path.join(uploadsDir, "task-deliverables");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}
if (!fs.existsSync(taskDeliverablesDir)) {
  fs.mkdirSync(taskDeliverablesDir, { recursive: true });
  console.log("Created task-deliverables directory");
}

// Database
const connectDB = require("./config/database");
connectDB();

// Routes
const authRoutes = require("./routes/auth");
const organizationRoutes = require("./routes/organizations");
const projectRoutes = require("./routes/projects");
const marketResearchRoutes = require("./routes/marketResearch");
const offerRoutes = require("./routes/offers");
const trafficStrategyRoutes = require("./routes/trafficStrategy");
const landingPageRoutes = require("./routes/landingPages");
const creativeRoutes = require("./routes/creatives");
const taskRoutes = require("./routes/tasks");
const notificationRoutes = require("./routes/notifications");
const strategyRoutes = require("./routes/strategy");
const clientRoutes = require("./routes/clients");
const promptRoutes = require("./routes/promptRoutes");
const aiRoutes = require("./routes/aiRoutes");
const frameworkCategoryRoutes = require("./routes/frameworkCategoryRoutes");
const platformAdminRoutes = require("./routes/platformAdmin");
const billingRoutes = require("./routes/billing");
const webhookRoutes = require("./routes/webhooks");
const rejectionRoutes = require("./routes/rejections");

// Socket.io
const { setIO } = require("./controllers/projectController");

// Create app
const app = express();

// Simple CORS - Allow all origins
app.use(cors({
  origin: '*',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(morgan("dev"));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// Plans (public)
app.get("/api/plans", async (req, res) => {
  const Plan = require("./models/Plan");
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
  res.json({ success: true, data: plans });
});

// Auth middleware
const { protect } = require("./middleware/auth");
const { setTenantContext, requireOrganization } = require("./middleware/tenant");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/invitations", require("./routes/invitations"));
app.use("/api/plans", require("./routes/plans")); // Public plans route (for landing page)
app.use("/api/organizations", protect, organizationRoutes);
app.use("/api/projects", protect, setTenantContext, requireOrganization, projectRoutes);
app.use("/api/market-research", protect, setTenantContext, requireOrganization, marketResearchRoutes);
app.use("/api/offers", protect, setTenantContext, requireOrganization, offerRoutes);
app.use("/api/traffic-strategy", protect, setTenantContext, requireOrganization, trafficStrategyRoutes);
app.use("/api/landing-pages", protect, setTenantContext, requireOrganization, landingPageRoutes);
app.use("/api/creatives", protect, setTenantContext, requireOrganization, creativeRoutes);
app.use("/api/tasks", protect, setTenantContext, requireOrganization, taskRoutes);
app.use("/api/notifications", protect, setTenantContext, requireOrganization, notificationRoutes);
app.use("/api/strategy", protect, setTenantContext, requireOrganization, strategyRoutes);
app.use("/api/clients", protect, setTenantContext, requireOrganization, clientRoutes);
app.use("/api/prompts", protect, setTenantContext, promptRoutes);
app.use("/api/ai", protect, setTenantContext, requireOrganization, aiRoutes);
app.use("/api/framework-categories", protect, setTenantContext, requireOrganization, frameworkCategoryRoutes);
app.use("/api/platform", platformAdminRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/rejections", protect, setTenantContext, requireOrganization, rejectionRoutes);
app.use("/api/brand-settings", protect, setTenantContext, requireOrganization, require("./routes/brandSettings"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: "Validation Error", errors: messages });
  }

  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: "Duplicate entry" });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error"
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});

// Socket.io
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

setIO(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require("./models/User");
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) return next(new Error("Invalid user"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`✅ Socket: ${socket.id}`);
  if (socket.user?.currentOrganization) {
    socket.join(`org:${socket.user.currentOrganization}`);
  }
  socket.join(`user:${socket.user._id}`);
});

module.exports = app;