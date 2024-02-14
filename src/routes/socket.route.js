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
  disconnect,
} = require("../controllers/socket.controller");

const setupSocketRoute = (io) => {
  io.on("connect", async (socket) => {
    socket.on("disconnect", disconnect);
    // room and chat
    // socket.once("disconnecting", disconnecting);
    socket.on("join-room", joinRoom);
    socket.on("send-message", sendMessage);
    // socket.on("system-message", (content, roomName) => {
    //   io.in(roomName).emit("receive-message", {
    //     from: "System",
    //     content: content,
    //   });
    // pregame and mid game
    socket.on("ready", ready);
    socket.on("move", movePiece);
    socket.on("cancel-side", cancelSide);

    // end game
    socket.on("draw", draw);
    socket.on("checkmated", checkMated);
    socket.on("forfeit", forfeit);

    // socket.on("send-time", (option, side, roomName) => {
    //   if (option === "reset")
    //     return io
    //       .in(roomName)
    //       .emit("receive-time", { option: "reset", side: side });
    //   if (option === "resume")
    //     return io
    //       .in(roomName)
    //       .emit("receive-time", { option: "resume", side: side });
    //   if (option === "pause")
    //     return io
    //       .in(roomName)
    //       .emit("receive-time", { option: "pause", side: side });
    // });
    // socket.on("timeout", (lostSide, roomName) => {
    //   io.in(roomName).emit("end-game", { lostSide: lostSide });
    // });
  });
};

module.exports = { setupSocketRoute };
