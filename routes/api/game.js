const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Room = require('../../models/Room');
const User = require('../../models/User');
const Game = require('../../models/Game');
const rolesList = require('../../enum/roles');
// const Game = require('../../models/Game');

// @route GET api/game/rooms
// @desc get current player rooms
// @access Private

router.get('/rooms', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    const rooms = admin.rooms;
    res.send(rooms);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});
// @route GET api/game/rooms
// @desc get current player rooms
// @access Private
router.get('/room/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not found room' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }
    res.send(room);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET api/game/room/:id/game
// @desc get current room game
// @access Private
router.get('/room/:id/game', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not found room' });
    }
    if (!room.game) {
      return res.status(404).json({ msg: 'Not found game' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }
    const game = await Game.findById(room.game);
    if (!game) {
      return res.status(404).json({ msg: 'Cannot extract game detail' });
    }
    res.send(game);
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
    res.json(room.id);
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

    let delete_id = -1;
    for (let i in room.players) {
      if (room.players[i].id == req.params.p_id) {
        delete_id = i;
        break;
      }
    }
    if (delete_id < 0 || room.players[delete_id].playing) {
      return res.status(400).json({ msg: 'Bad request' });
    }
    room.players.splice(delete_id, 1);
    await room.save();
    res.json(room.players);
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

    if (room.playing) {
      return res.status(400).json({ msg: 'Cannot delete a playing room' });
    }

    const user = await User.findById(room.admin);
    let room_index = -1;
    user.rooms.forEach((room, index) => {
      if (room.toString() == req.params.id) {
        room_index = index;
      }
    });
    if (room_index > -1) {
      user.rooms.splice(room_index, 1);
    } else {
      return res.status(404).json({ msg: 'Not found room belong to admin' });
    }
    await room.remove();
    await user.save();
    res.json(user.rooms);
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
    console.log(roles);
    let counter = {};
    for (let key in rolesList) {
      counter[rolesList[key]] = 0;
    }
    for (let player of room.players) {
      if (roles[player.id]) {
        player.role = roles[player.id];
        if (
          player.role != rolesList.normal &&
          player.role != rolesList.super_infected
        ) {
          counter[player.role]++;
          if (counter[player.role] > 1) {
            return res
              .status(400)
              .json({ msg: 'Duplicated role cannot be set' });
          }
        }
      } else {
        return res.status(400).json({ msg: 'Every player must have a role' });
      }
    }
    if (
      !(
        counter[rolesList.super_infected_hidden] &&
        counter[rolesList.doctor] &&
        counter[rolesList.police] &&
        counter[rolesList.mask_distributor]
      )
    ) {
      return res.status(400).json({ msg: 'An important role is missed' });
    }
    await room.save();
    res.json(room.players);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route PUT api/game/room/:id/point
// @desc update target point
// @access Private
router.put('/room/:id/point', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Not Found Room' });
    }
    if (room.admin.toString() != req.user.id) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }
    let point = req.body.target_point;
    room.target_point = point;
    await room.save();
    res.json(room.target_point);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Server error' });
  }
});
module.exports = router;
