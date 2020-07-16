const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'games',
  },
  players: [
    {
      name: {
        type: String,
        required: true,
      },
      connected: {
        type: Boolean,
      },
      playing: {
        type: Boolean,
      },
    },
  ],
});
module.exports = Room = mongoose.model('rooms', RoomSchema);
