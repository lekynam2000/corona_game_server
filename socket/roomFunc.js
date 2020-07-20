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
    handleError(error, socket);
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
    newGame['map'] = map;
    // let pos = [];
    // for (let i = 0; i < map.length; i++) {
    //   pos.push([]);
    // }
    // newGame['pos'] = pos;
    newGame['admin'] = room.admin;
    newGame['quara_num'] = quara_num;
    newGame['target_point'] = room.target_point;
    const game = new Game(newGame);
    await game.save();
    console.log(game);
    nsp.emit('startGame', { game });
  } catch (error) {
    handleError(error, socket);
  }
}
async function beginPhase() {}
async function quarantine(socket, roomId, nsp, pList) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    flag = true;
    if (game.turn > 0 && game.phase == phases.quarantine) {
      for (let id of pList) {
        if (
          game.players[id].role == role.doctors ||
          game.players[id].role == roles.mask_distributor ||
          game.players[id].role == roles.police
        ) {
          return socket.emit('errorGame', {
            msg: 'Special Role cannot be quarantined',
          });
        }
        if (
          game.players[id].role != roles.super_infected_hidden &&
          game.players[id].role != roles.super_infected
        ) {
          flag = false;
        }
        else{
          game.infected_num ++;
        }
        game.players[id].quarantined = true;
        game.moved_num++;
      }
      if (flag) {
        endGame(socket, roomId, nsp, true);
        return;
      }
      game.phase = phases.doctor;
      await game.save();
      nsp.emit('quarantined', pList);
      nsp.emit('changePhase', game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function move(socket, roomId, nsp, arr_id, target) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    // const player = game.players[arr_id];
    const curr = player.place;
    if (
      game.players[arr_id].moved ||
      game.players[arr_id].role == roles.police
    ) {
      return socket.emit('errorGame', {
        msg: 'Unable to move',
      });
    }
    if (curr != -1 && !game.map[curr][target]) {
      return socket.emit('errorGame', {
        msg: 'Cannot move to unconnected place',
      });
    }
    game.players[arr_id].place = target;
    game.moved_num++;
    if (game.moved_num == game.players.length - 1) {
      let doctor = game.players.filter((p) => p.role == roles.doctor)[0];
      let flag = true;
      for (let p of game.players) {
        if (
          p.roles == roles.super_infected ||
          p.roles == roles.super_infected_hidden
        ) {
          if (p.place != doctor.place) {
            flag = false;
          }
        }
      }
      if (flag) {
        game.phase = phases.distribute_mask;
      } else {
        game.phase = phases.doctor_scan;
      }
    }
    await game.save();
    if (game.moved_num == game.players.length - 1) {
      nsp.emit('updateMove', {
        players: game.players.map((p) => ({
          arr_id: p.arr_id,
          place: p.place,
          name: p.name,
        })),
      });
    }
    if (game.phase != phases.moved) {
      nsp.emit('changePhase', game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function doctor_scan(socket, roomId, id, nsp) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.doctor) {
      return socket.emit('errorGame', { msg: 'Not valid id' });
    } else {
      let place = game.players[index].place;
      let infect_list = [];
      for (let player of game.players) {
        if (
          player.infected &&
          player.role != roles.super_infected_hidden &&
          player.place == place
        ) {
          infect_list.push(player.arr_id);
        }
      }
      if (place == 6) {
        game.phase = phases.doctor_cure;
      } else {
        game.phase = phases.distribute_mask;
      }
      await game.save();
      socket.emit('scanResult', infect_list);
      nsp.emit('changePhase', game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function doctor_cure(socket, roomId, id, nsp, target_id) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.doctor) {
      return socket.emit('errorGame', { msg: 'Not valid id' });
    } else {
      let target = game.players[target_id];
      if(!target){
        return socket.emit('errorGame',{msg:'Not valid target'});
      }
      if (target.place == 6 && target.infected) {
        if (
          target.role != roles.super_infected &&
          target.role != roles.super_infected_hidden
        ) {
          target.infected = false;
        }
        game.phase = phases.distribute_mask;
        await game.save();
        nsp.emit('changePhase', game.phase);
      } else {
        socket.emit('errorGame', { msg: 'What are you doing doctor?' });
      }
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function distribute_mask(socket, roomId, id, nsp, target_id) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.mask_distributor) {
      return socket.emit('errorGame', { msg: 'Not valid id' });
    }
    else{
      if(!game.players[target_id] || game.players[target_id].place != game.players[index].place){
        return socket.emit('errorGame',{msg:'Not valid target'})
      }
      game.players[target_id].has_mask = true;
      game.phase = phases.super_infect;
      await game.save();
      nsp.emit('changePhase',game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function super_infect(socket,roomId,id,nsp,target_id) {
  const room = await Room.findById(roomId);
  const game = await Game.findById(room.game);
  const index = inArray(game.players, id, '_id');
  if (index < 0 || (game.players[index].role != roles.super_infected && game.players[index].role != roles.super_infected_hidden)) {
    return socket.emit('errorGame', { msg: 'Not valid id' });
  }
  if(!game.players[target_id] || game.players[target_id].place != game.players[index].place|| game.players[target_id].role == roles.doctor || game.players[target_id].role == roles.doctor){
    return socket.emit('errorGame', { msg: 'Not valid target' });
  }
  if(game.players[index].had_infect || game.players[index].quarantined){
    return socket.emit('errorGame',{msg: 'Cannot infect'})
  }
  game.players[target_id].infected = true;
  game.infected_num ++;
  if(game.infected_num == game.quara_num){
    game.phase = phases.random_infect
  }
  await game.save();
  if(game.phase == phases.random_infect){
    nsp.emit('changePhase',game.phase);
  }
}
async function random_infect(roomId,nsp) {
  const room = await Room.findById(roomId);
  const game = await Game.findById(room.game);
}
async function endPhase() {}
async function endGame() {}
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
    handleError(error, socket);
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
function calcInfection(players) {
  let infect = 0;
  for (let player in players) {
    if (player.infected) {
      infect++;
    }
  }
  return infect;
}
function handleError(error, socket) {
  socket.emit('errorGame', { msg: 'Internal Server Error' });
  console.error(error);
}
