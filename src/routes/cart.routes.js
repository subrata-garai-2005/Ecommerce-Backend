const router = require("express").Router();
const { z } = require("zod");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product", "name price stock imageUrl isActive");
  res.json({ success: true, data: cart || { user: req.user._id, items: [] } });
}));

router.post("/items", asyncHandler(async (req, res) => {
  const parsed = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(99).default(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "productId and a valid quantity are required." });
  const product = await Product.findOne({ _id: parsed.data.productId, isActive: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  if (product.stock < parsed.data.quantity) return res.status(400).json({ success: false, message: "Insufficient stock." });
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });
  const item = cart.items.find(i => i.product.toString() === product._id.toString());
  if (item) {
    if (item.quantity + parsed.data.quantity > product.stock) return res.status(400).json({ success: false, message: "Requested quantity exceeds stock." });
    item.quantity += parsed.data.quantity;
  } else {
    cart.items.push({ product: product._id, quantity: parsed.data.quantity });
  }
  await cart.save();
  await cart.populate("items.product", "name price stock imageUrl isActive");
  res.status(201).json({ success: true, data: cart });
}));

router.patch("/items/:productId", asyncHandler(async (req, res) => {
  const parsed = z.object({ quantity: z.coerce.number().int().min(1).max(99) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Quantity must be between 1 and 99." });
  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  if (parsed.data.quantity > product.stock) return res.status(400).json({ success: false, message: "Insufficient stock." });
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find(i => i.product.toString() === req.params.productId);
  if (!item) return res.status(404).json({ success: false, message: "Cart item not found." });
  item.quantity = parsed.data.quantity;
  await cart.save();
  await cart.populate("items.product", "name price stock imageUrl isActive");
  res.json({ success: true, data: cart });
}));

router.delete("/items/:productId", asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found." });
  cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
  await cart.save();
  res.json({ success: true, data: cart });
}));

router.delete("/", asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } }, { upsert: true });
  res.json({ success: true, message: "Cart cleared." });
}));

module.exports = router;
