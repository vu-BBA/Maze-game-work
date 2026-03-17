const mongoose = require('mongoose');

const userResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    default: 'medium'
  },
  keysCollected: {
    type: Number,
    default: 0
  },
  keysUsed: {
    type: Number,
    default: 0
  },
  questionsSolved: {
    type: Number,
    default: 0
  },
  questionsFailed: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  moves: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: true
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
});

userResultSchema.pre('save', function(next) {
  this.score = (this.keysCollected * 10) + (this.questionsSolved * 5) - (this.questionsFailed * 2);
  if (this.timeSpent > 0) {
    this.score += Math.max(0, 100 - this.timeSpent);
  }
  next();
});

module.exports = mongoose.model('UserResult', userResultSchema, 'user_results');
