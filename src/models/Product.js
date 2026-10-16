const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 5000 },
  category: { type: String, required: true, trim: true, index: true },
  brand: { type: String, trim: true, default: "" },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  imageUrl: { type: String, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: "text", description: "text", category: "text", brand: "text" });
module.exports = mongoose.model("Product", productSchema);
