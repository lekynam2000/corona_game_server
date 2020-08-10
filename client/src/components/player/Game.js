import React, { useState, useEffect, useRef, Fragment } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { setAlert } from '../../actions/alert';
import io from 'socket.io-client';
import roles from '../../enum/roles';
import phases from '../../enum/phases';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
import mapping from './mapping';
import nameMap from './vnName';
import Can2 from '../../img/canteen2.jpg';
import theArc from '../../img/the_arc.jpg';
import nyAudi from '../../img/ny_audi.jpg';
import theHive from '../../img/the_hive.jpg';
import YuuGar from '../../img/yg.jpg';
import Hall6 from '../../img/hall6.jpg';
import Fullerton from '../../img/fullerton.jpg';
import Quara from '../../img/quara.jpg';
import NTUmap from '../../img/NTUmap.jpg';
import mapBG from '../../img/mapBG.png';
export const Game = ({ match, setAlert }) => {
  const placeName = [
    'Canteen 2',
    'The Arc',
    'Nanyang Audi',
    'The Hive',
    'Yunnan Garden',
    'Hall 6',
    'Fullerton',
  ];
  const prettyOrder = [1, 0, 5, 2, 6, -1, 3, -2, 4];
  const placeImg = [Can2, theArc, nyAudi, theHive, YuuGar, Hall6, Fullerton];
  const [logged, setLogged] = useState(false);
  const [mySocket, setSocket] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [myInfo, setMyInfo] = useState({});
  const [map, setMap] = useState(null);
  const [targetPoint, setTargetPoint] = useState(111);
  const [phase, setPhase] = useState(phases.move);
  const [showPhaseDes, setShowPhaseDes] = useState(true);
  const [turn, setTurn] = useState(0);
  const [point, setPoint] = useState(0);
  const [quara_num, setQuaraNum] = useState(0);
  const [big3, setBig3] = useState({});
  const [allies, setAllies] = useState([]);
  const [infected, setInfected] = useState(0);
  const [selected_list, setList] = useState([]);
  const [max_select, setMaxSelect] = useState(0);
  const [players, setPlayers] = useState([]);
  const [scanResult, setScanResult] = useState(-1);
  const [endGameMsg, setEngGameMsg] = useState(null);
  const inputName = useRef(null);
  const inputId = useRef(null);
  useEffect(() => {
    let socket = io(`/room_${match.params.id}`);
    setSocket(socket);
    socket.on(se.errorGame, (e) => {
      setAlert(e.msg, 'danger');
    });
    socket.on(se.endGame, ({ msg }) => {
      setEngGameMsg(msg);
    });
    socket.on(se.getId, (msg) => {
      sessionStorage.setItem('r_id', msg.id);
      setLogged(true);
    });
    socket.on(se.updatePoint, (p) => {
      setPoint(p);
    });
    socket.on(se.myInfo, (player) => {
      console.log(player);
      setMyInfo(player);
      if (player.role != roles.normal && player.role != roles.police) {
        setMaxSelect(1);
      }
      if (
        player.role == roles.super_infected ||
        player.role == roles.super_infected_hidden
      ) {
        socket.emit(ce.get_ally, player._id);
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
    socket.on(se.revealAlly, (list) => {
      console.log(list);
      setAllies(list);
    });
    socket.on(se.changePhase, (msg) => {
      setPhase(msg);
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
      socket.emit(ce.doctor_scan, id);
    }
  }
  function target_action(socket, action, List) {
    let pList = List.map((p) => p.arr_id);
    if (myInfo) {
      if (pList.length < max_select) {
        setAlert(`Must select ${max_select} players`, 'danger');
        return;
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
    switch (info.role) {
      case roles.doctor:
        if (phase == phases.doctor_cure && info.place == 6) {
          return (
            mySocket && (
              <button
                className='btn btn-primary'
                onClick={() => {
                  target_action(mySocket, ce.doctor_cure, selected_list);
                }}
              >
                Cure
              </button>
            )
          );
        } else if (phase == phases.doctor_scan) {
          return (
            mySocket && (
              <button
                className='btn btn-primary'
                onClick={() => {
                  doctor_scan(mySocket);
                }}
              >
                Scan
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
              className='btn btn-primary'
              onClick={() => {
                target_action(mySocket, ce.distribute_mask, selected_list);
              }}
            >
              Mask
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
                className='btn btn-danger'
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
                className='btn btn-primary'
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
    var letters = '456789AB';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 8)];
    }
    return color;
  }
  const playerTpl = (p) => {
    let shortName = p.name[0];
    let bgClass = 'bg-normal';
    if (big3) {
      for (let key in big3) {
        if (p.arr_id == big3[key]) {
          bgClass = 'bg-special';
          break;
        }
      }
    }

    if (bgClass == 'bg-normal' && allies.length > 0) {
      for (let a of allies) {
        if (p.arr_id == a) {
          bgClass = 'bg-allies';
          break;
        }
      }
    }
    if (p.name.length > 1) {
      shortName += p.name[1];
    }
    if (p.name.length > 2) {
      shortName += p.name[2];
    }
    return (
      <div
        className={
          'playerIcon' + (p.quarantined ? ' quarantined ' : ' ' + bgClass)
        }
        // style={{
        //   top: top + '%',
        //   left: left + '%',
        //   backgroundColor: getRandomColor(),
        //   position: 'absolute',
        //   border: '1px solid black',
        //   borderRadius: '50%',
        //   width: '45px',
        //   height: '45px',
        //   textAlign: 'center',
        //   lineHeight: '45px',
        //   fontWeight: 'bold',
        // }}
      >
        {shortName}
      </div>
    );
  };
  const phaseCard = phase && (
    <div className='card phaseCard mt-3 mb-3'>
      <div className='card-header'>
        <div className='row'>
          {Object.keys(mapping).map((ph) => {
            let p = ph;
            return (
              <div
                className={
                  'btn mr-1 phaseBtn ' +
                  (p == phase ? 'btn-primary' : 'btn-danger bg-allies')
                }
              >
                {mapping[p].name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  const notLoggedLayout = (
    <div className='card'>
      <ul className='list-group list-group-flush'>
        <li className='list-group-item'>
          <div>Enter your name.</div>
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
          <p>
            We suggest this type of naming when playing game:{' '}
            <b>LWN Lee Wee Nam</b> or <b>LWN Wee Nam</b>(The first 3 letter is
            abbreviation, the remaining is your detail name)
          </p>
        </li>
        <li className='list-group-item'>
          <div>
            Or enter code to reconnect. (Do not enter this section if you are
            not told to do so)
          </div>
          <label htmlFor='id'>
            Secret code( received from GM):
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
        <table className='playerList'>
          <thead>
            <th>Name</th>
            <th>Place</th>
          </thead>
          <tbody>
            {players.map((p) => {
              let bgClass = '';
              if (big3) {
                for (let key in big3) {
                  if (p.arr_id == big3[key]) {
                    bgClass = 'bg-special';
                  }
                  if (p.quarantined) {
                    bgClass = 'bg-allies';
                  }
                }
              }
              return (
                <tr className={bgClass}>
                  <td>{p.name}</td>{' '}
                  <td>
                    {p.place > -1 ? placeName[p.place] : 'None'}{' '}
                    <span className='text-danger'>
                      {p.quarantined ? '(Q)' : ''}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className='col-lg-7'>
        <div className='card basicInfo'>
          <div className='card-body'>
            <div className='row'>
              <div className='col-lg-2 border-right border-success'>
                <p>
                  <b>Turn:</b> {turn}
                </p>
                <p>
                  <b>Infected:</b> {infected}
                </p>
                <p>
                  <b>Point:</b> {point}/{targetPoint}
                </p>
                <p className='text-little'>
                  <b>Quarantine:</b> {quara_num}
                </p>
              </div>
              <div className='col-lg'>
                {players.length > 0 && (
                  <div className='row'>
                    {Object.keys(big3).map((role) => {
                      if (big3[role] > -1) {
                        return (
                          <div className='col-lg-12 role'>
                            <b>{nameMap[role]}:</b>{' '}
                            <span className=''>{players[big3[role]].name}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
              {allies.length > 0 && players.length > 0 && (
                <div className='col-lg-4 border-left border-success'>
                  <p>
                    <b>{nameMap[roles.super_infected]}:</b>
                  </p>
                  {allies.map((a) => (
                    <p className=''>
                      {players[a].name + (a == allies[0] ? ' (Ẩn)' : '')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {phaseCard}
        <div className='card placeCardList'>
          {endGameMsg && <div className='card-header'>{endGameMsg}</div>}
          <div className='card-body'>
            <div className='row pm15'>
              {prettyOrder.map((i) => {
                if (i > -1) {
                  let active =
                    phase == phases.move &&
                    map &&
                    myInfo &&
                    !myInfo.quarantined &&
                    !myInfo.role == roles.police &&
                    !myInfo.moved &&
                    (myInfo.place == -1 || map[i][myInfo.place]);
                  // active = true;
                  return (
                    <div
                      className='col-lg-4 placeCardWrapper'
                      onClick={() => {
                        move(mySocket, i, myInfo);
                      }}
                    >
                      <div
                        className={'card places' + (active ? ' active' : '')}
                      >
                        <div className='card-header'>
                          <div className='highlevelWrapper'>
                            <div className='playerIconWrapper'>
                              {players.map((p) => {
                                if (p.place == i) {
                                  return playerTpl(p);
                                } else {
                                  return '';
                                }
                              })}
                            </div>
                          </div>

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
                } else if (i == -1) {
                  return <div className='col-lg-4'></div>;
                } else {
                  return <div className='col-lg-4'></div>;
                }
              })}
            </div>
          </div>
        </div>
      </div>
      <div className='col-lg-3'>
        <div className='card personalInfo mb-3'>
          <div className='card-body'>
            <div className='row'>
              <div className='col-lg-12'>
                <b>You are:</b> <span className=''>P{myInfo.arr_id}</span>
              </div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>
                <b>Name:</b> {myInfo.name}
              </div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>
                <b>Role:</b> {nameMap[myInfo.role]}{' '}
              </div>
            </div>
            <div className='row'>
              <div className='col-lg-12'>
                {myInfo.place > -1 && (
                  <p>
                    <b>Place:</b> {placeName[myInfo.place]}
                  </p>
                )}
              </div>
            </div>
            <div className='row ml-0'>
              {myInfo.infected && (
                <div className=''>
                  <div className='btn btn-danger  p-2 bg-allies'>infected</div>
                </div>
              )}

              {myInfo.moved && (
                <div className=''>
                  <div className='btn btn-primary p-2'>moved</div>
                </div>
              )}
              {myInfo.quarantined && (
                <div className=''>
                  <div className='btn btn-secondary p-2'>quarantined</div>
                </div>
              )}
              {myInfo.had_infect && (
                <div className=''>
                  <div className='btn btn-warning p-2'>infection executed</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className='quaraZone'>
          <div className={'card places'}>
            <div className='card-header'>
              <div className='highlevelWrapper'>
                <div className='playerIconWrapper'>
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
              </div>
            </div>
            <div className='card-body'>
              <p className='card-text'></p>
            </div>
          </div>
        </div>

        <div className='card sameRoomPlayers'>
          <div className='card-body'>
            <ul className='list-group'>
              <li className='list-group-item head'>Players in same place:</li>
              {players &&
                players
                  .filter((p) => {
                    return (
                      myInfo.role == roles.police || myInfo.place == p.place
                    );
                  })
                  .map((player) => {
                    let p = player;
                    if (big3 && myInfo && myInfo.role == roles.police) {
                      for (let key in big3) {
                        if (p.arr_id == big3[key]) {
                          return '';
                        }
                      }
                    }
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
            {scanResult > -1 && (
              <p className='mt-2'>
                Detected {scanResult} infection in current place
              </p>
            )}
            <div className='row justify-content-end'>
              <div className='col-lg'>
                <ul className='selectedPlayers list-group'>
                  {target_button(mySocket, phase, myInfo) != '' &&
                    selected_list.map(({ arr_id, name }) => (
                      <li className='list-group-item'>
                        <div className='d-flex justify-content-between'>
                          {name}
                          <button
                            className='btn btn-danger btn-small p-0 pl-1 pr-1'
                            onClick={() => {
                              deleteFromList(arr_id);
                            }}
                          >
                            X
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
              <div className='col-lg targetBtnWrapper'>
                {target_button(mySocket, phase, myInfo)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <Fragment>
      {!logged && (
        <div className='jumbotron title pt-0 pb-0'>
          <div className='display-4 text-center'>CORONA at Nanyang Village</div>
        </div>
      )}
      {logged ? loggedLayout : notLoggedLayout}
    </Fragment>
  );
};
export default connect(null, { setAlert })(withRouter(Game));
