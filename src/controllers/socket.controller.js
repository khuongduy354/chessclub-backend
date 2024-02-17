const userNameList = [];
const addUser = (userName) => {
  userNameList.push(userName);
};

const { Chess } = require("chess.js");
const {
  deleteRoom,
  findAndPatchRoom,
  findRoomByName,
  createRoom,
} = require("../helper/room");

class SocketController {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;
  }
  disconnect = async () => {};
  disconnecting = async () => {
    const socketRooms = Array.from(this.socket.rooms.values());

    for (const _room of socketRooms) {
      let sockets = await this.io.in(_room).fetchSockets();
      const room = findRoomByName(_room);
      if (!sockets.length) {
        //delete if no one in room
        deleteRoom(_room);
      } else if (room) {
        // reset game if player disconnect
        const room = findRoomByName(_room);
        if (
          room.black === this.socket.userName ||
          room.white === this.socket.userName
        ) {
          const resetedRoom = findAndPatchRoom(_room, {
            black: null,
            white: null,
            game: null,
          });
          this.io.in(_room).emit("load-game", resetedRoom);
        }
      }
    }

    // delete user from list
    if (userNameList.includes(this.socket.userName))
      userNameList.pop(this.socket.userName);

    this.socket.disconnect();
  };
  joinRoom = async (userName, roomName, cb) => {
    try {
      // track user
      if (userNameList.includes(userName))
        return cb({ error: "User available" });

      this.socket.userName = userName;
      addUser(userName);

      // join room
      const roomExist = findRoomByName(roomName);
      if (!roomExist) {
        const newRoom = createRoom(roomName);
        if (!newRoom) return cb({ error: "Can't create room" });
      }
      this.socket.join(roomName);
      if (roomExist) {
        this.io.in(roomName).emit("load-game", roomExist);
      }
      this.io.in(roomName).emit("receive-message", {
        from: "System",
        content: `${userName} has joined`,
      });
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
    const room = findRoomByName(roomName);
    try {
      //  assign player to black or white slot if empty
      if ((side == "black" && room.black) || (side == "white" && room.white)) {
        return cb({ error: "Slot is chosen" });
      }
      if (side == "black") {
        if (room.white === userName)
          return cb({ error: "You cant chose 2 side!" });
        findAndPatchRoom(roomName, { black: userName });
        this.io.in(roomName).emit("chose-black", userName);
      }
      if (side == "white") {
        if (room.black === userName)
          return cb({ error: "You cant chose 2 side!" });
        findAndPatchRoom(roomName, { white: userName });
        this.io.in(roomName).emit("chose-white", userName);
      }

      // notify
      this.io.in(roomName).emit("receive-message", {
        from: "System",
        content: `${userName} chose ${side}`,
      });
      cb({ success: "Side chosen" });

      //   start the game if both black and white are occupied
      const newRoom = findRoomByName(roomName);
      if (newRoom.black && newRoom.white) {
        this.io.in(roomName).emit("start-game");
        const newGame = new Chess();
        findAndPatchRoom(roomName, { game: newGame.fen() });
        this.io.in(roomName).emit("update-game", newGame.fen());
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
      findAndPatchRoom(roomName, { game: movedFen });
      this.io.in(roomName).emit("update-game", movedFen);
    } catch (e) {
      console.log(e);
      cb({ error: "Cant not make move" });
    }
  };
  cancelSide = async (side, roomName) => {
    // cancel side selection
    if (side === "black") {
      findAndPatchRoom(roomName, { black: null });
      this.io.in(roomName).emit("chose-black", null);
    }
    if (side === "white") {
      findAndPatchRoom(roomName, { white: null });
      this.io.in(roomName).emit("chose-white", null);
    }
  };
  draw = async (roomName) => {
    findAndPatchRoom(roomName, { black: null, white: null, game: null });
    this.io.in(roomName).emit("chose-black", null);
    this.io.in(roomName).emit("chose-white", null);
    this.io.in(roomName).emit("end-game", { draw: true });
  };
  checkMated = async (lostSide, roomName) => {
    findAndPatchRoom(roomName, { black: null, white: null, game: null });
    this.io.in(roomName).emit("chose-black", null);
    this.io.in(roomName).emit("chose-white", null);
    this.io.in(roomName).emit("end-game", { lostSide });
  };
  forfeit = async (userName, roomName, side) => {
    findAndPatchRoom(roomName, { white: null, game: null, black: null });
    this.io.in(roomName).emit("forfeit", side);
    const lostSide = side === "black" ? "white" : "black";
    this.io.in(roomName).emit("end-game", { lostSide });
    this.io.in(roomName).emit("receive-message", {
      from: "System",
      content: `${userName} forfeited`,
    });
  };
}

module.exports = { SocketController };
