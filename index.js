const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // roomId => [socketId1, socketId2]

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
    }

    console.log(`User ${socket.id} joined room ${roomId}`);

    const usersInRoom = rooms[roomId].filter(id => id !== socket.id);

    if (usersInRoom.length === 1) {
      // Notify existing user that a new peer has joined
      io.to(usersInRoom[0]).emit("user-joined", { newUser: socket.id });
    }

    socket.on("disconnect", () => {
      console.log(`🔴 Disconnected: ${socket.id}`);

      rooms[roomId] = (rooms[roomId] || []).filter(id => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        socket.to(roomId).emit("user-left", { leaver: socket.id });
      }
    });
  });

  socket.on("offer", ({ roomId, sdp }) => {
    const other = rooms[roomId]?.find(id => id !== socket.id);
    if (other) io.to(other).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    const other = rooms[roomId]?.find(id => id !== socket.id);
    if (other) io.to(other).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    const other = rooms[roomId]?.find(id => id !== socket.id);
    if (other) io.to(other).emit("ice-candidate", { candidate });
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
