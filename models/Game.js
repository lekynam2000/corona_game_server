const mongoose = require('mongoose');
const roles = require('../enum/roles');
const phases = require('../enum/phases');
const GameSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  map: [[{ type: Boolean }]],
  // pos: [[{ type: Number }]],
  target_point: {
    type: Number,
    required: true,
  },
  point: {
    type: Number,
    default: 0,
  },
  quara_num: {
    type: Number,
    required: true,
  },
  players: [
    {
      arr_id: {
        type: Number,
        require: true,
      },
      name: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: Object.values(roles),
        default: roles.normal,
      },
      infected: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      has_mask: {
        type: Boolean,
        default: false,
      },
      had_infect: {
        type: Boolean,
        default: false,
      },
      place: {
        type: Number,
        default: -1,
      },
      moved: {
        type: Boolean,
        default: false,
      },
      quarantined: {
        type: Boolean,
        defalt: false,
      },
    },
  ],
  turn: {
    type: Number,
    default: 0,
  },
  phase: {
    type: String,
    enum: Object.values(phases),
    default: phases.move,
  },
  moved_num: {
    type: Number,
    default: 0,
  },
});
module.exports = Game = mongoose.model('games', GameSchema);

// Map description:
// 0: Canteen 2
// 1: The Arc
// 2: Nanyang Auditorium
// 3: The Hive
// 4: Yuunan Garden
// 5: Hall 6
// 6: Fullerton
