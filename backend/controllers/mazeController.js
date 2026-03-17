const VALID_CATEGORIES = ['Python', 'JavaScript', 'React', 'HTML+CSS', 'C++'];
const UserResult = require('../models/UserResult');
const User = require('../models/User');

const CELL_TYPES = {
  WALL: 'wall',
  PATH: 'path',
  START: 'start',
  EXIT: 'exit',
  KEY: 'key',
  LOCK: 'lock'
};

const MAZE_SIZES = {
  easy: 15,
  medium: 20,
  hard: 30
};

function generateMaze(width, height) {
  const maze = [];
  
  for (let y = 0; y < height; y++) {
    maze[y] = [];
    for (let x = 0; x < width; x++) {
      maze[y][x] = { type: CELL_TYPES.WALL, x, y };
    }
  }

  const directions = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 }
  ];

  function isValid(x, y) {
    return x > 0 && x < width - 1 && y > 0 && y < height - 1;
  }

  function carve(x, y) {
    maze[y][x].type = CELL_TYPES.PATH;
    
    const shuffled = [...directions].sort(() => Math.random() - 0.5);
    
    for (const { dx, dy } of shuffled) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (isValid(nx, ny) && maze[ny][nx].type === CELL_TYPES.WALL) {
        maze[y + dy / 2][x + dx / 2].type = CELL_TYPES.PATH;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);

  const pathCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x].type === CELL_TYPES.PATH) {
        pathCells.push({ x, y });
      }
    }
  }

  if (pathCells.length > 0) {
    const startIdx = Math.floor(Math.random() * Math.min(5, pathCells.length));
    const startCell = pathCells[startIdx];
    maze[startCell.y][startCell.x].type = CELL_TYPES.START;
    maze[startCell.y][startCell.x].playerStart = { x: startCell.x, y: startCell.y };

    const exitIdx = pathCells.length - 1 - Math.floor(Math.random() * Math.min(5, pathCells.length));
    const exitCell = pathCells[exitIdx];
    maze[exitCell.y][exitCell.x].type = CELL_TYPES.EXIT;
  }

  return maze;
}

function placeKeysAndLocks(maze, width, height, difficulty) {
  const pathCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x].type === CELL_TYPES.PATH || maze[y][x].type === CELL_TYPES.START) {
        pathCells.push({ x, y });
      }
    }
  }

  const keyCount = 15;
  const lockCount = 10;

  const shuffledPaths = [...pathCells].sort(() => Math.random() - 0.5);
  const keysPlaced = [];

  for (let i = 0; i < Math.min(keyCount, shuffledPaths.length - 2); i++) {
    const cell = shuffledPaths[i];
    if (maze[cell.y][cell.x].type === CELL_TYPES.PATH) {
      maze[cell.y][cell.x].type = CELL_TYPES.KEY;
      maze[cell.y][cell.x].keyId = `key_${Date.now()}_${i}`;
      maze[cell.y][cell.x].keyValue = Math.floor(Math.random() * 3) + 1;
      maze[cell.y][cell.x].questionId = `q_${i + 1}`;
      keysPlaced.push({ keyId: maze[cell.y][cell.x].keyId, keyValue: maze[cell.y][cell.x].keyValue });
    }
  }

  const locksPlaced = [];
  const pathOnly = pathCells.filter(p => maze[p.y][p.x].type === CELL_TYPES.PATH);
  const shuffledLocks = [...pathOnly].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(lockCount, shuffledLocks.length); i++) {
    const cell = shuffledLocks[i];
    maze[cell.y][cell.x].type = CELL_TYPES.LOCK;
    maze[cell.y][cell.x].lockId = `lock_${Date.now()}_${i}`;
    maze[cell.y][cell.x].requiredKeys = Math.min(i + 1, 3);
    locksPlaced.push({ lockId: maze[cell.y][cell.x].lockId, requiredKeys: maze[cell.y][cell.x].requiredKeys });
  }

  return { keys: keysPlaced, locks: locksPlaced };
}

function findStartPosition(maze, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x].type === CELL_TYPES.START) {
        return { x, y };
      }
    }
  }
  return { x: 1, y: 1 };
}

exports.startGame = async (req, res) => {
  try {
    const { difficulty = 'medium', category } = req.body;

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories: ' + VALID_CATEGORIES.join(', ')
      });
    }

    const size = MAZE_SIZES[difficulty] || 20;
    const maze = generateMaze(size, size);
    const { keys, locks } = placeKeysAndLocks(maze, size, size, difficulty);
    const playerPosition = findStartPosition(maze, size, size);

    const gameState = {
      maze,
      player: {
        position: playerPosition,
        keysCollected: 0,
        keysInventory: [],
        moves: 0
      },
      gameConfig: {
        difficulty,
        category,
        totalKeys: keys.length,
        totalLocks: locks.length
      },
      keys,
      locks,
      status: 'playing',
      startTime: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Game started successfully',
      data: gameState
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game'
    });
  }
};

exports.movePlayer = async (req, res) => {
  try {
    const { direction, currentMaze, playerState } = req.body;

    if (!direction || !currentMaze || !playerState) {
      return res.status(400).json({
        success: false,
        message: 'Please provide direction, maze, and player state'
      });
    }

    const validDirections = ['up', 'down', 'left', 'right'];
    if (!validDirections.includes(direction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid direction. Use: up, down, left, right'
      });
    }

    const { x, y } = playerState.position;
    let newX = x;
    let newY = y;

    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }

    const height = currentMaze.length;
    const width = currentMaze[0].length;

    if (newX < 0 || newX >= width || newY < 0 || newY >= height) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move outside maze'
      });
    }

    const targetCell = currentMaze[newY][newX];

    if (targetCell.type === CELL_TYPES.WALL) {
      return res.status(400).json({
        success: false,
        message: 'Blocked by wall',
        data: {
          position: { x, y },
          keysCollected: playerState.keysCollected,
          keysInventory: playerState.keysInventory,
          moves: playerState.moves,
          blocked: true
        }
      });
    }

    let newKeysCollected = playerState.keysCollected;
    let newKeysInventory = [...playerState.keysInventory];
    let message = 'Moved successfully';
    let keyCollected = null;
    let lockUnlocked = null;
    let gameWon = false;
    let needsQuestion = false;

    if (targetCell.type === CELL_TYPES.KEY) {
      needsQuestion = true;
      message = 'Solve a question to collect this key!';
    }

    if (targetCell.type === CELL_TYPES.LOCK) {
      if (newKeysCollected >= targetCell.requiredKeys) {
        newKeysCollected -= targetCell.requiredKeys;
        lockUnlocked = {
          lockId: targetCell.lockId,
          requiredKeys: targetCell.requiredKeys,
          remainingKeys: newKeysCollected
        };
        message = `Unlocked gate! Used ${targetCell.requiredKeys} key(s)`;
      } else {
        return res.status(400).json({
          success: false,
          message: `Need ${targetCell.requiredKeys} key(s) to unlock. You have ${newKeysCollected}. Collect more keys!`,
          data: {
            position: { x, y },
            keysCollected: newKeysCollected,
            keysInventory: newKeysInventory,
            moves: playerState.moves + 1,
            blocked: true,
            lockInfo: {
              required: targetCell.requiredKeys,
              have: newKeysCollected
            }
          }
        });
      }
    }

    if (targetCell.type === CELL_TYPES.EXIT) {
      gameWon = true;
      message = 'Congratulations! You escaped the maze!';
    }

    if (needsQuestion) {
      return res.status(200).json({
        success: true,
        message,
        data: {
          position: { x, y },
          keysCollected: newKeysCollected,
          keysInventory: newKeysInventory,
          moves: playerState.moves + 1,
          needsQuestion: true,
          keyInfo: {
            keyId: targetCell.keyId,
            keyValue: targetCell.keyValue,
            position: { x: newX, y: newY }
          },
          cellType: targetCell.type
        }
      });
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        position: { x: newX, y: newY },
        keysCollected: newKeysCollected,
        keysInventory: newKeysInventory,
        moves: playerState.moves + 1,
        keyCollected,
        lockUnlocked,
        gameWon,
        cellType: targetCell.type
      }
    });
  } catch (error) {
    console.error('Move player error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move player'
    });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const { category, questionId } = req.query;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing category'
      });
    }

    const sampleQuestions = {
      'Python': [
        { id: 'q_1', question: 'What is the output of print(type([]))?', options: ['list', 'dict', 'tuple', 'set'], correct: 0 },
        { id: 'q_2', question: 'Which method is used to add an element to a list?', options: ['add()', 'append()', 'insert()', 'push()'], correct: 1 },
        { id: 'q_3', question: 'What is 2**3 in Python?', options: ['6', '8', '9', '5'], correct: 1 }
      ],
      'JavaScript': [
        { id: 'q_1', question: 'Which method converts JSON string to object?', options: ['JSON.stringify()', 'JSON.parse()', 'JSON.convert()', 'JSON.object()'], correct: 1 },
        { id: 'q_2', question: 'What is typeof null?', options: ['null', 'undefined', 'object', 'boolean'], correct: 2 },
        { id: 'q_3', question: 'Which array method creates new array?', options: ['push()', 'pop()', 'map()', 'shift()'], correct: 2 }
      ],
      'React': [
        { id: 'q_1', question: 'What hook manages state?', options: ['useEffect', 'useState', 'useContext', 'useRef'], correct: 1 },
        { id: 'q_2', question: 'JSX stands for?', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript Extra'], correct: 0 },
        { id: 'q_3', question: 'Which is NOT a React hook?', options: ['useState', 'useEffect', 'useQuery', 'useReducer'], correct: 2 }
      ],
      'HTML+CSS': [
        { id: 'q_1', question: 'Which tag defines the largest heading?', options: ['<h6>', '<h1>', '<head>', '<header>'], correct: 1 },
        { id: 'q_2', question: 'Which property changes text color?', options: ['text-color', 'font-color', 'color', 'foreground'], correct: 2 },
        { id: 'q_3', question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correct: 1 }
      ],
      'C++': [
        { id: 'q_1', question: 'Which operator is used for output?', options: ['>>', '<<', '::', '->'], correct: 1 },
        { id: 'q_2', question: 'What is the size of int in C++?', options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'], correct: 1 },
        { id: 'q_3', question: 'Which keyword defines a class?', options: ['struct', 'class', 'interface', 'define'], correct: 1 }
      ]
    };

    const questions = sampleQuestions[category] || [];
    const question = questions.find(q => q.id === questionId) || questions[Math.floor(Math.random() * questions.length)];

    res.status(200).json({
      success: true,
      data: {
        question: question,
        category,
        hint: 'Answer correctly to earn bonus keys!'
      }
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question'
    });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { answer, correctAnswer } = req.body;

    if (answer === undefined || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide answer and correctAnswer'
      });
    }

    const isCorrect = answer === correctAnswer;

    res.status(200).json({
      success: true,
      data: {
        isCorrect,
        message: isCorrect ? 'Correct! You earned a key!' : 'Wrong answer. Try again!',
        reward: isCorrect ? 1 : 0
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer'
    });
  }
};

exports.openGate = async (req, res) => {
  try {
    const { gatePosition, currentKeys } = req.body;

    if (!gatePosition || currentKeys === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide gate position and current keys'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gate opened successfully!',
      data: {
        remainingKeys: currentKeys,
        gateOpened: true
      }
    });
  } catch (error) {
    console.error('Open gate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open gate'
    });
  }
};

exports.saveGameResult = async (req, res) => {
  try {
    const { userId, topic, difficulty, keysCollected, keysUsed, questionsSolved, questionsFailed, totalQuestions, moves, timeSpent, completed } = req.body;

    if (!userId || !topic) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and topic'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResult = await UserResult.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      topic,
      difficulty: difficulty || 'medium',
      keysCollected: keysCollected || 0,
      keysUsed: keysUsed || 0,
      questionsSolved: questionsSolved || 0,
      questionsFailed: questionsFailed || 0,
      totalQuestions: totalQuestions || 0,
      moves: moves || 0,
      timeSpent: timeSpent || 0,
      completed: completed !== false
    });

    await User.findByIdAndUpdate(userId, {
      $inc: { gamesPlayed: 1, totalKeysCollected: keysCollected || 0 },
      $set: { isOnline: false }
    });

    res.status(201).json({
      success: true,
      message: 'Game result saved successfully',
      data: userResult
    });
  } catch (error) {
    console.error('Save game result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save game result'
    });
  }
};

exports.getUserResults = async (req, res) => {
  try {
    const results = await UserResult.find().sort({ playedAt: -1 });
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get user results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user results'
    });
  }
};
