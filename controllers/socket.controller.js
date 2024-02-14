const Room = require("./models/roomModel");
const { createRoom } = require("./controllers/room");

const userNameList = [];
const addUser = (userName) => {
  userNameList.push(userName);
};
const { Chess } = require("chess.js");

export const {
  disconnecting,
  joinRoom,
  sendMessage,
  ready,
  movePiece,
  cancelSide,
  draw,
  checkMated,
  forfeit,
  disconnect,
} = {
  disconnect: async () => {
    const socketRooms = Array.from(socket.rooms.values());

    //delete if no one in room
    for (const _room of socketRooms) {
      let sockets = await io.in(_room).fetchSockets();
      if (!sockets.length) {
        await Room.deleteOne({ name: _room });
      }
    }

    // delete user from list
    if (userNameList.includes(socket.userName))
      return userNameList.pop(socket.userName);
  },

  disconnecting: async () => {},
  joinRoom: async (userName, roomName, cb) => {
    try {
      // track user
      if (userNameList.includes(userName))
        return cb({ error: "User available" });
      socket.userName = userName;
      addUser(userName);

      // join room
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
    const room = await Room.findOne({ name: roomName });
    try {
      //  assign player to black or white slot if empty
      if ((side == "black" && room.black) || (side == "white" && room.white)) {
        return cb({ error: "Slot is chosen" });
      }
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

      // notify
      io.in(roomName).emit("receive-message", {
        from: "System",
        content: `${userName} chose ${side}`,
      });
      cb({ success: "Side chosen" });

      //   start the game if both black and white are occupied
      const newRoom = await Room.findOne({ name: roomName });
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
    // cancel side selection
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
