const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Room = require('../../models/Room');
const User = require('../../models/User');
// const Game = require('../../models/Game');

// @route GET api/game/room
// @desc get current player rooms
// @access Private

router.get('/room', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    const rooms = await Room.find({
      _id: { $in: admin.rooms },
    });
    res.send(rooms);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route POST api/game/room
// @desc create new game room
// @access Private

router.post('/room', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const newRoom = new Room({
      admin: req.user.id,
    });
    const room = await newRoom.save();
    user.rooms.push(room._id);
    await user.save();
    res.json(room);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route DELETE api/game/room/:id/:p_id
// @desc delete player in game room
// @access Private
router.delete('/room/:id/:p_id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not Found Room' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }
    for (let player of room.players) {
      if (player.connected) {
        return res
          .status(400)
          .json({ msg: 'Cannot delete room with players connected' });
      }
    }
    let delete_id = -1;
    for (let id in room.players) {
      if (room.players[id].id == req.params.p_id) {
        delete_id = id;
        break;
      }
    }
    if (delete_id < 0) {
      return res.status(400).json({ msg: 'Bad request' });
    }
    room.players.splice(delete_id, 1);
    await room.save();
    res.json(room);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route DELETE api/game/room/:id
// @desc delete game room
// @access Private

router.delete('/room/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not Found Room' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }
    for (let player of room.players) {
      if (player.connected) {
        return res
          .status(400)
          .json({ msg: 'Cannot delete room with players connected' });
      }
    }
    const user = await User.findById(room.admin);
    let room_index = -1;
    user.rooms.forEach((room, index) => {
      if (room.toString() == req.params.id) {
        room_index = index;
      }
    });
    await user.save();
    if (room_index > -1) {
      user.rooms.splice(room_index, 1);
    } else {
      return res.status(404).json({ msg: 'Not found room belong to admin' });
    }
    await room.remove();
    res.json('Room deleted');
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route PUT api/game/room/:id/roles
// @desc update roles
// @access Private
router.put('/room/:id/roles', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not Found Room' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }
    let roles = req.body.roles;
    for (let player of room.players) {
      if (roles[player.id]) {
        player.role = roles[player.id];
      } else {
        player.role = null;
      }
    }
    await room.save();
    res.json(room);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});
