import React, { useEffect, useState, Fragment, useRef } from 'react';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import { setAlert } from '../../actions/alert';
import api from '../../utils/api';
import roles from '../../enum/roles';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
import io from 'socket.io-client';
import mapping from '../player/mapping';
import nameMap from '../player/enName';
import NTUmap from '../../img/NTUmap.jpg';
export const AdminTable = ({ match, setAlert }) => {
  const placeName = [
    'Canteen 2',
    'The Arc',
    'Nanyang Auditorium',
    'The Hive',
    'Yunnan Garden',
    'Hall 6',
    'Fullerton',
  ];
  const [targetPoint, setPoint] = useState(0);
  const [players, setPlayers] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [customPoint, setCustomPoint] = useState(200);
  const [customRoles, setCustomRoles] = useState({});
  const [game, setGame] = useState(null);
  const [remainRoles, setRemainRoles] = useState({
    [roles.doctor]: true,
    [roles.police]: true,
    [roles.mask_distributor]: true,
    [roles.super_infected_hidden]: true,
  });
  const [mySocket, setSocket] = useState(null);
  const [endGameMsg, setEngGameMsg] = useState(null);
  const phaseInput = useRef(null);
  useEffect(() => {
    let socket;
    api.get(`/game/room/${match.params.id}`).then((res) => {
      let room = res.data;
      setPlayers(room.players);
      setPoint(room.target_point);
      setPlaying(room.playing);
      socket = io(`/room_${match.params.id}`);
      setSocket(socket);
      socket.on(se.updatePlayers, (msg) => {
        setPlayers(msg.players);
      });
      socket.on(se.startGame, () => {
        setPlaying(true);
      });
      socket.on(se.endGame, ({ msg }) => {
        setEngGameMsg(msg);
      });
      socket.on(se.errorGame, (err) => {
        setAlert(err.msg, 'danger');
      });
    });
    return () => {
      if (socket) {
        socket.emit(ce.force_disconnect, true);
      }
    };
  }, []);
  useEffect(() => {
    var gameItv = null;
    if (playing) {
      gameItv = setInterval(() => {
        fetchGameInfo();
      }, 1000);
    } else {
      if (gameItv) {
        clearInterval(gameItv);
        gameItv = null;
      }
    }
    return () => {
      if (gameItv) {
        clearInterval(gameItv);
        gameItv = null;
      }
    };
  }, [playing]);
  function fetchGameInfo() {
    api
      .get(`/game/room/${match.params.id}/game`)
      .then((res) => {
        setGame(res.data);
      })
      .catch((err) => {
        setAlert('Error calling API', 'danger');
      });
  }
  function changeTargetPoint(point) {
    api
      .put(`/game/room/${match.params.id}/point`, { target_point: point })
      .then((res) => {
        setPoint(res.data);
      });
  }
  function forceChangePhase(socket) {
    if (socket && phaseInput.current && phaseInput.current.value) {
      socket.emit(ce.forceChangePhase, phaseInput.current.value);
    }
  }
  function forceChangePoint(socket, d_point) {
    if (socket) {
      socket.emit(ce.forceChangePoint, d_point);
    }
  }
  function onChangeRole(id, role) {
    setCustomRoles({ ...customRoles, [id]: role });
  }
  function submitRole(roles) {
    api
      .put(`/game/room/${match.params.id}/roles`, { roles })
      .then((res) => {
        setPlayers(res.data);
      })
      .catch((err) => {
        let msg = err.response.data.msg;
        // console.log(JSON.stringify(err.response.data));
        setAlert(msg, 'danger');
      });
  }
  function startGame(socket) {
    socket.emit(ce.gameStart, true);
  }
  function deletePlayer(p_id) {
    api.delete(`/game/room/${match.params.id}/${p_id}`).then((res) => {
      console.log(res);
      setPlayers(res.data);
    });
  }
  const gameTableTpl = game && (
    <div className='card mt-2 gameDetail'>
      <div className='card-header'>
        <h3>Game Detail</h3>
        {endGameMsg && <p>Result: {endGameMsg}</p>}
      </div>
      <div className='card-body'>
        <p>
          Point: {game.point}/{game.target_point}
        </p>
        <p>Number of infected players: {game.infected_players}</p>
        <p>Number of Corona virus: {game.quara_num}</p>
        <p>Turn: {game.turn}</p>
        <p>Phase: {game.phase}</p>
        <div>
          <select ref={phaseInput}>
            {Object.keys(mapping).map((k) => (
              <option value={k}>{mapping[k].name}</option>
            ))}
          </select>
          <button
            className='btn btn-danger ml-2'
            onClick={() => {
              forceChangePhase(mySocket);
            }}
          >
            Force Change Phase
          </button>
        </div>
        <div className='mt-2 mb-2'>
          <span>Change Point: </span>
          <button
            className='btn btn-primary ml-1 mr-1'
            onClick={() => {
              forceChangePoint(mySocket, 1);
            }}
          >
            +
          </button>
          <button
            className='btn btn-danger ml-1 mr-1'
            onClick={() => {
              forceChangePoint(mySocket, -1);
            }}
          >
            -
          </button>
        </div>
        <p>Number of moved players: {game.moved_num}</p>
        <img src={NTUmap} alt='NTU Map' height='200' />
        <table className='mt-3'>
          <thead>
            <tr>
              <th>Index</th>
              <th>Name</th>
              <th>Role</th>
              <th>Infected</th>
              <th>Moved</th>
              <th>Mask</th>
              <th>Had_Infected </th>
              <th>Place</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p) => (
              <tr
                className={
                  p.moved || p.quarantined || p.role == roles.police
                    ? 'bg-special'
                    : ''
                }
              >
                <td>{p.arr_id}</td>
                <td>{p.name}</td>
                <td>{nameMap[p.role]}</td>
                <td>{p.infected ? 'Y' : 'No'}</td>
                <td>
                  {p.moved ? 'Y' : 'No'} {p.quarantined ? '(Quara)' : ''}
                </td>
                {/* <td>{p.quarantined ? 'Y' : 'No'}</td> */}
                <td>{p.has_mask ? 'Y' : 'No'}</td>
                <td>{p.had_infect ? 'Y' : 'No'}</td>
                <td>{p.place > -1 ? placeName[p.place] : 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <Fragment>
      <div className='row gameDetail'>
        <div className='col-9'>
          <h2>
            Room Id:{' '}
            <Link to={`/game/${match.params.id}`}>{match.params.id}</Link>
          </h2>
          <h3>Current Target Point: {targetPoint}</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Id</th>
                <th>Connection</th>
                <th>Playing</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p._id}</td>
                  <td>{p.connected ? 'Connected' : 'Disconnected'}</td>
                  <td>{p.playing ? 'Playing' : 'Not playing'}</td>
                  <td>{nameMap[p.role]}</td>
                  <td>
                    <button
                      className='btn btn-small btn-danger'
                      onClick={() => {
                        deletePlayer(p._id);
                      }}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='col-3'>
          <div className='target-point'>
            <label htmlFor='target_point'>
              Target Point
              <input
                type='number'
                id='target_point'
                value={customPoint}
                onChange={(event) => {
                  setCustomPoint(event.target.value);
                }}
              />
            </label>
            <button
              className='btn btn-success'
              onClick={() => {
                changeTargetPoint(customPoint);
              }}
            >
              Set
            </button>
          </div>
          <div className='roles'>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roles</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  let p = player;
                  return (
                    <tr>
                      <td>{p.name}</td>
                      <td>
                        <select
                          name='roles'
                          value={customRoles[p._id]}
                          onChange={(e) => {
                            console.log(p._id, e.target.value);
                            onChangeRole(p._id, e.target.value);
                          }}
                        >
                          <option value={null}>None</option>

                          {Object.keys(roles).map((k) => (
                            <option value={roles[k]}>
                              {nameMap[roles[k]]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan='2'>
                    <button
                      onClick={() => {
                        submitRole(customRoles);
                      }}
                    >
                      Set Role
                    </button>
                  </th>
                  <th colSpan='2'>
                    {playing ? (
                      'Started'
                    ) : (
                      <button
                        onClick={() => {
                          startGame(mySocket);
                        }}
                      >
                        Start
                      </button>
                    )}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      {gameTableTpl}
    </Fragment>
  );
};

const mapStateToProps = (state) => ({});
export default connect(mapStateToProps, { setAlert })(withRouter(AdminTable));
