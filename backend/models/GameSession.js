const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topicSelected: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  keysCollected: {
    type: Number,
    default: 0
  },
  challengesSolved: {
    type: Number,
    default: 0
  },
  challengesFailed: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  moves: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

gameSessionSchema.methods.endGame = async function(keysCollected, challengesSolved, challengesFailed, completed) {
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  this.keysCollected = keysCollected;
  this.challengesSolved = challengesSolved;
  this.challengesFailed = challengesFailed;
  this.completed = completed;
  
  this.score = this.keysCollected * 100 + challengesSolved * 50 - challengesFailed * 10;
  
  if (this.duration > 0) {
    this.score += Math.max(0, 300 - this.duration);
  }
  
  if (completed) {
    this.score += 200;
  }
  
  return this.save();
};

module.exports = mongoose.model('GameSession', gameSessionSchema);
