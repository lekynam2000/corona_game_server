export const server_emit = {
  getId: 'getId',
  //{id: player room id}
  basicSetup: 'basicSetup',
  //{map,target_point}
  startGame: 'startGame',
  //{true}
  updatePlayers: 'updatePlayers',
  //{players: [name,connected,playing]}
  myInfo: 'myInfo',
  //{_id,arr_id,r_id,name,role,infected,disabled,has_mask,had_infect,place,moved,quarantined}
  revealAlly: 'revealAlly',
  //[arr_id]
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
  detailChange: 'detailChange',
  //{key,val}
  errorGame: 'errorGame',
  //{msg}
};
export const client_emit = {
  addPlayer: 'addPlayer',
  //name
  reconnect: 'recoGame',
  //r_id,
  gameStart: 'gameStart',
  //
  forceChangePhase: 'forceChangePhase',
  //assigned_phase
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
  force_disconnect: 'force_disconnect',
  //{id}
  get_ally: 'get_ally',
  //{id}
};
