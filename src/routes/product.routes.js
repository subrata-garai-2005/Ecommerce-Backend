const router = require("express").Router();
const { z } = require("zod");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const { protect, adminOnly } = require("../middleware/auth.middleware");

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(5000),
  category: z.string().trim().min(1).max(80),
  brand: z.string().trim().max(80).optional(),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  imageUrl: z.string().url().optional().or(z.literal(""))
});

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    filter.price = {};
    if (req.query.minPrice !== undefined) filter.price.$gte = Math.max(0, Number(req.query.minPrice) || 0);
    if (req.query.maxPrice !== undefined) filter.price.$lte = Math.max(0, Number(req.query.maxPrice) || 0);
  }
  if (req.query.search) filter.$text = { $search: String(req.query.search).slice(0, 100) };
  const sortMap = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 } };
  const sort = sortMap[req.query.sort] || { createdAt: -1 };
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);
  res.json({ success: true, data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  res.json({ success: true, data: product });
}));

router.post("/", protect, adminOnly, asyncHandler(async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  const product = await Product.create(parsed.data);
  res.status(201).json({ success: true, data: product });
}));

router.patch("/:id", protect, adminOnly, asyncHandler(async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  const product = await Product.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  res.json({ success: true, data: product });
}));

router.delete("/:id", protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found." });
  res.json({ success: true, message: "Product archived." });
}));

module.exports = router;
