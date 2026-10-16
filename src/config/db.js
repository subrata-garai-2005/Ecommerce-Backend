const mongoose = require("mongoose");
const dns = require("dns");

// Ensure MongoDB Atlas SRV lookup succeeds on systems where local DNS rejects SRV records
dns.setServers(["8.8.8.8", "1.1.1.1"]);

module.exports = async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in .env");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};
