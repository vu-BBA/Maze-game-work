const User = require('../models/User');

const VALID_CATEGORIES = ['Python', 'JavaScript', 'React', 'HTML+CSS', 'C++'];

exports.selectCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category'
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories: ' + VALID_CATEGORIES.join(', ')
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { selectedCategory: category },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Category selected successfully',
      data: {
        selectedCategory: user.selectedCategory
      }
    });
  } catch (error) {
    console.error('Error selecting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select category'
    });
  }
};

exports.getMyCategory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('selectedCategory');

    res.status(200).json({
      success: true,
      data: {
        selectedCategory: user.selectedCategory || null
      }
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category'
    });
  }
};

exports.getAvailableCategories = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        categories: VALID_CATEGORIES
      }
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
};
