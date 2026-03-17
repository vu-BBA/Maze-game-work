const express = require('express');
const router = express.Router();
const { selectCategory, getMyCategory, getAvailableCategories } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');

router.get('/categories', getAvailableCategories);
router.post('/select-category', protect, selectCategory);
router.get('/my-category', protect, getMyCategory);

module.exports = router;
