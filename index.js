// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for dev; restrict in production
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  socket.on("join-room", (roomId) => {
    console.log(`User ${socket.id} joined room: ${roomId}`);

    socket.join(roomId);
    const room = rooms[roomId] || [];
    rooms[roomId] = [...room, socket.id];

    if (room.length > 0) {
      // Notify existing user to send an offer
      socket.to(roomId).emit("user-joined");
    }

    // Cleanup when user disconnects
    socket.on("disconnect", () => {
      console.log(`🔴 User ${socket.id} disconnected`);
      socket.to(roomId).emit("user-left");

      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    });
  });

  socket.on("offer", ({ roomId, sdp }) => {
    console.log("📡 Offer sent");
    socket.to(roomId).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    console.log("✅ Answer sent");
    socket.to(roomId).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
