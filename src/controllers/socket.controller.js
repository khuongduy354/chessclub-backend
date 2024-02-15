const { Room } = require("../helper/mongo");
const { createRoom } = require("../helper/room");

const userNameList = [];
const addUser = (userName) => {
  userNameList.push(userName);
};
const { Chess } = require("chess.js");
class SocketController {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;
  }
  disconnect = async () => {
    const socketRooms = Array.from(this.socket.rooms.values());

    //delete if no one in room
    for (const _room of socketRooms) {
      let sockets = await this.io.in(_room).fetchSockets();
      if (!sockets.length) {
        await Room.deleteOne({ name: _room });
      }
    }

    // delete user from list
    if (userNameList.includes(this.socket.userName))
      return userNameList.pop(this.socket.userName);
  };

  disconnecting = async () => {};
  joinRoom = async (userName, roomName, cb) => {
    try {
      // track user
      if (userNameList.includes(userName))
        return cb({ error: "User available" });
      this.socket.userName = userName;
      addUser(userName);

      // join room
      const roomExist = await Room.findOne({ name: roomName });
      if (roomExist) {
        this.socket.join(roomName);
        return;
      } else {
        const { result, error } = await createRoom(roomName);
        if (error) return cb({ error: "Can't create room" });
        this.socket.join(roomName);
        this.io.in(roomName).emit("receive-message", {
          from: "System",
          content: `${userName} has joined`,
        });
      }
    } catch (e) {
      console.log(e);
      cb({ error: "Cannot create room" });
    }
  };
  sendMessage = (msg, roomName, userName) => {
    const response = {
      from: userName,
      content: msg,
    };
    this.io.in(roomName).emit("receive-message", response);
  };

  ready = async (userName, roomName, side, cb) => {
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
        this.io.in(roomName).emit("chose-black", userName);
      }
      if (side == "white") {
        const updated = await Room.findOneAndUpdate(
          { name: roomName },
          { white: userName },
          { new: true }
        );
        this.io.in(roomName).emit("chose-white", userName);
      }

      // notify
      this.io.in(roomName).emit("receive-message", {
        from: "System",
        content: `${userName} chose ${side}`,
      });
      cb({ success: "Side chosen" });

      //   start the game if both black and white are occupied
      const newRoom = await Room.findOne({ name: roomName });
      if (newRoom.black && newRoom.white) {
        this.io.in(roomName).emit("start-game");
        const newGame = new Chess();
        await Room.findOneAndUpdate(
          { name: roomName },
          { game: newGame.fen() }
        );
        this.io.to(roomName).emit("update-game", newGame.fen());
      }
    } catch (e) {
      console.log(e);
      cb({ error: "Unable to pick side" });
    }
  };
  movePiece = (movedFen, roomName, cb) => {
    try {
      // const updated = await Room.findOneAndUpdate(
      //   { name: roomName },
      //   {
      //     game: movedFen,
      //   },
      //   { new: true }
      // );
      this.io.in(roomName).emit("update-game", movedFen);
    } catch (e) {
      console.log(e);
      cb({ error: "Cant not make move" });
    }
  };
  cancelSide = async (side, roomName) => {
    // cancel side selection
    if (side === "black") {
      await Room.findOneAndUpdate({ name: roomName }, { black: null });
      this.io.in(roomName).emit("chose-black", null);
    }
    if (side === "white") {
      await Room.findOneAndUpdate({ name: roomName }, { white: null });
      this.io.in(roomName).emit("chose-white", null);
    }
  };
  draw = async (roomName) => {
    const room = await Room.findOneAndUpdate(
      { name: roomName },
      { black: null, white: null }
    );
    this.io.in(roomName).emit("chose-black", null);
    this.io.in(roomName).emit("chose-white", null);
    this.io.in(roomName).emit("end-game", { draw: true });
  };
  checkMated = async (lostSide, roomName) => {
    const room = await Room.findOneAndUpdate(
      { name: roomName },
      { black: null, white: null }
    );
    this.io.in(roomName).emit("chose-black", null);
    this.io.in(roomName).emit("chose-white", null);
    this.io.in(roomName).emit("end-game", { lostSide: lostSide });
  };
  forfeit = async (userName, roomName, side) => {
    if (side === "white")
      await Room.findOneAndUpdate({ name: roomName }, { white: null });
    if (side === "black")
      await Room.findOneAndUpdate({ name: roomName }, { black: null });
    this.io.in(roomName).emit("forfeit", side);
    this.io.in(roomName).emit("receive-message", {
      from: "System",
      content: `${userName} forfeited`,
    });
  };
}

module.exports = { SocketController };
