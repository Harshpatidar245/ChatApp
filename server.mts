import { createServer } from "node:http";
import { Server } from "socket.io";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ room, username }, callback) => {
      try {
        socket.join(room);
        console.log(`${username} joined ${room}`);
        socket.to(room).emit("user_joined", `${username} has joined the room`);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error("Join error:", err);
        if (callback) callback({ success: false });
      }
    });

    socket.on("send-message", ({ room, username, message }) => {
      console.log(`Message from ${username} in room ${room}: ${message}`);
      io.to(room).emit("receive-message", { username, message });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`Server is running on http://${hostname}:${port}`);
  });
});
