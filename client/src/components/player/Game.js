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
  const [mySocket, setSocket] = useState(null);
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
  const [scanResult, setScanResult] = useState([]);
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
      if (player.role != roles.normal && player.role != roles.police) {
        setMaxSelect(1);
      }
    });
    socket.on(se.basicSetup, (msg) => {
      setMap(msg.map);
      setTargetPoint(msg.target_point);
      setQuaraNum(msg.quara_num);
      setBig3(msg.big3);
    });
    socket.on(se.changePhase, (msg) => {
      setPhase(msg);
      if (msg == phases.doctor_scan) {
        doctor_scan(socket);
      }
      setList([]);
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
      setScanResult(msg);
    });
    socket.on(se.detailChange, ({ key, val }) => {
      setMyInfo((myInfo) => {
        let info = { ...myInfo };
        info[key] = val;
        return myInfo;
      });
    });
  }, []);
  useEffect(() => {
    if (quara_num > 0 && myInfo.role == roles.police) {
      setMaxSelect(quara_num);
    }
  }, [quara_num, myInfo]);
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
    if (myInfo && myInfo.role == roles.doctor) {
      let id = myInfo._id;
      socket.emit(ce.doctor_scan, { id });
    }
  }
  function target_action(socket, action, pList) {
    if (myInfo) {
      if (pList.length < max_select) {
        setAlert(`Must select ${max_select} players`, 'danger');
      }
      let id = myInfo._id;
      if (myInfo.role == roles.police) {
        socket.emit(action, { id, pList });
      } else {
        socket.emit(action, { target_id: pList[0] });
      }
    }
  }
  function target_button(socket, phase, info) {
    if (!info) {
      return '';
    }
    switch (info.role) {
      case roles.doctor:
        if (phase == phases.doctor_cure && info.place == 6) {
          return (
            mySocket && (
              <button
                onClick={() => {
                  target_action(mySocket, ce.doctor_cure, selected_list);
                }}
              >
                Cure
              </button>
            )
          );
        } else {
          return '';
        }
      case roles.super_infected:
      case roles.super_infected_hidden:
        if (phase == phases.super_infect && !info.had_infect) {
          return (
            mySocket && (
              <button
                onClick={() => {
                  target_action(mySocket, ce.super_infect, selected_list);
                }}
              >
                Infect
              </button>
            )
          );
        } else {
          return '';
        }
      case roles.police:
        if (phase == phases.quarantine && !info.had_infect) {
          return (
            mySocket && (
              <button
                onClick={() => {
                  target_action(mySocket, ce.quarantine, selected_list);
                }}
              >
                Quara
              </button>
            )
          );
        } else {
          return '';
        }
      default:
        return '';
    }
  }
  function addToList(arr_id) {
    if (selected_list.length < max_select) {
      let index = -1;
      for (let i in selected_list) {
        if (selected_list[i].arr_id == arr_id) {
          index = i;
          break;
        }
      }
      if (index > -1) {
        setAlert('Cannot select a target twice', 'danger');
        return;
      }
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
  function getRandomColor() {
    var letters = '23456789ABCD';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 12)];
    }
    return color;
  }
  const playerTpl = (p) => {
    let shortName = p.name[0];
    if (p.name.length > 1) {
      shortName += p.name[1];
    }
    let top = 20 + Math.random() * 60;
    let left = 20 + Math.random() * 60;
    return (
      <div
        className={'playerIcon' + p.quarantined ? ' quarantined' : ''}
        style={`top: ${top}%;left:${left}%;background-color:${getRandomColor()}`}
      >
        {shortName}
      </div>
    );
  };
  const notLoggedLayout = (
    <div className='card'>
      <ul className='list-group list-group-flush'>
        <li className='list-group-item'>
          <div>Enter name if you are new player</div>
          <label htmlFor='name'>
            Name:
            <div className='input-group mb-3'>
              <input
                type='text'
                ref={inputName}
                placeholder='Enter you name'
                id='name'
              />
              <div className='input-group-append'>
                <button
                  className='btn btn-primary'
                  onClick={() => {
                    addPlayer(mySocket);
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </label>
        </li>
        <li className='list-group-item'>
          <div>Or enter code to reconnect</div>
          <label htmlFor='id'>
            Name:
            <div className='input-group mb-3'>
              <input
                type='text'
                ref={inputId}
                placeholder='Enter code'
                id='id'
              />
              <div className='input-group-append'>
                <button
                  className='btn btn-primary'
                  onClick={() => {
                    reconnect(mySocket);
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </label>
        </li>
      </ul>
    </div>
  );
  const loggedLayout = (
    <div className='row'>
      <div className='col-lg-2'>
        <ol className='list-group'>
          {players.map((p) => {
            <li className='list-group-item'>
              {p.name}: {p.place > -1 ? placeName[place] : 'None'}
            </li>;
          })}
        </ol>
      </div>
      <div className='col-lg-7'>
        <div className='card'>
          <div className='card-body'>
            <div className='row'>
              <div className='col-lg-2'>Turn: {turn}</div>
              <div className='col-lg-4'>Phase:{phase}</div>
              <div className='col-lg-2'>Infected: {infected}</div>
              <div className='col-lg-4'>
                Point: {point}/{targetPoint}
              </div>
            </div>
            {players.length > 0 && (
              <div className='row'>
                {Object.keys(big3).map((role) => {
                  if (big3[role] > -1) {
                    return (
                      <div className='col-lg-4'>
                        {role}: {players[big3[role]].name}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
        <div className='card'>
          <div className='card-body'>
            <div className='row'>
              {Object.keys(placeName).map((i) => {
                let active =
                  phase == phases.move &&
                  map &&
                  myInfo &&
                  !myInfo.moved &&
                  (myInfo.place == -1 || map[i][myInfo.place]);
                return (
                  <div
                    className='col-lg-4'
                    onClick={() => {
                      move(mySocket, i);
                    }}
                  >
                    <div className={'card' + active ? ' active' : ''}>
                      <div className='card-header'>
                        {players.map((p) => {
                          if (p.place == i) {
                            return playerTpl(p);
                          } else {
                            return '';
                          }
                        })}
                        <img
                          src=''
                          alt={placeName[i]}
                          className='card-img-top'
                        />
                      </div>
                      <div className='card-body'>
                        <p className='card-text'>{placeName[i]}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className='col-lg-4 quaraZone'>
                <div className={'card'}>
                  <div className='card-header'>
                    {players.map((p) => {
                      if (p.quarantined) {
                        return playerTpl(p);
                      } else {
                        return '';
                      }
                    })}
                    <img
                      src=''
                      alt='Quarantine Zone'
                      className='card-img-top'
                    />
                  </div>
                  <div className='card-body'>
                    <p className='card-text'>Quarantine Zone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='col-lg-3'>
        <div className='card personalInfo'>
          <div className='card-body'>
            Name: {myInfo.name}; Role: {myInfo.role}; Infected:{' '}
            {myInfo.infected ? 'Yes' : 'No'}
            Mask: {myInfo.has_mask ? 'Yes' : 'No'}
            {myInfo.place > -1 && `Place: ${placeName[myInfo.place]}`}
            Moved: {myInfo.moved ? 'Yes' : 'No'}
          </div>
        </div>
        <div className='card sameRoomPlayers'>
          <div className='card-body'>
            <ul className='list-group'>
              {players
                .filter((p) => {
                  return myInfo.role == roles.police || myInfo.place == p.place;
                })
                .map((p) => {
                  return (
                    <li
                      className='list-group-item sameRoom'
                      onClick={() => {
                        addToList(p.arr_id);
                      }}
                    >
                      {p.name}
                    </li>
                  );
                })}
            </ul>
            {scanResult.length > 0 && (
              <ul className='list-group'>
                <li className='list-group-item'>Infected: </li>
                {scanResult.map((arr_id) => (
                  <li className='list-group-item'>{players[arr_id].name}</li>
                ))}
              </ul>
            )}
            <div className='row'>
              <div className='col-lg-9'>
                <ul className='selectedPlayers'>
                  {selected_list.map(({ arr_id, name }) => (
                    <li>
                      {name}
                      <button
                        className='btn btn-danger'
                        onClick={() => {
                          deleteFromList(arr_id);
                        }}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className='col-lg-3'>
                {target_button(mySocket, phase, myInfo)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return <div>Game</div>;
};
export default connect(null, { setAlert })(withRouter(Game));
