const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  getUserById, 
  getAllQuestions, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion,
  getDashboardStats 
} = require('../controllers/adminController');
const { adminLogin, getAdminDashboard } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', adminLogin);
router.get('/dashboard', protect, authorize('admin'), getAdminDashboard);
router.get('/stats', protect, authorize('admin'), getDashboardStats);

router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/users/:id', protect, authorize('admin'), getUserById);

router.get('/questions', protect, authorize('admin'), getAllQuestions);
router.post('/questions', protect, authorize('admin'), createQuestion);
router.put('/questions/:topic/:id', protect, authorize('admin'), updateQuestion);
router.delete('/questions/:topic/:id', protect, authorize('admin'), deleteQuestion);

module.exports = router;
