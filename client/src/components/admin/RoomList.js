import React, { useEffect, useState, Fragment } from 'react';
import api from '../../utils/api';
import { setAlert } from '../../actions/alert';
import { connect } from 'react-redux';
import { Link, withRouter, Route } from 'react-router-dom';
function RoomList({ isAuthenticated, loading, history, setAlert }) {
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    api.get('/game/rooms').then((res) => {
      setRooms(res.data);
    });
  }, []);
  function createNewRoom() {
    api
      .post('/game/room')
      .then((res) => {
        history.push(`/admin/${res.data}`);
      })
      .catch((err) => {
        setAlert('Fail to create new room', 'danger');
      });
  }
  function deleteRoom(id) {
    api
      .delete(`/game/room/${id}`)
      .then((res) => {
        setRooms(res.data);
      })
      .catch((err) => {
        setAlert('Fail to delete room ', 'danger');
      });
  }
  return (
    !loading &&
    isAuthenticated && (
      <div className='gameDetail'>
        <button
          className='btn btn-primary'
          onClick={() => {
            createNewRoom();
          }}
        >
          Create new Room
        </button>
        <ul>
          {rooms.map((room_id) => (
            <li>
              <Link to={`/admin/${room_id}`}>{room_id}</Link>
              <button
                className='btn btn-small btn-danger'
                onClick={() => {
                  deleteRoom(room_id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  );
}
const mapStateToProps = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  loading: state.auth.loading,
});
export default connect(mapStateToProps, { setAlert })(withRouter(RoomList));
