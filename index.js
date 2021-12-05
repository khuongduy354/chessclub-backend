const express = require("express");
const app = express();
const PORT = 8000;
const roomRouter = require("./routes/room");
const Room = require("./models/roomModel");
const _global = require("./_global");
// Setup Server
const http = require("http");
const server = http.createServer(app);
//Setup Socket
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: [_global.CLIENT_URL] } });
// Atlas
const { createRoom } = require("./controllers/room");
const mongoose = require("mongoose");
const mongoDB =
  "mongodb+srv://khuongduy354:1234567891duy@cluster0.tnjsm.mongodb.net/chessclub?retryWrites=true&w=majority";
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
// Temporary Usernames
const userNameList = [];
const addUser = (userName) => {
  userNameList.push(userName);
};
// Chess
const { Chess } = require("chess.js");
// Sockets

io.on("connect", async (socket) => {
  // ***************** Start Function *********
  const {
    disconnecting,
    joinRoom,
    sendMessage,
    ready,
    movePiece,
    cancelSide,
    draw,
    checkMated,
    forfeit,
  } = {
    disconnecting: async () => {
      const socketRooms = Array.from(socket.rooms.values());
      socket.disconnect();
      for (const _room of socketRooms) {
        let sockets = await io.in(_room).fetchSockets();
        if (!sockets.length) {
          const deleteRoom = await Room.deleteOne({ name: _room });
        }
      }
    },
    joinRoom: async (userName, roomName, cb) => {
      try {
        if (userNameList.includes(userName))
          return cb({ error: "User available" });
        socket.userName = userName;
        addUser(userName);
        const roomExist = await Room.findOne({ name: roomName });
        if (roomExist) {
          socket.join(roomName);
          return;
        } else {
          const { result, error } = await createRoom(roomName);
          if (error) return cb({ error: "Can't create room" });
          socket.join(roomName);
          io.in(roomName).emit("receive-message", {
            from: "System",
            content: `${userName} has joined`,
          });
        }
      } catch (e) {
        console.log(e);
        cb({ error: "Cannot create room" });
      }
    },
    sendMessage: (msg, roomName, userName) => {
      const response = {
        from: userName,
        content: msg,
      };
      io.in(roomName).emit("receive-message", response);
    },
    ready: async (userName, roomName, side, cb) => {
      //   find the room and check if black or white is occupied
      const room = await Room.findOne({ name: roomName });
      try {
        if (
          (side == "black" && room.black) ||
          (side == "white" && room.white)
        ) {
          return cb({ error: "Slot is chosen" });
        }
        //  assigned player to black or white slot if empty
        if (side == "black") {
          const updated = await Room.findOneAndUpdate(
            { name: roomName },
            { black: userName },
            { new: true }
          );
          io.in(roomName).emit("chose-black", userName);
        }
        if (side == "white") {
          const updated = await Room.findOneAndUpdate(
            { name: roomName },
            { white: userName },
            { new: true }
          );
          io.in(roomName).emit("chose-white", userName);
        }
        io.in(roomName).emit("receive-message", {
          from: "System",
          content: `${userName} chose ${side}`,
        });
        cb({ success: "Side chosen" });
        const newRoom = await Room.findOne({ name: roomName });
        //   start the game if both black and white are occupied
        if (newRoom.black && newRoom.white) {
          io.in(roomName).emit("start-game");
          const newGame = new Chess();
          await Room.findOneAndUpdate(
            { name: roomName },
            { game: newGame.fen() }
          );
          io.to(roomName).emit("update-game", newGame.fen());
        }
      } catch (e) {
        console.log(e);
        cb({ error: "Unable to pick side" });
      }
    },
    movePiece: (movedFen, roomName, cb) => {
      try {
        // const updated = await Room.findOneAndUpdate(
        //   { name: roomName },
        //   {
        //     game: movedFen,
        //   },
        //   { new: true }
        // );
        io.in(roomName).emit("update-game", movedFen);
      } catch (e) {
        console.log(e);
        cb({ error: "Cant not make move" });
      }
    },
    cancelSide: async (side, roomName) => {
      if (side === "black") {
        await Room.findOneAndUpdate({ name: roomName }, { black: null });
        io.in(roomName).emit("chose-black", null);
      }
      if (side === "white") {
        await Room.findOneAndUpdate({ name: roomName }, { white: null });
        io.in(roomName).emit("chose-white", null);
      }
    },
    draw: async (roomName) => {
      const room = await Room.findOneAndUpdate(
        { name: roomName },
        { black: null, white: null }
      );
      io.in(roomName).emit("chose-black", null);
      io.in(roomName).emit("chose-white", null);
      io.in(roomName).emit("end-game", { draw: true });
    },
    checkMated: async (lostSide, roomName) => {
      const room = await Room.findOneAndUpdate(
        { name: roomName },
        { black: null, white: null }
      );
      io.in(roomName).emit("chose-black", null);
      io.in(roomName).emit("chose-white", null);
      io.in(roomName).emit("end-game", { lostSide: lostSide });
    },
    forfeit: async (userName, roomName, side) => {
      if (side === "white")
        await Room.findOneAndUpdate({ name: roomName }, { white: null });
      if (side === "black")
        await Room.findOneAndUpdate({ name: roomName }, { black: null });
      io.in(roomName).emit("forfeit", side);
      io.in(roomName).emit("receive-message", {
        from: "System",
        content: `${userName} forfeited`,
      });
    },
  };
  // ******** END FUNCTIONS **************
  socket.on("disconnect", () => {
    if (userNameList.includes(socket.userName))
      return userNameList.pop(socket.userName);
  });
  socket.once("disconnecting", disconnecting);
  socket.on("join-room", joinRoom);
  socket.on("send-message", sendMessage);
  socket.on("ready", ready);
  socket.on("move", movePiece);
  socket.on("cancel-side", cancelSide);
  socket.on("draw", draw);
  socket.on("checkmated", checkMated);
  socket.on("system-message", (content, roomName) => {
    io.in(roomName).emit("receive-message", {
      from: "System",
      content: content,
    });
  });
  socket.on("forfeit", forfeit);
});
app.use(express.json());
app.get("/", (req, res) => res.send("Hello World"));
server.listen(process.env.PORT || PORT);
