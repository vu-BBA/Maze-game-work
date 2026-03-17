const User = require('../models/User');
const { TopicModels, TopicCollectionNames } = require('../models/TopicQuestions');
const GameSession = require('../models/GameSession');
const UserResult = require('../models/UserResult');
const mongoose = require('mongoose');

const VALID_TOPICS = ['cpp', 'python', 'javascript', 'react', 'html_css'];
const VALID_TYPES = ['QUIZ', 'CODING', 'INTERACTIVE_SCENARIO', 'DEBUGGING', 'SHARP_SHOOTER'];

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });

    const usersWithStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      signupDate: user.signupDate,
      loginCount: user.loginCount,
      lastLogin: user.lastLoginAt,
      totalTime: formatTime(user.totalTimeSpent),
      totalTimeSpent: user.totalTimeSpent,
      gamesPlayed: user.gamesPlayed,
      totalKeysCollected: user.totalKeysCollected,
      highestScore: user.highestScore,
      isOnline: user.isOnline
    }));

    res.status(200).json({
      success: true,
      data: usersWithStatus
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const sessions = await GameSession.find({ playerId: id }).sort({ createdAt: -1 }).limit(20);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      signupDate: user.signupDate,
      loginCount: user.loginCount,
      lastLogin: user.lastLoginAt,
      totalTimeSpent: user.totalTimeSpent,
      totalTime: formatTime(user.totalTimeSpent),
      gamesPlayed: user.gamesPlayed,
      totalKeysCollected: user.totalKeysCollected,
      highestScore: user.highestScore,
      isOnline: user.isOnline,
      selectedCategory: user.selectedCategory,
      sessions: sessions.map(s => ({
        _id: s._id,
        topicSelected: s.topicSelected,
        difficulty: s.difficulty,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        keysCollected: s.keysCollected,
        challengesSolved: s.challengesSolved,
        challengesFailed: s.challengesFailed,
        completed: s.completed,
        score: s.score
      }))
    };

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details'
    });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const { topic, type, difficulty } = req.query;

    if (!topic || topic === 'all') {
      const allQuestions = {};
      for (const topicName of VALID_TOPICS) {
        const Model = TopicModels[topicName];
        let filter = {};
        if (type && type !== 'all') filter.type = type;
        if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
        allQuestions[topicName] = await Model.find(filter)
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 });
      }
      return res.status(200).json({
        success: true,
        data: allQuestions
      });
    }

    if (!VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid: ${VALID_TOPICS.join(', ')}`
      });
    }

    const Model = TopicModels[topic];
    let filter = {};
    if (type && type !== 'all') filter.type = type;
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;

    const questions = await Model.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions'
    });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { topic, type, questionText, options, correctAnswer, codeSnippet, errorLine, errorType, difficulty } = req.body;

    if (!topic || !type || !questionText || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide topic, type, questionText, and correctAnswer'
      });
    }

    if (!VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid: ${VALID_TOPICS.join(', ')}`
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid: ${VALID_TYPES.join(', ')}`
      });
    }

    if (type === 'QUIZ' && (!options || options.length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'QUIZ type requires at least 2 options'
      });
    }

    const rewardMap = {
      'QUIZ': 2,
      'CODING': 3,
      'INTERACTIVE_SCENARIO': 4,
      'DEBUGGING': 5,
      'SHARP_SHOOTER': 10
    };

    const rewardKeys = type === 'SHARP_SHOOTER' ? 10 : rewardMap[type] || 2;
    const timeLimit = type === 'SHARP_SHOOTER' ? 20 : 20;

    const Model = TopicModels[topic];
    const question = await Model.create({
      type,
      questionText,
      options: type === 'QUIZ' ? options : [],
      correctAnswer,
      codeSnippet: codeSnippet || '',
      errorLine: errorLine || null,
      errorType: errorType || null,
      timeLimit,
      rewardKeys,
      difficulty: difficulty || 'medium',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question'
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { topic, id } = req.params;
    const { type, questionText, options, correctAnswer, codeSnippet, errorLine, errorType, difficulty } = req.body;

    if (!topic || !VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid: ${VALID_TOPICS.join(', ')}`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID'
      });
    }

    const Model = TopicModels[topic];
    const question = await Model.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (type) question.type = type;
    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (codeSnippet !== undefined) question.codeSnippet = codeSnippet;
    if (errorLine) question.errorLine = errorLine;
    if (errorType) question.errorType = errorType;
    if (difficulty) question.difficulty = difficulty;

    await question.save();

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question'
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { topic, id } = req.params;

    if (!topic || !VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid: ${VALID_TOPICS.join(', ')}`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID'
      });
    }

    const Model = TopicModels[topic];
    const question = await Model.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const questionCounts = {};
    let totalQuestions = 0;

    for (const topicName of VALID_TOPICS) {
      const Model = TopicModels[topicName];
      const count = await Model.countDocuments();
      questionCounts[topicName] = count;
      totalQuestions += count;
    }

    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalSessions = await GameSession.countDocuments();
    const completedSessions = await GameSession.countDocuments({ completed: true });
    
    const totalGamesPlayed = await UserResult.countDocuments();
    const completedGames = await UserResult.countDocuments({ completed: true });

    const users = await User.find({ role: 'user' });
    const activePlayers = users.filter(u => u.isOnline).length;

    const avgTime = users.reduce((sum, u) => sum + u.totalTimeSpent, 0) / (users.length || 1);

    res.status(200).json({
      success: true,
      data: {
        totalQuestions,
        questionCounts,
        totalUsers,
        totalSessions,
        completedSessions,
        totalGamesPlayed,
        completedGames,
        activePlayers,
        averageTime: formatTime(Math.floor(avgTime))
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
};

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
