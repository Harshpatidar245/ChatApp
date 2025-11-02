import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  joinedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
});

const User = models.User || model("User", UserSchema);
export default User;
