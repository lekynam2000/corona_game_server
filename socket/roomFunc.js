const User = require('../models/User');
const Room = require('../models/Room');
const Game = require('../models/Game');
const roles = require('../enum/roles');
const phases = require('../enum/phases');
module.exports = async function (socket) {};
function inArray(array, id, keyCompare = null) {
  let index;
  array.forEach((el, _index) => {
    if (keyCompare) {
      if (el[keyCompare].toString().localeCompare(id) === 0) {
        index = _index;
      }
    } else {
      if (el.toString().localeCompare(id) === 0) {
        index = _index;
      }
    }
  });
  if (index > -1) {
    return index;
  }
  return -1;
}
async function addPlayer(socket, name, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    room.players.push({ name, connected: true });
    await room.save();
    socket.emit('getId', { id: room.players[-1]._id });
    nsp.emit('updatePlayers', { players: room.players });
  } catch (error) {
    console.error(error);
    socket.emit('errorGame', { msg: 'Internal Server Error' });
  }
}
async function gameStart(socket, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    let flag = true;
    for (let player of room.players) {
      if (!player.connected) {
        flag = false;
      }
      if (!player.role) {
        flag = false;
      }
    }
    if (!flag) {
      return socket.emit('errorGame', {
        msg: 'Player is not assigned role or player is not connected',
      });
    }
    const newGame = {};
    newGame['players'] = room.players.map((player) => ({
      name: player.name,
      role: player.role,
    }));
    let quara_num = 0;
    for (let id in newGame['players']) {
      player = newGame['players'][id];
      player.arr_id = id;
      if (
        player.role == roles.super_infected ||
        player.role == roles.super_infected_hidden
      ) {
        player['infected'] = true;
        quara_num++;
      } else {
        player['infected'] = false;
      }
    }
    let map = createMap();
    let pos = [];
    for (let i = 0; i < map.length; i++) {
      pos.push([]);
    }
    newGame['map'] = map;
    newGame['pos'] = pos;
    newGame['admin'] = room.admin;
    newGame['quara_num'] = quara_num;
    newGame['target_point'] = room.target_point;
    const game = new Game(newGame);
    await game.save();
    console.log(game);
    nsp.emit('startGame', { game });
  } catch (error) {
    socket.emit('errorGame', { msg: 'Internal Server Error' });
    console.error(error);
  }
}
async function beginPhase() {}
async function quarantine(socket, roomId, nsp, pList) {
  const room = await Room.findById(roomId);
  const game = await Game.findById(room.game);
  if (game.turn > 0 && game.phase == phases.quarantine) {
    for (let id of pList) {
      game.players[id].quarantined = true;
    }
    game.phase = phases.doctor;
    await game.save();
    nsp.emit('quarantined', pList);
    nsp.emit('changePhase', game.phase);
  }
}
async function doctor() {}
async function distribute_mask() {}
async function super_infect() {}
async function random_infect() {}
async function endPhase() {}
async function disconnect(socket, id, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    let index = inArray(room.players, id, '_id');
    if (index < 0) {
      return socket.emit('errorGame', {
        msg: 'Bad Request: player already disconnect',
      });
    }
    room.players[index].connected = false;
    await room.save();
    nsp.emit('updatePlayers', { players: room.players });
  } catch (error) {
    socket.emit('errorGame', { msg: 'Internal Server Error' });
    console.error(error);
  }
}
function createMap(des = [], size = 7) {
  if (des.length == 0) {
    des = '01 05 12 16 23 36 34 45';
  }
  let map = [];
  for (let i = 0; i < size; i++) {
    map.push(createFalseArr(size));
  }
  a = des.split(' ');
  for (let x of a) {
    map[x[0]][x[1]] = true;
    map[x[1]][x[0]] = true;
  }
  return map;
}
function createFalseArr(size) {
  arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(false);
  }
  return arr;
}
