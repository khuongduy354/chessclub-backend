const mongoose = require("mongoose");
const roomModel = mongoose.model(
  "Room",
  new mongoose.Schema({
    name: { type: String, unique: true },
    game: String,
    black: String,
    white: String,
  })
);
module.exports = roomModel;
