// getting-started.js
const mongoose = require("mongoose");

setupDB = () => {
  main()
    .catch((err) => console.log(err))
    .then(() => {
      console.log("Connected");
      // Room.find({}, (err, data) => {
      //   console.log(data);
      // });
    });
};
const Room = mongoose.model("Room", new mongoose.Schema({}), "Room");
async function main() {
  mongoose.connect(process.env.MONGO_URI);
}

module.exports = { Room, setupDB };
