const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerDataSchema = new Schema({
  playerId: mongoose.ObjectId,
  points: Number,
  state: {
    type: String,
    enum: ['Esperando', 'En progreso', 'Salir'],
  },
});

const gameSchema = new Schema({
  playersData: [playerDataSchema],
  turn: String,
});

const GameModel = mongoose.model('game', gameSchema);

module.exports = GameModel;
