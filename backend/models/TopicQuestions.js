const mongoose = require('mongoose');

const baseQuestionSchema = new mongoose.Schema({
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

baseQuestionSchema.pre('save', function(next) {
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

const CppQuestions = mongoose.model('CppQuestions', baseQuestionSchema, 'cpp_questions');
const PythonQuestions = mongoose.model('PythonQuestions', baseQuestionSchema, 'python_questions');
const JavaScriptQuestions = mongoose.model('JavaScriptQuestions', baseQuestionSchema, 'javascript_questions');
const ReactQuestions = mongoose.model('ReactQuestions', baseQuestionSchema, 'react_questions');
const HtmlCssQuestions = mongoose.model('HtmlCssQuestions', baseQuestionSchema, 'html_css_questions');

const TopicModels = {
  cpp: CppQuestions,
  python: PythonQuestions,
  javascript: JavaScriptQuestions,
  react: ReactQuestions,
  html_css: HtmlCssQuestions
};

const TopicCollectionNames = {
  cpp: 'cpp_questions',
  python: 'python_questions',
  javascript: 'javascript_questions',
  react: 'react_questions',
  html_css: 'html_css_questions'
};

module.exports = {
  CppQuestions,
  PythonQuestions,
  JavaScriptQuestions,
  ReactQuestions,
  HtmlCssQuestions,
  TopicModels,
  TopicCollectionNames
};
