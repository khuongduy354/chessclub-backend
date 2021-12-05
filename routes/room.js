const express = require("express");
const router = express.Router();
const { createRoom } = require("../controllers/room");
baseUrl = "http://localhost:8000";
router.post(baseUrl + "/create-room", createRoom);

module.exports = router;
