const sampleRoom = {
  name: "sample room",
  black: null,
  white: null,
  game: null,
};
const rooms = [sampleRoom];
const createRoom = (roomName) => {
  if (rooms.find((room) => room.name === roomName)) {
    return null;
  }
  const newRoom = { name: roomName, black: null, white: null, game: null };
  rooms.push(newRoom);
  return newRoom;
};
const deleteRoom = (roomName) => {
  const room = rooms.find((room) => room.name === roomName);
  if (room === undefined) {
    return null;
  }
  return room;
};
const findRoomByName = (roomName) => {
  const room = rooms.find((room) => room.name === roomName);
  if (room === undefined) {
    return null;
  }
  return room;
};
const findAndPatchRoom = (roomName, update) => {
  const idx = rooms.findIndex((room) => room.name === roomName);
  if (idx === -1) {
    return null;
  }
  const oldRoom = rooms[idx];
  const updatedRoom = { ...oldRoom, ...update };
  rooms[idx] = updatedRoom;
  return updatedRoom;
};

module.exports = {
  createRoom,
  deleteRoom,
  findRoomByName,
  findAndPatchRoom,
};
