const mongoose = require('mongoose');
const roles = require('../enum/roles');

const RoomSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  playing: {
    type: Boolean,
    default: false,
  },
  target_point: {
    type: Number,
    default: 150,
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
        default: false,
      },
      role: {
        type: String,
        enum: Object.values(roles),
      },
    },
  ],
});
module.exports = Room = mongoose.model('rooms', RoomSchema);
