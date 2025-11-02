// server.mts
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import Room from "./models/Room.mjs";
import User from "./models/User.mjs";
import Message from "./models/Message.mjs";
// import { Message } from "./models/Message.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // connect to DB early
  try {
    await connectDB();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }

  const httpServer = createServer((req, res) => {
    return handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // client asks for current rooms list
    socket.on("get-rooms", async () => {
      try {
        const rooms = await Room.find({}, { name: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
        socket.emit("rooms-list", rooms);
      } catch (err) {
        console.error("get-rooms error:", err);
      }
    });

    // create room (name must be unique)
    socket.on("create-room", async (payload: { name: string }, callback?: (res: any) => void) => {
      const { name } = payload || {};
      if (!name || !name.trim()) {
        if (callback) callback({ success: false, error: "Invalid room name" });
        return;
      }
      try {
        const existing = await Room.findOne({ name }).lean();
        if (existing) {
          if (callback) callback({ success: false, error: "Room already exists" });
          return;
        }
        const room = new Room({ name });
        await room.save();
        // broadcast new rooms list to everybody
        const rooms = await Room.find({}, { name: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
        io.emit("rooms-list", rooms);
        if (callback) callback({ success: true, room });
      } catch (err) {
        console.error("create-room error:", err);
        if (callback) callback({ success: false, error: String(err) });
      }
    });

    // join a room (room is string name)
    socket.on(
      "join-room",
      async (payload: { room: string; username: string }, callback?: (res: any) => void) => {
        try {
          const { room, username } = payload;
          if (!room || !username) {
            if (callback) callback({ success: false, error: "Missing room or username" });
            return;
          }
          socket.join(room);
          socket.to(room).emit("user_joined", `${username} has joined the room`);
          // fetch last N messages to send to this user
          const recent = await Message.find({ room })
            .sort({ createdAt: 1 })
            .limit(500)
            .lean();
          socket.emit("room-messages", recent);
          if (callback) callback({ success: true });
        } catch (err) {
          console.error("join-room error:", err);
          if (callback) callback({ success: false, error: String(err) });
        }
      }
    );

    // send message -> persist and broadcast
    socket.on("send-message", async (payload: { room: string; username: string; message: string }) => {
      try {
        const { room, username, message } = payload;
        if (!room || !username || !message) return;
        const msgDoc = new Message({
          room,
          sender: username,
          message,
        });
        await msgDoc.save();
        io.to(room).emit("receive-message", { username, message, createdAt: msgDoc.createdAt });
      } catch (err) {
        console.error("send-message error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
  });
});
