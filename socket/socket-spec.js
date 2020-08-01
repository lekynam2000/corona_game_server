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
module.exports = { server_emit };
