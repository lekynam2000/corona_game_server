require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const cors = require('cors');
const roomFunc = require('./socket/roomFunc');
// Connect Database
connectDB();
const PORT = process.env.PORT || 5000;
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies
app.use(cors({ origin: '*' }));
// Settings for CORS
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/game', require('./routes/api/game'));
io.origins('*:*');
const nsp = io.of(/^\/room_.*/);

if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}
nsp.on('connection', (socket) => {
  roomFunc(socket);
});
http.listen(PORT, () => console.log(`Server started on port ${PORT}`));
