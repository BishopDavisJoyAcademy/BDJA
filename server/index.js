const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", ({ roomId, userId, role }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId).set(userId, { socketId: socket.id, role });
    socket.to(roomId).emit("user-joined", { userId, role });
    socket.emit("room-users", Array.from(rooms.get(roomId).keys()));
  });

  socket.on("offer", ({ roomId, offer, targetId }) => {
    socket.to(roomId).emit("offer", { offer, senderId: socket.id, targetId });
  });

  socket.on("answer", ({ roomId, answer, targetId }) => {
    socket.to(roomId).emit("answer", { answer, senderId: socket.id, targetId });
  });

  socket.on("ice-candidate", ({ roomId, candidate, targetId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, senderId: socket.id, targetId });
  });

  socket.on("screen-share", ({ roomId, userId, isSharing }) => {
    socket.to(roomId).emit("screen-share", { userId, isSharing });
  });

  socket.on("raise-hand", ({ roomId, userId }) => {
    socket.to(roomId).emit("raise-hand", { userId });
  });

  socket.on("disconnect", () => {
    rooms.forEach((users, roomId) => {
      users.forEach((data, userId) => {
        if (data.socketId === socket.id) {
          users.delete(userId);
          socket.to(roomId).emit("user-left", { userId });
        }
      });
    });
  });
});

const PORT = process.env.SIGNALING_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`BDJA Signaling Server running on port ${PORT}`);
});
