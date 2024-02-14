const { Room } = require("../helper/mongo");
module.exports = {
  createRoom: async (roomName) => {
    try {
      const result = await Room.create({
        name: roomName,
      });
      return result;
    } catch (e) {
      console.log(e);
      return { error: "Cant create room" };
    }
  },
};
