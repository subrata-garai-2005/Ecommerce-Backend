const router = require("express").Router();
const { z } = require("zod");
const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const { protect, adminOnly } = require("../middleware/auth.middleware");

router.use(protect);

const addressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  addressLine: z.string().trim().min(3),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  postalCode: z.string().trim().min(3),
  country: z.string().trim().min(2)
});

router.post("/", asyncHandler(async (req, res) => {
  const parsed = z.object({
    shippingAddress: addressSchema,
    paymentMethod: z.enum(["cod", "online"]).default("cod")
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: "Your cart is empty." });

  // Transaction protects stock/order consistency; Atlas replica-set deployments support transactions.
  const session = await mongoose.startSession();
  let createdOrder;
  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let subtotal = 0;
      for (const item of cart.items) {
        const product = await Product.findOne({ _id: item.product, isActive: true }).session(session);
        if (!product) throw Object.assign(new Error("A product in your cart is unavailable."), { statusCode: 400 });
        if (product.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${product.name}.`), { statusCode: 400 });
        product.stock -= item.quantity;
        await product.save({ session });
        subtotal += product.price * item.quantity;
        orderItems.push({
          product: product._id, name: product.name, imageUrl: product.imageUrl,
          price: product.price, quantity: item.quantity
        });
      }
      const shippingFee = subtotal >= 1000 ? 0 : 80;
      const [order] = await Order.create([{
        user: req.user._id, items: orderItems, shippingAddress: parsed.data.shippingAddress,
        subtotal, shippingFee, total: subtotal + shippingFee, paymentMethod: parsed.data.paymentMethod
      }], { session });
      createdOrder = order;
      cart.items = [];
      await cart.save({ session });
    });
  } catch (err) {
    if (err.statusCode) res.status(err.statusCode);
    throw err;
  } finally {
    await session.endSession();
  }
  res.status(201).json({ success: true, data: createdOrder });
}));

router.get("/my", asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
}));

router.get("/", adminOnly, asyncHandler(async (_req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
}));

router.patch("/:id/status", adminOnly, asyncHandler(async (req, res) => {
  const parsed = z.object({ status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid order status." });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  if (order.status === "delivered" || order.status === "cancelled") return res.status(400).json({ success: false, message: "This order can no longer be changed." });
  // Production cancellation should restore stock transactionally and have an audit trail.
  order.status = parsed.data.status;
  await order.save();
  res.json({ success: true, data: order });
}));

module.exports = router;
