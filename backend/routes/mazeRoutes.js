const express = require('express');
const router = express.Router();
const { startGame, movePlayer, getQuestion, submitAnswer, openGate, saveGameResult, getUserResults } = require('../controllers/mazeController');
const { protect, authorize } = require('../middleware/auth');

router.post('/start', protect, startGame);
router.post('/move', protect, movePlayer);
router.post('/open-gate', protect, openGate);
router.post('/save-result', protect, saveGameResult);
router.get('/results', protect, authorize('admin'), getUserResults);

module.exports = router;
