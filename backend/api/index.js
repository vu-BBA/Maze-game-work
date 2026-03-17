const mongoose = require('mongoose');

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      isConnected = true;
      console.log('MongoDB connected');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
};

module.exports = async function handler(req, res) {
  await connectToDatabase();
  
  // Health check endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ status: 'OK', message: 'Maze Game API is running' });
  }
  
  // Root endpoint
  if (req.url === '/') {
    return res.status(200).send('Maze Game API is running!');
  }
  
  // Return 404 for other routes
  return res.status(404).json({ success: false, message: 'Route not found' });
};
