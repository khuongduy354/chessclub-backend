const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { setupSocketRoute } = require("./src/routes/socket.route");
const { setupDB } = require("./src/helper/mongo");
const { configDotenv } = require("dotenv");

//setup server
configDotenv();
// setupDB();
const PORT = 8000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

setupSocketRoute(io);

app.use(express.json());
app.get("/", (req, res) => res.send("Hello World"));

server.listen(process.env.PORT || PORT, () => {
  console.log(`Run on port ${PORT} `);
});
