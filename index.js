const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*", // for dev only — restrict in production
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // roomId => [socketId1, socketId2]

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
      console.log(`User ${socket.id} joined room ${roomId}`);
    }

    const others = rooms[roomId].filter(id => id !== socket.id);

    // 🔐 Notify new user only if exactly one other user is in room (1-on-1)
    if (others.length === 1) {
      io.to(socket.id).emit("user-joined");
    }

    // ✅ Handle disconnection
    socket.on("disconnect", () => {
      console.log(`🔴 Disconnected: ${socket.id}`);
      socket.to(roomId).emit("user-left");

      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }
    });
  });

  // 📡 Send offer to other peer in room
  socket.on("offer", ({ roomId, sdp }) => {
    const otherUser = rooms[roomId]?.find(id => id !== socket.id);
    if (otherUser) {
      io.to(otherUser).emit("offer", { sdp });
    }
  });

  // ✅ Send answer back to offerer
  socket.on("answer", ({ roomId, sdp }) => {
    const otherUser = rooms[roomId]?.find(id => id !== socket.id);
    if (otherUser) {
      io.to(otherUser).emit("answer", { sdp });
    }
  });

  // ❄️ Forward ICE candidates
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    const otherUser = rooms[roomId]?.find(id => id !== socket.id);
    if (otherUser) {
      io.to(otherUser).emit("ice-candidate", { candidate });
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
