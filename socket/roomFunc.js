const User = require('../models/User');
const Room = require('../models/Room');
const Game = require('../models/Game');
const roles = require('../enum/roles');
const phases = require('../enum/phases');
const se = require('./socket-spec').server_emit;
const ce = require('./socket-spec').client_emit;
module.exports = async function (socket) {
  const nsp = socket.nsp;
  const roomId = nsp.name.split('_')[1];
  let inScopeId = 0;
  socket.on(ce.reconnect, (r_id) => {
    reconnect(socket, r_id, roomId, nsp).then((data) => {
      inScopeId = data;
    });
  });
  socket.on(ce.addPlayer, (name) => {
    addPlayer(socket, name, roomId, nsp).then((data) => {
      inScopeId = data;
    });
  });

  socket.on(ce.gameStart, () => {
    gameStart(socket, roomId, nsp);
  });

  socket.on(ce.getInfo, (r_id) => {
    getInfo(socket, roomId, r_id);
  });
  socket.on(ce.quarantine, (msg) => {
    quarantine(socket, msg.id, roomId, nsp, msg.pList);
  });
  socket.on(ce.move, (msg) => {
    move(socket, roomId, nsp, msg.arr_id, msg.target);
  });
  socket.on(ce.doctor_scan, (id) => {
    doctor_scan(socket, roomId, id, nsp);
  });
  socket.on(ce.doctor_cure, (msg) => {
    doctor_cure(socket, roomId, msg.id, nsp, msg.target_id);
  });
  socket.on(ce.distribute_mask, (msg) => {
    distribute_mask(socket, roomId, msg.id, nsp, msg.target_id);
  });
  socket.on(ce.super_infect, (msg) => {
    super_infect(socket, roomId, msg.id, nsp, msg.target_id);
  });
  socket.on(ce.force_disconnect, () => {
    if (inScopeId != 0) {
      disconnect(socket, inScopeId, roomId, nsp);
    }
    socket.disconnect();
  });
  socket.on('random_infect', () => {
    random_infect(roomId, nsp);
  });
  socket.on('disconnect', () => {
    if (inScopeId != 0) {
      disconnect(socket, inScopeId, roomId, nsp);
    }
    socket.disconnect();
  });
};
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
    socket.emit(se.getId, { id: room.players[room.players.length - 1].id });
    nsp.emit(se.updatePlayers, {
      players: room.players,
    });
    if (room.playing) {
      const game = await Game.findById(room.game);
      extractBasicInfo(socket, game);
    }
    return room.players[room.players.length - 1].id;
  } catch (error) {
    handleError(error, socket);
  }
}
async function reconnect(socket, r_id, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    const r_index = inArray(room.players, r_id, '_id');
    if (r_index < 0) {
      return socket.emit(se.errorGame, { msg: 'Invalid id' });
    }
    room.players[r_index].connected = true;
    await room.save();
    socket.emit(se.getId, { id: r_id });
    nsp.emit(se.updatePlayers, {
      players: room.players,
    });

    if (room.playing) {
      extractBasicInfo(socket, game);
    }
    return r_id;
  } catch (error) {
    handleError(error, socket);
  }
}
async function gameStart(socket, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    if (room.playing) {
      socket.emit(se.errorGame, { msg: 'Room already playing' });
    }
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
      return socket.emit(se.errorGame, {
        msg: 'Player is not assigned role or player is not connected',
      });
    }
    const newGame = {};
    newGame['players'] = room.players.map((player) => {
      player.playing = true;
      return {
        r_id: player.id.toString(),
        name: player.name,
        role: player.role,
      };
    });
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
    newGame['infected_players'] = calcInfection(newGame.players);
    const game = new Game(newGame);
    room.playing = true;
    await game.save();
    room.game = game.id;
    await room.save();
    nsp.emit(se.startGame, room.playing);
    socket.emit(se.updatePlayers, { players: room.players });
    extractBasicInfo(nsp, game);
  } catch (error) {
    handleError(error, socket);
  }
}
async function extractBasicInfo(nsp, game) {
  let map = game.map;
  let target_point = game.target_point;
  let quara_num = game.quara_num;
  let point = game.point;
  let phase = game.phase;
  let infect_players = game.infected_players;
  let turn = game.turn;
  let big3 = {
    [roles.doctor]: -1,
    [roles.police]: -1,
    [roles.mask_distributor]: -1,
  };
  let players = game.players.map((p) => {
    for (let key in big3) {
      if (key == p.role) {
        big3[key] = p.arr_id;
      }
    }
    return {
      name: p.name,
      place: p.place,
      quarantined: p.quarantined,
      arr_id: p.arr_id,
    };
  });
  nsp.emit(se.basicSetup, { map, target_point, quara_num, big3 });
  nsp.emit(se.updatePoint, point);
  nsp.emit(se.changePhase, phase);
  nsp.emit(se.updateInfected, infect_players);
  nsp.emit(se.updateTurn, turn);
  nsp.emit(se.updateMove, { players });
}
async function getInfo(socket, roomId, r_id) {
  try {
    const room = await Room.findById(roomId);
    if (!room.playing || !room.game) {
      return socket.emit(se.errorGame, { msg: 'Not playing room' });
    }
    const game = await Game.findById(room.game);
    const index = inArray(game.players, r_id, 'r_id');
    if (index < 0) {
      return socket.emit(se.errorGame, { msg: 'Not found' });
    }
    const player = game.players[index];
    socket.emit(se.myInfo, player);
  } catch (error) {
    handleError(error, socket);
  }
}
// async function beginPhase() {}
async function quarantine(socket, id, roomId, nsp, pList) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    flag = true;
    if (game.phase != phases.quarantine) {
      return nsp.emit(se.errorGame, { msg: 'Quarantine in wrong phase' });
    }
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.police) {
      return socket.emit(se.errorGame, { msg: 'Not valid id' });
    }
    if (game.turn > 0) {
      for (let id of pList) {
        if (
          game.players[id].role == roles.doctors ||
          game.players[id].role == roles.mask_distributor ||
          game.players[id].role == roles.police
        ) {
          return socket.emit(se.errorGame, {
            msg: 'Special Role cannot be quarantined',
          });
        }
        if (
          game.players[id].role != roles.super_infected_hidden &&
          game.players[id].role != roles.super_infected
        ) {
          flag = false;
        } else {
          game.infected_num++;
        }
        game.players[id].quarantined = true;
        game.moved_num++;
      }
      if (flag) {
        endGame(roomId, nsp, true);
        return;
      }
      game.phase = phases.move;
      await game.save();
      nsp.emit(se.updateMove, {
        players: game.players.map((p) => ({
          arr_id: p.arr_id,
          place: p.place,
          name: p.name,
          quarantined: p.quarantined,
        })),
      });
      nsp.emit(se.changePhase, game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function move(socket, roomId, nsp, arr_id, target) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.move) {
      return nsp.emit(se.errorGame, { msg: 'Move in wrong phase' });
    }
    // const player = game.players[arr_id];
    console.log(arr_id, target);
    const curr = game.players[arr_id].place;
    if (
      game.players[arr_id].moved ||
      game.players[arr_id].role == roles.police ||
      game.players[arr_id].quarantined
    ) {
      return socket.emit(se.errorGame, {
        msg: 'Unable to move',
      });
    }
    if (curr != -1 && !game.map[curr][target]) {
      return socket.emit(se.errorGame, {
        msg: 'Cannot move to unconnected place',
      });
    }
    game.players[arr_id].place = target;
    game.moved_num++;
    game.players[arr_id].moved = true;
    if (game.moved_num == game.players.length - 1) {
      let doctor = game.players.filter((p) => p.role == roles.doctor)[0];
      let flag = true;
      for (let p of game.players) {
        if (
          p.role == roles.super_infected ||
          p.role == roles.super_infected_hidden
        ) {
          if (p.place != doctor.place) {
            flag = false;
          }
        }
      }
      if (flag || game.turn == 0) {
        game.phase = phases.distribute_mask;
      } else {
        game.phase = phases.doctor_scan;
      }
    }
    await game.save();
    if (game.moved_num == game.players.length - 1) {
      nsp.emit(se.updateMove, {
        players: game.players.map((p) => ({
          arr_id: p.arr_id,
          place: p.place,
          name: p.name,
          quarantined: p.quarantined,
        })),
      });
    }
    if (game.phase != phases.moved) {
      nsp.emit(se.changePhase, game.phase);
    }
    console.log('gonna update moved');
    socket.emit(se.detailChange, { key: 'moved', val: true });
  } catch (error) {
    handleError(error, socket);
  }
}
async function doctor_scan(socket, roomId, id, nsp) {
  try {
    console.log('doctor', id);
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.doctor_scan) {
      return nsp.emit(se.errorGame, { msg: 'Scan in wrong phase' });
    }
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.doctor) {
      return socket.emit(se.errorGame, { msg: 'Not valid id' });
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
      socket.emit(se.scanResult, infect_list);
      nsp.emit(se.changePhase, game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function doctor_cure(socket, roomId, id, nsp, target_id) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.doctor_cure) {
      return nsp.emit(se.errorGame, { msg: 'Cure in wrong phase' });
    }
    const index = inArray(game.players, id, '_id');
    if (index < 0 || game.players[index].role != roles.doctor) {
      return socket.emit(se.errorGame, { msg: 'Not valid id' });
    } else {
      let target = game.players[target_id];
      if (!target) {
        return socket.emit(se.errorGame, { msg: 'Not valid target' });
      }
      if (target.place == 6) {
        if (
          target.role != roles.super_infected &&
          target.role != roles.super_infected_hidden
        ) {
          target.infected = false;
        }
        game.phase = phases.distribute_mask;
        await game.save();
        nsp.emit(se.changePhase, game.phase);
      } else {
        socket.emit(se.errorGame, { msg: 'What are you doing doctor?' });
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
    if (game.phase != phases.distribute_mask) {
      return nsp.emit(se.errorGame, { msg: 'Distribute mask in wrong phase' });
    }
    console.log(id);
    const index = inArray(game.players, id, '_id');
    console.log(index);
    console.log(target_id);
    if (index < 0 || game.players[index].role != roles.mask_distributor) {
      return socket.emit(se.errorGame, { msg: 'Not valid id' });
    } else {
      if (
        !game.players[target_id] ||
        game.players[target_id].place != game.players[index].place
      ) {
        return socket.emit(se.errorGame, { msg: 'Not valid target' });
      }
      game.players[target_id].has_mask = true;
      console.log(game.players[target_id].has_mask);
      game.phase = phases.super_infect;
      await game.save();
      nsp.emit(se.changePhase, game.phase);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function super_infect(socket, roomId, id, nsp, target_id) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.super_infect) {
      return nsp.emit(se.errorGame, { msg: 'Super infect in wrong phase' });
    }
    const index = inArray(game.players, id, '_id');
    if (
      index < 0 ||
      (game.players[index].role != roles.super_infected &&
        game.players[index].role != roles.super_infected_hidden)
    ) {
      return socket.emit(se.errorGame, { msg: 'Not valid id' });
    }
    if (
      !game.players[target_id] ||
      game.players[target_id].place != game.players[index].place ||
      game.players[target_id].role == roles.doctor ||
      game.players[target_id].role == roles.mask_distributor
    ) {
      return socket.emit(se.errorGame, { msg: 'Not valid target' });
    }
    if (game.players[index].had_infect || game.players[index].quarantined) {
      return socket.emit(se.errorGame, { msg: 'Cannot infect' });
    }
    if (!game.players[index].has_mask && !game.players[target_id].has_mask) {
      game.players[target_id].infected = true;
    }
    game.infected_num++;
    if (game.infected_num == game.quara_num) {
      game.phase = phases.random_infect;
    }
    await game.save();
    socket.emit(se.detailChange, { key: 'had_infect', val: true });
    if (game.phase == phases.random_infect) {
      nsp.emit(se.changePhase, game.phase);
      random_infect(roomId, nsp);
    }
  } catch (error) {
    handleError(error, socket);
  }
}
async function random_infect(roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.random_infect) {
      return nsp.emit(se.errorGame, { msg: 'Random infect in wrong phase' });
    }
    // each element represent set of players in the place
    const place = [];
    // list of person gonna infect
    const infect_list = [];
    for (let i = 0; i < game.map.length; i++) {
      place.push([]);
    }
    for (let player of game.players) {
      if (
        !player.quarantined &&
        player.infected &&
        !player.has_mask &&
        player.role == roles.normal
      ) {
        infect_list.push(player.arr_id);
      }
      if (
        !player.quarantined &&
        !player.had_mask &&
        player.role != roles.police
      ) {
        place[player.place].push(player.arr_id);
      }
    }
    // for each infector, choose random player in the same room to infect
    for (let infector_id of infect_list) {
      let val = Math.random();
      let currentPlace = game.players[infector_id].place;
      if (place[currentPlace].length == 1) {
        continue;
      }
      //infect rate
      let percent = 0.4 + 0.1 * place[currentPlace].length;
      if (val < percent) {
        // infection happen
        let infected_id =
          place[currentPlace][getRandomInt(place[currentPlace].length)];
        if (infected_id == infector_id) {
          infected_id =
            place[currentPlace][getRandomInt(place[currentPlace].length)];
        }
        if (game.players[infected_id].role == roles.normal) {
          game.players[infector_id].infected = true;
        }
      }
    }
    game.phase = phases.endPhase;
    await game.save();
    nsp.emit(se.changePhase, game.phase);
    endPhase(roomId, nsp);
  } catch (error) {
    handleError(error, nsp);
  }
}
async function endPhase(roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    const game = await Game.findById(room.game);
    if (game.phase != phases.endPhase) {
      return nsp.emit(se.errorGame, { msg: 'Random infect in wrong phase' });
    }
    let infected_players = calcInfection(game.players);
    game.infected_players = infected_players;
    game.point += infected_players;
    game.moved_num = 0;
    game.infected_num = 0;
    game.turn++;
    game.phase = phases.quarantine;
    for (let player of game.players) {
      player.has_mask = false;
      player.moved = false;
      player.had_infect = false;
      if (player.quarantined) {
        player.place = 0;
        player.quarantined = false;
      }
    }
    await game.save();
    nsp.emit(se.updateTurn, game.turn);
    nsp.emit(se.updateMove, {
      players: game.players.map((p) => ({
        arr_id: p.arr_id,
        place: p.place,
        name: p.name,
        quarantined: p.quarantined,
      })),
    });
    nsp.emit(se.changePhase, game.phase);
    nsp.emit(se.updateInfected, game.infected_players);
    nsp.emit(se.updatePoint, game.point);
    if (game.point >= game.target_point) {
      endGame(roomId, nsp, false);
    }
  } catch (error) {
    handleError(error, nsp);
  }
}
async function endGame(roomId, nsp, good_win) {
  const room = await Room.findById(roomId);
  let msg = '';
  if (good_win) {
    msg = 'Every super infected found. Congratulation, you defeated Corona';
  } else {
    msg = 'Corona side win. You failed to control the pandemic';
  }
  room.game = null;
  room.playing = false;
  room.players.forEach((p) => {
    p.playing = false;
  });
  await room.save();
  nsp.emit(se.endGame, { msg });
}
async function disconnect(socket, id, roomId, nsp) {
  try {
    const room = await Room.findById(roomId);
    let index = inArray(room.players, id, '_id');
    if (index < 0) {
      return socket.emit(se.errorGame, {
        msg: 'Bad Request: player already disconnect',
      });
    }
    room.players[index].connected = false;
    await room.save();
    nsp.emit(se.updatePlayers, {
      players: room.players,
    });
    return true;
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
  for (let player of players) {
    if (player.infected) {
      infect++;
    }
  }
  return infect;
}
function handleError(error, socket) {
  socket.emit(se.errorGame, { msg: 'Internal Server Error' });
  console.error(error);
}
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
