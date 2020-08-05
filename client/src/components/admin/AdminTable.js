import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import { setAlert } from '../../actions/alert';
import api from '../../utils/api';
import roles from '../../enum/roles';
import { server_emit as se, client_emit as ce } from '../../enum/socket-spec';
import io from 'socket.io-client';
export const AdminTable = ({ match, setAlert }) => {
  const [targetPoint, setPoint] = useState(0);
  const [players, setPlayers] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [customPoint, setCustomPoint] = useState(200);
  const [customRoles, setCustomRoles] = useState(null);
  const [remainRoles, setRemainRoles] = useState({
    [roles.doctor]: true,
    [roles.police]: true,
    [roles.mask_distributor]: true,
    [roles.super_infected_hidden]: true,
  });
  const [mySocket, setSocket] = useState(null);

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
    });
    return () => {
      if (socket) {
        socket.emit(ce.force_disconnect, true);
      }
    };
  }, []);
  function changeTargetPoint(point) {
    api
      .put(`/room/${match.params.id}/point`, { target_point: point })
      .then((res) => {
        setPoint(res.data);
      });
  }
  function onChangeRole(id, role) {
    for (let key in remainRoles) {
      if (role != key && customRoles[id] == key) {
        setRemainRoles({ ...remainRoles, key: true });
        break;
      } else if (role == key && customRoles[id] != key) {
        setRemainRoles({ ...remainRoles, [key]: false });
        break;
      }
    }
    setCustomRoles({ ...customRoles, [id]: role });
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
      if (!roles.key) {
        setAlert('Cannot set empty role', 'danger');
        return;
      }
    }
    api.put(`/room/${match.params.id}/roles`, { roles }).then((res) => {
      setPlayers(res.data);
    });
  }
  function startGame(socket) {
    socket.emit(ce.gameStart, true);
  }
  return (
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
              {players.map((p) => (
                <tr>
                  <td>{p.name}</td>
                  <td>
                    <select
                      name='roles'
                      value={customRoles[p.id]}
                      onChange={(e) => {
                        onChangeRole(p.id, e.target.value);
                      }}
                    >
                      {remainRoles[roles.doctor] && (
                        <option value={roles.doctor}>Doctor</option>
                      )}
                      {remainRoles[roles.police] && (
                        <option value={roles.police}>Police</option>
                      )}
                      {remainRoles[roles.mask_distributor] && (
                        <option value={roles.doctor}>Mask Distributor</option>
                      )}
                      {remainRoles[roles.super_infected_hidden] && (
                        <option value={roles.super_infected_hidden}>
                          Hidden Infector
                        </option>
                      )}
                      <option value={roles.super_infected}>Infector</option>
                      <option value={roles.normal}>Normal</option>
                      <option value={null}>None</option>
                    </select>
                  </td>
                </tr>
              ))}
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
  );
};

const mapStateToProps = (state) => ({});
export default connect(mapStateToProps, { setAlert })(withRouter(AdminTable));
