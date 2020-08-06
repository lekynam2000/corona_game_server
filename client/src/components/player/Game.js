import React, { useState, useEffect, useRef } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { setAlert } from '../../actions/alert';
import io from 'socket.io-client';
import roles from '../../enum/roles';
import phases from '../../enum/phases';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
import Can2 from '../../img/canteen2.jpg';
import theArc from '../../img/the_arc.jpg';
import nyAudi from '../../img/ny_audi.jpg';
import theHive from '../../img/the_hive.jpg';
import YuuGar from '../../img/yg.jpg';
import Hall6 from '../../img/hall6.jpg';
import Fullerton from '../../img/fullerton.png';
import Quara from '../../img/quara.jpg';
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
  const placeImg = [Can2, theArc, nyAudi, theHive, YuuGar, Hall6, Fullerton];
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
      console.log(player);
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
      let r_id = sessionStorage.getItem('r_id');
      socket.emit(ce.getInfo, r_id);
    });
    socket.on(se.changePhase, (msg) => {
      setPhase(msg);
      if (msg == phases.doctor_scan) {
        doctor_scan(socket);
      }
      let r_id = sessionStorage.getItem('r_id');
      socket.emit(ce.getInfo, r_id);
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
        return info;
      });
    });
    return () => {
      socket.emit(ce.force_disconnect, true);
    };
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
    if (socket && inputId.current && inputId.current.value) {
      console.log(inputId.current.value);
      socket.emit(ce.reconnect, inputId.current.value);
      console.log('emitted');
    } else {
      setAlert('Not allowed empty Id', 'danger');
    }
  }
  function move(socket, target, info) {
    let arr_id = info.arr_id;
    socket.emit(ce.move, { arr_id, target });
  }
  function doctor_scan(socket) {
    if (myInfo && myInfo.role == roles.doctor) {
      let id = myInfo._id;
      socket.emit(ce.doctor_scan, { id });
    }
  }
  function target_action(socket, action, List) {
    let pList = List.map((p) => p.arr_id);
    if (myInfo) {
      if (pList.length < max_select) {
        setAlert(`Must select ${max_select} players`, 'danger');
      }
      let id = myInfo._id;
      if (myInfo.role == roles.police) {
        socket.emit(action, { id, pList });
      } else {
        socket.emit(action, { id, target_id: pList[0] });
      }
    }
  }
  function target_button(socket, phase, info) {
    if (!info) {
      return '';
    }
    console.log('role', info.role);
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
      case roles.mask_distributor:
        if (phase == phases.distribute_mask) {
          return (
            <button
              onClick={() => {
                target_action(mySocket, ce.distribute_mask, selected_list);
              }}
            >
              Give Mask
            </button>
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
      console.log(arr_id, players);
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
        style={{
          top: top + '%',
          left: left + '%',
          backgroundColor: getRandomColor(),
          position: 'absolute',
          border: '1px solid black',
          opacity: '90%',
          borderRadius: '50%',
          width: '25px',
          height: '25px',
          textAlign: 'center',
        }}
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
          {players.map((p) => (
            <li className='list-group-item'>
              {p.name}: {p.place > -1 ? placeName[p.place] : 'None'}
            </li>
          ))}
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
                      move(mySocket, i, myInfo);
                    }}
                  >
                    <div className={'card places' + (active ? ' active' : '')}>
                      <div className='card-header'>
                        {players.map((p) => {
                          if (p.place == i) {
                            return playerTpl(p);
                          } else {
                            return '';
                          }
                        })}
                        <img
                          src={placeImg[i]}
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
                <div className={'card places'}>
                  <div className='card-header'>
                    {players.map((p) => {
                      if (p.quarantined) {
                        return playerTpl(p);
                      } else {
                        return '';
                      }
                    })}
                    <img
                      src={Quara}
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
            <div className='row'>
              <div className='col-lg-12'>Name: {myInfo.name}</div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>Role: {myInfo.role} </div>
            </div>
            <div className='row'>
              <div className='col-lg-6'>
                Infected: {myInfo.infected ? 'Yes' : 'No'}
              </div>
              <div className='col-lg-6'>
                {' '}
                Moved: {myInfo.moved ? 'Yes' : 'No'}
              </div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>
                {myInfo.place > -1 && `Place: ${placeName[myInfo.place]}`}
              </div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>
                Quarantined: {myInfo.quarantined ? 'Yes' : 'No'}
              </div>
            </div>
            {myInfo &&
              (myInfo.role == roles.super_infected_hidden ||
                myInfo.role == roles.super_infected) && (
                <div className='row'>
                  <div className='col-lg-12'>
                    Execute Infect: {myInfo.had_infect ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
            <div className='row'>
              <button
                onClick={() => {
                  if (mySocket && myInfo && phase == phases.random_infect) {
                    mySocket.emit('random_infect', true);
                  }
                }}
              >
                Random Infect
              </button>
            </div>
          </div>
        </div>
        <div className='card sameRoomPlayers'>
          <div className='card-body'>
            <ul className='list-group'>
              {players &&
                players
                  .filter((p) => {
                    return (
                      myInfo.role == roles.police || myInfo.place == p.place
                    );
                  })
                  .map((player) => {
                    let p = player;
                    console.log(p);
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
  return logged ? loggedLayout : notLoggedLayout;
};
export default connect(null, { setAlert })(withRouter(Game));
