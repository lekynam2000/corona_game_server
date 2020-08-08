import phases from '../../enum/phases';
const mapping = {
  [phases.quarantine]: {
    name: 'Quarantine',
    des:
      'Police selects players to send to quarantine zone. These players will not infect other players or being infected by other players this turn. After this turn, all quarantined player will be sent to Canteen 2',
  },
  [phases.move]: {
    name: 'Moving',
    des:
      'Everyone move to a connected place, except Police. Position of all players will be announce after everyone moved',
  },

  [phases.distribute_mask]: {
    name: 'Distribute Mask',
    des:
      'Mask Distributor select a player to give mask. Selected player will not infect other players or being infected by other players this turn. Give mask to your self is a valid option',
  },
  [phases.doctor_scan]: {
    name: 'Scan',
    des:
      'Doctor press Scan button to know number of player in the current place',
  },
  [phases.doctor_cure]: {
    name: 'Cure',
    des:
      'Doctor select a player in the same place( Fullerton) to cure. Cure yourself is a valid option',
  },
  [phases.super_infect]: {
    name: 'Super Infect',
    des:
      'Choose a player to infect. Selected player cannot be special role( Doctor, Mask Distributor, Police) and cannot be quarantined. Infect yourself is a valid option',
  },
};
export default mapping;
