const express = require('express');
const router = express.Router();
const { getRandomQuestion, validateAnswer, addQuestion, getQuestionsByTopic, seedQuestions } = require('../controllers/questionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/random/:topic', protect, getRandomQuestion);
router.post('/validate', protect, validateAnswer);
router.get('/topic/:topic', protect, getQuestionsByTopic);
router.post('/seed', protect, authorize('admin'), seedQuestions);
router.post('/', protect, authorize('admin'), addQuestion);

module.exports = router;
