const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name: String,
  users: [mongoose.ObjectId],
  state: {
    type: String,
    enum: ['La partida aún no ha comenzado', 'En curso'],
  },
  game: mongoose.ObjectId,
});

const RoomModel = mongoose.model('room', roomSchema);

module.exports = RoomModel;
