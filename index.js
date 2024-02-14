const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { setupSocketRoute } = require("./routes/socket.route");

//setup server
const PORT = 8000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Sockets
setupSocketRoute(io);
app.use(express.json());
app.get("/", (req, res) => res.send("Hello World"));
server.listen(process.env.PORT || PORT, () => {
  console.log(`Run on port ${PORT} `);
});
