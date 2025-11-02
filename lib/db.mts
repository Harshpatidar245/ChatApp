// lib/db.ts
import mongoose from "mongoose";

const mongoUrl = process.env.MONGODB_URI || "mongodb+srv://harpatidar:EPX6Y3zeH4jaQtVL@company.3fvv1ri.mongodb.net/?retryWrites=true&w=majority&appName=Company";

let cached = (global as any)._mongoose;

if (!cached) {
  cached = (global as any)._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // add other options as needed
    };
    cached.promise = mongoose.connect(mongoUrl, opts).then((mongoosePkg) => {
      return mongoosePkg;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
