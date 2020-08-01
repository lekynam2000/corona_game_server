const server_emit = {
  getId: 'getId',
  //{id: player room id}
  updatePlayers: 'updatePlayers',
  //{players: [name,connected,playing]}
  startGame: 'startGame',
  //{}
  myInfo: 'myInfo',
  //{_id,arr_id,r_id,name,role,infected,disabled,has_mask,had_infect,place,moved,quarantined}
  updateMove: 'updateMove',
  //{players:[arr_id,name,place,quarantined]}
  changePhase: 'changePhase',
  //phase
  scanResult: 'scanResult',
  //[arr_id]
  updateTurn: 'updateTurn',
  //turn
  updateInfected: 'updateInfected',
  //infected_num
  updatePoint: 'updatePoint',
  //point
  endGame: 'endGame',
  //{msg}
  errorGame: 'errorGame',
  //{msg}
};
const client_emit = {
  addPlayer: 'addPlayer',
  //name
  reconnect: 'reconnect',
  //r_id
  gameStart: 'gameStart',
  //
  getInfo: 'getInfo',
  //r_id
  quarantine: 'quarantine',
  //{id,pList:[arr_id]}
  move: 'move',
  //{arr_id,target:place}
  doctor_scan: 'doctor_scan',
  //id
  doctor_cure: 'doctor_cure',
  //{id,target_id}
  distribute_mask: 'distribute_mask',
  //{id,target_id}
  super_infect: 'super_infect',
  //{id,target_id}
};
module.exports = { server_emit };
