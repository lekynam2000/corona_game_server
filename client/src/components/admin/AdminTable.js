import React, { useEffect, useState, Fragment, useRef } from 'react';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import { setAlert } from '../../actions/alert';
import api from '../../utils/api';
import roles from '../../enum/roles';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
import io from 'socket.io-client';
import mapping from '../player/mapping';
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
  function onChangeRole(id, role) {
    let f = true;
    for (let key in remainRoles) {
      if (role == key && remainRoles[key] == false) {
        setAlert('Duplicated role', 'danger');
        f = false;
      }
      if (role != key && customRoles[id] == key) {
        setRemainRoles({ ...remainRoles, [key]: true });
        break;
      } else if (role == key && customRoles[id] != key) {
        setRemainRoles({ ...remainRoles, [key]: false });
        break;
      }
    }

    setCustomRoles({ ...customRoles, [id]: role });
    console.log(customRoles);
  }
  function submitRole(roles) {
    console.log('roles', roles);
    for (let key in remainRoles) {
      if (remainRoles[key]) {
        setAlert('Not enough role', 'danger');
        return;
      }
    }
    for (let key in roles) {
      if (!roles[key]) {
        setAlert('Cannot set empty role', 'danger');
        return;
      }
    }
    api.put(`/game/room/${match.params.id}/roles`, { roles }).then((res) => {
      setPlayers(res.data);
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
        <select ref={phaseInput}>
          {Object.keys(mapping).map((k) => (
            <option value={k}>{mapping[k].name}</option>
          ))}
        </select>
        <button
          className='btn btn-danger'
          onClick={() => {
            forceChangePhase(mySocket);
          }}
        >
          Force Change Phase
        </button>
        <p>Number of moved players: {game.moved_num}</p>
        <table>
          <thead>
            <tr>
              <th>Index</th>
              <th>Name</th>
              <th>Role</th>
              <th>Infected</th>
              <th>Moved</th>
              <th>Quara </th>
              <th>Mask</th>
              <th>Had_Infected </th>
              <th>Place</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p) => (
              <tr>
                <td>{p.arr_id}</td>
                <td>{p.name}</td>
                <td>{p.role}</td>
                <td>{p.infected ? 'Yes' : 'No'}</td>
                <td>{p.moved ? 'Yes' : 'No'}</td>
                <td>{p.quarantined ? 'Yes' : 'No'}</td>
                <td>{p.has_mask ? 'Yes' : 'No'}</td>
                <td>{p.had_infect ? 'Yes' : 'No'}</td>
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
      <div className='row'>
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
                  <td>{p.role}</td>
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

                          <option value={roles.doctor}>Doctor</option>

                          <option value={roles.police}>Police</option>

                          <option value={roles.mask_distributor}>
                            Mask Distributor
                          </option>

                          <option value={roles.super_infected_hidden}>
                            Hidden Infector
                          </option>

                          <option value={roles.super_infected}>Infector</option>
                          <option value={roles.normal}>Normal</option>
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
