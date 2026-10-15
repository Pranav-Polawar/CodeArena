
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI or MONGODB_URI is missing from backend/.env"
      );
    }

    console.log("[MongoDB] Connecting to Atlas...");

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      "[MongoDB] Connected successfully to:",
      mongoose.connection.name
    );
  } catch (err) {
    console.error("[MongoDB] Connection failed!");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code || "N/A");

    if (err.cause) {
      console.error("Underlying cause:", err.cause);
    }
  }
};

module.exports = connectDB;
