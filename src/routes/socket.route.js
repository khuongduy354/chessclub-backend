const { SocketController } = require("../controllers/socket.controller");
const setupSocketRoute = (io) => {
  io.on("connect", async (socket) => {
    const controller = new SocketController(io, socket);

    socket.on("disconnect", controller.disconnect);
    // room and chat
    // socket.once("disconnecting", disconnecting);
    socket.on("join-room", controller.joinRoom);
    socket.on("send-message", controller.sendMessage);
    // socket.on("system-message", (content, roomName) => {
    //   io.in(roomName).emit("receive-message", {
    //     from: "System",
    //     content: content,
    //   });
    // pregame and mid game
    socket.on("ready", controller.ready);
    socket.on("move", controller.movePiece);
    socket.on("cancel-side", controller.cancelSide);

    // end game
    socket.on("draw", controller.draw);
    socket.on("checkmated", controller.checkMated);
    socket.on("forfeit", controller.forfeit);

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
