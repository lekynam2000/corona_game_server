import React, { useState, useEffect, useRef } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { setAlert } from '../../actions/alert';
import roles from '../../enum/roles';
import phases from '../../enum/phases';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
export const Game = ({ match, setAlert }) => {
  const placeName = [
    'Canteen 2',
    'The Arc',
    'Nanyang Auditorium',
    'The Hive',
    'Yuunan Garden',
    'Hall 6',
    'Fullerton',
  ];
  const [logged, setLogged] = useState(false);
  const [socket, mySocket] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [myInfo, setMyInfo] = useState({});
  const [map, setMap] = useState(null);
  const [targetPoint, setTargetPoint] = useState(111);
  const [phase, setPhase] = useState(phases.move);
  const [turn, setTurn] = useState(0);
  const [point, setPoint] = useState(0);
  const [quara_num, setQuaraNum] = useState(0);
  const [big3, setBig3] = useState({});
  const [infected, setInfected] = useState(0);
  const [selected_list, setList] = useState([]);
  const [max_select, setMaxSelect] = useState(0);
  const [players, setPlayers] = useState([]);
  const inputName = useRef(null);
  const inputId = useRef(null);
  useEffect(() => {
    let socket = io(`/room_${match.params.id}`);
    setSocket(socket);
    socket.on(se.errorGame, (e) => {
      setAlert(e.msg, 'danger');
    });
    socket.on(se.getId, (msg) => {
      sessionStorage.setItem('r_id', msg.id);
      setLogged(true);
    });
    socket.on(se.myInfo, (player) => {
      setMyInfo(player);
    });
    socket.on(se.basicSetup, (msg) => {
      setMap(msg.map);
      setTargetPoint(msg.target_point);
      setQuaraNum(msg.quara_num);
      setBig3(msg.big3);
    });
    socket.on(se.changePhase, (msg) => {
      setPhase(msg);
    });
    socket.on(se.updateInfected, (msg) => {
      setInfected(msg);
    });
    socket.on(se.updateTurn, (msg) => {
      setTurn(msg);
    });
    socket.on(se.updateMove, (msg) => {
      setPlayers(msg.players);
    });
    socket.on(se.scanResult, (msg) => {
      let clonePlayers = [...players];
      for (let r_id of msg) {
        clonePlayers[r_id]['infected'] = true;
      }
      setPlayers(clonePlayers);
    });
  }, []);
  function addPlayer(socket) {
    if (inputName.current && inputName.current.value) {
      socket.emit(ce.addPlayer, inputName.current.value);
    } else {
      setAlert('Not allowed empty name', 'danger');
    }
  }
  function reconnect(socket) {
    if (inputId.current && inputId.current.value) {
      socket.emit(ce.reconnect, inputId.current.value);
    } else {
      setAlert('Not allowed empty Id', 'danger');
    }
  }
  function move(socket, target) {
    let arr_id = myInfo.arr_id;
    socket.emit(ce.move, { arr_id, target });
  }
  function doctor_scan(socket) {
    let id = myInfo._id;
    socket.emit(ce.doctor_scan, { id });
  }
  function target_action(socket, action, target_id) {
    let id = myInfo._id;
    socket.emit(action, { id, target_id });
  }
  function addToList(arr_id) {
    if (selected_list.length < max_select) {
      setList((list) => [...list, { arr_id, name: players[arr_id].name }]);
    } else {
      setAlert(`Cannot select more than ${max_select} players`, 'danger');
    }
  }
  function deleteFromList(arr_id) {
    let index = -1;
    for (let i in selected_list) {
      if (selected_list[i].arr_id == arr_id) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      let list = [...selected_list];
      list.splice(index, 1);
      setList(list);
    } else {
      setAlert('Haizz, bug again and Nam Le gonna fix this');
    }
  }
  return <div>Game</div>;
};
export default connect(null, { setAlert })(withRouter(Game));
