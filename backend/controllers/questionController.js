const { TopicModels } = require('../models/TopicQuestions');

const VALID_TOPICS = ['cpp', 'python', 'javascript', 'react', 'html_css'];
const VALID_TYPES = ['QUIZ', 'CODING', 'INTERACTIVE_SCENARIO', 'DEBUGGING', 'SHARP_SHOOTER'];

const REWARD_KEYS = {
  'QUIZ': 2,
  'CODING': 3,
  'INTERACTIVE_SCENARIO': 4,
  'DEBUGGING': 5,
  'SHARP_SHOOTER': 10
};

exports.addQuestion = async (req, res) => {
  try {
    const { topic, type, questionText, options, correctAnswer, codeSnippet, errorLine, errorType, timeLimit, difficulty } = req.body;

    if (!topic || !type || !questionText || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide topic, type, questionText, and correctAnswer'
      });
    }

    if (!VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid topics: ${VALID_TOPICS.join(', ')}`
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid types: ${VALID_TYPES.join(', ')}`
      });
    }

    if (type === 'QUIZ' && (!options || options.length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'QUIZ type requires at least 2 options'
      });
    }

    if (type === 'DEBUGGING' && (!errorLine || !errorType)) {
      return res.status(400).json({
        success: false,
        message: 'DEBUGGING type requires errorLine and errorType'
      });
    }

    const rewardKeys = type === 'SHARP_SHOOTER' ? 10 : REWARD_KEYS[type] || 2;
    const questionTimeLimit = type === 'SHARP_SHOOTER' ? 20 : (timeLimit || 20);

    const Model = TopicModels[topic];
    const newQuestion = await Model.create({
      type,
      questionText,
      options: type === 'QUIZ' ? options : [],
      correctAnswer,
      codeSnippet: codeSnippet || '',
      errorLine: errorLine || null,
      errorType: errorType || null,
      timeLimit: questionTimeLimit,
      rewardKeys,
      difficulty: difficulty || 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion
    });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add question'
    });
  }
};

exports.getRandomQuestion = async (req, res) => {
  try {
    const { topic, type } = req.params;

    if (!topic || !VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid topics: ${VALID_TOPICS.join(', ')}`
      });
    }

    let questionType = type;
    
    if (questionType && !VALID_TYPES.includes(questionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid types: ${VALID_TYPES.join(', ')}`
      });
    }

    let isSharpShooter = false;

    if (!questionType) {
      const randomTypeIndex = Math.floor(Math.random() * (VALID_TYPES.length - 1));
      questionType = VALID_TYPES[randomTypeIndex];
    }

    if (questionType === 'SHARP_SHOOTER') {
      const otherTypes = VALID_TYPES.filter(t => t !== 'SHARP_SHOOTER');
      questionType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
      isSharpShooter = true;
    }

    const Model = TopicModels[topic];
    let count = await Model.countDocuments({ type: questionType });
    
    if (count === 0) {
      const allTypes = [...VALID_TYPES];
      for (const t of allTypes) {
        if (t === 'SHARP_SHOOTER') continue;
        count = await Model.countDocuments({ type: t });
        if (count > 0) {
          questionType = t;
          break;
        }
      }
    }
    
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: `No questions found for topic: ${topic}. Please add questions in admin panel.`
      });
    }

    const random = Math.floor(Math.random() * count);
    const question = await Model.findOne({ type: questionType }).skip(random);

    const responseData = {
      _id: question._id,
      topic,
      type: isSharpShooter ? 'SHARP_SHOOTER' : question.type,
      questionText: question.questionText,
      options: question.options,
      codeSnippet: question.codeSnippet,
      errorLine: question.errorLine,
      errorType: question.errorType,
      difficulty: question.difficulty,
      rewardKeys: isSharpShooter ? 10 : question.rewardKeys,
      timeLimit: isSharpShooter ? 20 : question.timeLimit,
      isSharpShooter
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get random question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get random question'
    });
  }
};

exports.validateAnswer = async (req, res) => {
  try {
    const { topic, questionId, answer, lineNumber, errorType } = req.body;

    if (!topic || !questionId || answer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide topic, questionId, and answer'
      });
    }

    if (!VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid topics: ${VALID_TOPICS.join(', ')}`
      });
    }

    const Model = TopicModels[topic];
    const question = await Model.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    let isCorrect = false;
    const correctAnswer = question.correctAnswer;

    switch (question.type) {
      case 'QUIZ':
        isCorrect = answer === correctAnswer || answer === correctAnswer.toString();
        break;
        
      case 'CODING':
      case 'INTERACTIVE_SCENARIO':
        if (typeof correctAnswer === 'string') {
          isCorrect = answer.toString().toLowerCase().trim() === correctAnswer.toString().toLowerCase().trim();
        } else if (Array.isArray(correctAnswer)) {
          isCorrect = correctAnswer.some(ans => 
            answer.toString().toLowerCase().trim() === ans.toString().toLowerCase().trim()
          );
        }
        break;
        
      case 'DEBUGGING':
        const isLineCorrect = answer.lineNumber === correctAnswer.lineNumber || answer.lineNumber === correctAnswer.lineNumber.toString();
        const isTypeCorrect = answer.errorType === correctAnswer.errorType;
        isCorrect = isLineCorrect && isTypeCorrect;
        break;
        
      default:
        isCorrect = answer === correctAnswer || answer === correctAnswer.toString();
    }

    const timeChange = isCorrect ? -5 : 5;

    res.status(200).json({
      success: true,
      data: {
        isCorrect,
        correctAnswer: question.type === 'DEBUGGING' ? {
          lineNumber: correctAnswer.lineNumber,
          errorType: correctAnswer.errorType
        } : correctAnswer,
        rewardKeys: isCorrect ? question.rewardKeys : 0,
        timeChange,
        message: isCorrect 
          ? `Correct! You earned ${question.rewardKeys} key(s)! Time reduced by 5s.`
          : 'Wrong answer! Time increased by 5s.'
      }
    });
  } catch (error) {
    console.error('Validate answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate answer'
    });
  }
};

exports.getQuestionsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;

    if (!VALID_TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topic. Valid topics: ${VALID_TOPICS.join(', ')}`
      });
    }

    const Model = TopicModels[topic];
    const questions = await Model.find();

    res.status(200).json({
      success: true,
      data: {
        topic,
        count: questions.length,
        questions
      }
    });
  } catch (error) {
    console.error('Get questions by topic error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions'
    });
  }
};

exports.seedQuestions = async (req, res) => {
  try {
    const questionsByTopic = {
      python: [
        { type: 'QUIZ', questionText: 'What is the output of print(type([]))?', options: ['list', 'dict', 'tuple', 'set'], correctAnswer: 0, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which keyword is used to define a function?', options: ['function', 'def', 'func', 'define'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What is 2**3 in Python?', options: ['6', '8', '9', '5'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which data type is immutable?', options: ['list', 'dict', 'tuple', 'set'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What does len() return for empty list?', options: ['0', '1', 'None', 'False'], correctAnswer: 0, difficulty: 'easy', rewardKeys: 2 },
        { type: 'CODING', questionText: 'Write code to print "Hello World"', correctAnswer: 'print("Hello World")', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create a variable x with value 10', correctAnswer: 'x = 10', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Write a for loop from 0 to 4', correctAnswer: 'for i in range(5)', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create a list with numbers 1,2,3', correctAnswer: '[1, 2, 3]', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Write an if condition checking if x > 5', correctAnswer: 'if x > 5', difficulty: 'easy', rewardKeys: 3 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'What method adds element to end of list?', correctAnswer: 'append', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How do you get user input?', correctAnswer: 'input', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'What keyword starts a function?', correctAnswer: 'def', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How do you check length of list?', correctAnswer: 'len', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'What keyword creates a loop?', correctAnswer: 'for', difficulty: 'easy', rewardKeys: 4 },
        { type: 'DEBUGGING', questionText: 'Find the error:\nx = [1,2,3]\nprint(x[5])', codeSnippet: 'x = [1,2,3]\nprint(x[5])', errorLine: 2, errorType: 'runtime', correctAnswer: { lineNumber: 2, errorType: 'runtime' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find the error:\nprint(x)\nx = 5', codeSnippet: 'print(x)\nx = 5', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find the error:\ndef func():\nprint("Hi")', codeSnippet: 'def func():\nprint("Hi")', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find the error:\nfor i in range(10)\nprint(i)', codeSnippet: 'for i in range(10)\nprint(i)', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find the error:\nx = "10"\nprint(x + 5)', codeSnippet: 'x = "10"\nprint(x + 5)', errorLine: 2, errorType: 'runtime', correctAnswer: { lineNumber: 2, errorType: 'runtime' }, difficulty: 'medium', rewardKeys: 5 },
      ],
      javascript: [
        { type: 'QUIZ', questionText: 'Which method converts JSON to object?', options: ['JSON.stringify()', 'JSON.parse()', 'JSON.convert()', 'JSON.object()'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What is typeof null?', options: ['null', 'undefined', 'object', 'boolean'], correctAnswer: 2, difficulty: 'medium', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which keyword declares a constant?', options: ['var', 'let', 'const', 'define'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which method adds to array end?', options: ['push()', 'pop()', 'shift()', 'unshift()'], correctAnswer: 0, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What is === in JavaScript?', options: ['Assignment', 'Comparison', 'Increment', 'Decrement'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'CODING', questionText: 'Declare a constant x = 10', correctAnswer: 'const x = 10', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create an arrow function', correctAnswer: '=>', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Write console log', correctAnswer: 'console.log', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create an array', correctAnswer: '[]', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Write an if statement', correctAnswer: 'if', difficulty: 'easy', rewardKeys: 3 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'Which method adds to array start?', correctAnswer: 'unshift', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How do you check array length?', correctAnswer: 'length', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to convert to string?', correctAnswer: 'toString', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to merge arrays?', correctAnswer: 'concat', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to parse JSON?', correctAnswer: 'JSON.parse', difficulty: 'easy', rewardKeys: 4 },
        { type: 'DEBUGGING', questionText: 'Find error:\nconsole.log(x)\nlet x = 5', codeSnippet: 'console.log(x)\nlet x = 5', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error:\nconst x = 5\nx = 10', codeSnippet: 'const x = 5\nx = 10', errorLine: 2, errorType: 'runtime', correctAnswer: { lineNumber: 2, errorType: 'runtime' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error:\nconsole.log(x', codeSnippet: 'console.log(x', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error:\n[1,2,3].forEach(x => x * 2)', codeSnippet: '[1,2,3].forEach(x => x * 2)', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error:\nJSON.parse("invalid")', codeSnippet: 'JSON.parse("invalid")', errorLine: 1, errorType: 'runtime', correctAnswer: { lineNumber: 1, errorType: 'runtime' }, difficulty: 'easy', rewardKeys: 5 },
      ],
      react: [
        { type: 'QUIZ', questionText: 'What hook manages state?', options: ['useEffect', 'useState', 'useContext', 'useRef'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'JSX stands for?', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript Extra'], correctAnswer: 0, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which hook runs after render?', options: ['useState', 'useEffect', 'useMemo', 'useCallback'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'How do you render a list in React?', options: ['for loop', 'while loop', 'map()', 'forEach()'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What is used to navigate?', options: ['<link>', '<a>', 'useNavigate()', 'router'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'CODING', questionText: 'Write useState hook', correctAnswer: 'useState', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Write useEffect hook', correctAnswer: 'useEffect', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create a functional component', correctAnswer: 'function', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Export a component', correctAnswer: 'export', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Import React', correctAnswer: 'import React', difficulty: 'easy', rewardKeys: 3 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'Which hook handles side effects?', correctAnswer: 'useEffect', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to create refs?', correctAnswer: 'useRef', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to manage global state?', correctAnswer: 'useContext', difficulty: 'medium', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to handle routing?', correctAnswer: 'useNavigate', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to get URL params?', correctAnswer: 'useParams', difficulty: 'easy', rewardKeys: 4 },
        { type: 'DEBUGGING', questionText: 'Find error: useState outside component', codeSnippet: 'useState()', errorLine: 1, errorType: 'runtime', correctAnswer: { lineNumber: 1, errorType: 'runtime' }, difficulty: 'medium', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error: Missing dependency in useEffect', codeSnippet: 'useEffect(() => {}, [])', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'hard', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error: Direct state mutation', codeSnippet: 'state.value = "new"', errorLine: 1, errorType: 'runtime', correctAnswer: { lineNumber: 1, errorType: 'runtime' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error: Infinite loop in useEffect', codeSnippet: 'useEffect(() => { setCount(count + 1) })', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'hard', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Find error: Using key as index', codeSnippet: '{list.map((item, i) => <div key={i}>)}', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'medium', rewardKeys: 5 },
      ],
      html_css: [
        { type: 'QUIZ', questionText: 'Which tag is the largest heading?', options: ['<h6>', '<h1>', '<head>', '<header>'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which property changes text color?', options: ['text-color', 'font-color', 'color', 'foreground'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which tag creates a link?', options: ['<link>', '<a>', '<href>', '<url>'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which property changes background?', options: ['bg-color', 'background-color', 'bgcolor', 'color'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'CODING', questionText: 'Write CSS to make text red', correctAnswer: 'color: red', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Center a div with flexbox', correctAnswer: 'display: flex', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Add background color', correctAnswer: 'background-color', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Create a class selector', correctAnswer: '.classname', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Set font size', correctAnswer: 'font-size', difficulty: 'easy', rewardKeys: 3 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'Which property changes background?', correctAnswer: 'background-color', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to make text bold?', correctAnswer: 'font-weight', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to add border?', correctAnswer: 'border', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to make rounded corners?', correctAnswer: 'border-radius', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to position absolutely?', correctAnswer: 'position: absolute', difficulty: 'medium', rewardKeys: 4 },
        { type: 'DEBUGGING', questionText: 'Fix: Missing semicolon', codeSnippet: 'color: red', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Invalid color value', codeSnippet: 'color: reedd', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Unclosed tag', codeSnippet: '<div>text', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Wrong selector', codeSnippet: '.class', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Cascade priority issue', codeSnippet: '.class { color: blue }', errorLine: 1, errorType: 'logical', correctAnswer: { lineNumber: 1, errorType: 'logical' }, difficulty: 'medium', rewardKeys: 5 },
      ],
      cpp: [
        { type: 'QUIZ', questionText: 'Which operator for output?', options: ['>>', '<<', '::', '->'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Size of int typically?', options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'], correctAnswer: 1, difficulty: 'medium', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which keyword defines class?', options: ['struct', 'class', 'interface', 'define'], correctAnswer: 1, difficulty: 'easy', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'What is nullptr?', options: ['0', 'NULL', 'Zero pointer', 'Empty string'], correctAnswer: 2, difficulty: 'medium', rewardKeys: 2 },
        { type: 'QUIZ', questionText: 'Which is not a data type?', options: ['int', 'float', 'string', 'character'], correctAnswer: 2, difficulty: 'easy', rewardKeys: 2 },
        { type: 'CODING', questionText: 'Write main function', correctAnswer: 'int main()', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Output to console', correctAnswer: 'cout', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Declare integer variable', correctAnswer: 'int', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Include iostream', correctAnswer: '#include', difficulty: 'easy', rewardKeys: 3 },
        { type: 'CODING', questionText: 'Use namespace', correctAnswer: 'using namespace', difficulty: 'easy', rewardKeys: 3 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to read input?', correctAnswer: 'cin', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to create object?', correctAnswer: 'new', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to call function?', correctAnswer: '()', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to inherit class?', correctAnswer: ':', difficulty: 'easy', rewardKeys: 4 },
        { type: 'INTERACTIVE_SCENARIO', questionText: 'How to use pointer?', correctAnswer: '*', difficulty: 'medium', rewardKeys: 4 },
        { type: 'DEBUGGING', questionText: 'Fix: Missing semicolon', codeSnippet: 'int x = 5', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Undefined reference', codeSnippet: 'cout << x', errorLine: 1, errorType: 'runtime', correctAnswer: { lineNumber: 1, errorType: 'runtime' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Wrong main signature', codeSnippet: 'void main()', errorLine: 1, errorType: 'syntax', correctAnswer: { lineNumber: 1, errorType: 'syntax' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Missing header', codeSnippet: 'cout << "hi"', errorLine: 1, errorType: 'runtime', correctAnswer: { lineNumber: 1, errorType: 'runtime' }, difficulty: 'easy', rewardKeys: 5 },
        { type: 'DEBUGGING', questionText: 'Fix: Array out of bounds', codeSnippet: 'int arr[3]; arr[5] = 1;', errorLine: 2, errorType: 'runtime', correctAnswer: { lineNumber: 2, errorType: 'runtime' }, difficulty: 'medium', rewardKeys: 5 },
      ]
    };

    const results = {};
    
    for (const [topic, questions] of Object.entries(questionsByTopic)) {
      const Model = TopicModels[topic];
      await Model.deleteMany({});
      await Model.insertMany(questions);
      results[topic] = questions.length;
    }

    const totalQuestions = Object.values(results).reduce((sum, count) => sum + count, 0);

    res.status(201).json({
      success: true,
      message: `Seeded ${totalQuestions} questions across ${Object.keys(results).length} topics`,
      data: { 
        total: totalQuestions,
        byTopic: results
      }
    });
  } catch (error) {
    console.error('Seed questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed questions'
    });
  }
};
