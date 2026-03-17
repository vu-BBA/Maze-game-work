const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    enum: ['cpp', 'python', 'javascript', 'react', 'html_css']
  },
  type: {
    type: String,
    required: true,
    enum: ['QUIZ', 'CODING', 'INTERACTIVE_SCENARIO', 'DEBUGGING', 'SHARP_SHOOTER']
  },
  questionText: {
    type: String,
    required: true
  },
  options: [{
    type: String
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  codeSnippet: {
    type: String
  },
  errorLine: {
    type: Number
  },
  errorType: {
    type: String,
    enum: ['syntax', 'logical', 'runtime']
  },
  timeLimit: {
    type: Number,
    default: 20
  },
  rewardKeys: {
    type: Number,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

questionSchema.pre('save', function(next) {
  const rewardMap = {
    'QUIZ': 2,
    'CODING': 3,
    'INTERACTIVE_SCENARIO': 4,
    'DEBUGGING': 5,
    'SHARP_SHOOTER': 10
  };
  
  if (this.type === 'SHARP_SHOOTER') {
    this.rewardKeys = 10;
    this.timeLimit = 20;
  } else {
    this.rewardKeys = rewardMap[this.type] || 2;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Question', questionSchema);
