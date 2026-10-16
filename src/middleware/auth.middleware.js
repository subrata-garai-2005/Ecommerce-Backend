const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401);
    throw new Error("Authentication required. Send Authorization: Bearer <token>.");
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Invalid or expired token.");
  }
  const user = await User.findById(payload.sub).select("-password");
  if (!user) {
    res.status(401);
    throw new Error("User account not found.");
  }
  req.user = user;
  next();
});

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required."));
  }
  next();
};

module.exports = { protect, adminOnly };
