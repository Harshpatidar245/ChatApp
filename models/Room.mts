// models/Room.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoom extends Document {
  name: string;
  createdAt: Date;
}

const RoomSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const Room: Model<IRoom> =
  (mongoose.models.Room as Model<IRoom>) || mongoose.model<IRoom>("Room", RoomSchema);
