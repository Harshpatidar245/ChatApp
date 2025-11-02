// lib/db.mts
import mongoose from "mongoose";

const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb+srv://harpatidar:EPX6Y3zeH4jaQtVL@company.3fvv1ri.mongodb.net/?retryWrites=true&w=majority&appName=Company";

let cached = (global as any)._mongoose;
if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const options = {
      bufferCommands: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    };
    cached.promise = mongoose.connect(mongoUrl, options).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
