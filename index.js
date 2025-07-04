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

const rooms = {}; // { roomId: [socket1, socket2] }

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
      console.log(`User ${socket.id} joined room ${roomId}`);
    }

    socket.join(roomId);

    const room = rooms[roomId];
    if (room.length === 2) {
      // Notify ONLY the second user to send offer
      const [user1, user2] = room;
      io.to(user2).emit("user-joined"); // let second user send offer
    }

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

  socket.on("offer", ({ roomId, sdp }) => {
    const target = rooms[roomId]?.find(id => id !== socket.id);
    if (target) {
      io.to(target).emit("offer", { sdp });
    }
  });

  socket.on("answer", ({ roomId, sdp }) => {
    const target = rooms[roomId]?.find(id => id !== socket.id);
    if (target) {
      io.to(target).emit("answer", { sdp });
    }
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    const target = rooms[roomId]?.find(id => id !== socket.id);
    if (target) {
      io.to(target).emit("ice-candidate", { candidate });
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
