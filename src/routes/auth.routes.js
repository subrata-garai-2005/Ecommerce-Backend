const router = require("express").Router();
const { z } = require("zod");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const signToken = require("../utils/token");
const { protect } = require("../middleware/auth.middleware");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
});
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128)
});

router.post("/register", asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  const { name, email, password } = parsed.data;
  if (await User.exists({ email: email.toLowerCase() })) {
    return res.status(409).json({ success: false, message: "Email is already registered." });
  }
  // Public registration always creates a customer; never accept role from the request.
  const user = await User.create({ name, email, password, role: "customer" });
  res.status(201).json({
    success: true,
    token: signToken(user._id.toString()),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Valid email and password are required." });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(parsed.data.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  res.json({
    success: true,
    token: signToken(user._id.toString()),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}));

router.get("/me", protect, (req, res) => res.json({
  success: true,
  user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }
}));

module.exports = router;
