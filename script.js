const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const pauseScreen = document.getElementById('pause-screen');
const endScreen = document.getElementById('end-screen');
const startButton = document.getElementById('start-btn');
const resumeButton = document.getElementById('resume-btn');
const restartButton = document.getElementById('restart-btn');
const pauseButton = document.getElementById('pause-btn');
const retryButton = document.getElementById('retry-btn');
const questionElement = document.getElementById('question');
const answersElement = document.getElementById('answers');
const nextButton = document.getElementById('next-btn');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const questionCounterDisplay = document.getElementById('question-counter');
const finalScoreDisplay = document.getElementById('final-score');
const progressBar = document.getElementById('progress');
const highScoresList = document.getElementById('high-scores');
const errorMessage = document.getElementById('error-message');
const numQuestionsSelect = document.getElementById('num-questions');
const difficultySelect = document.getElementById('difficulty');
const categorySelect = document.getElementById('category');
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const tickSound = document.getElementById('tick-sound');

let currentQuestion = {};
let acceptingAnswers = true;
let score = 0;
let questionCounter = 0;
let maxQuestions = 5;
let difficulty = 'easy';
let category = 'any';
let timer;
let timeLeft = 30;
let isPaused = false;
let retryCount = 0;
const maxRetries = 3;

// Fallback question bank
const fallbackQuestions = [
  {
    category: "General Knowledge",
    type: "multiple",
    difficulty: "easy",
    question: "What is the capital city of France?",
    correct_answer: "Paris",
    incorrect_answers: ["London", "Berlin", "Madrid"]
  },
  {
    category: "Science & Nature",
    type: "multiple",
    difficulty: "medium",
    question: "What planet is known as the Red Planet?",
    correct_answer: "Mars",
    incorrect_answers: ["Jupiter", "Venus", "Mercury"]
  },
  {
    category: "History",
    type: "multiple",
    difficulty: "hard",
    question: "Who was the first president of the United States?",
    correct_answer: "George Washington",
    incorrect_answers: ["Thomas Jefferson", "Abraham Lincoln", "John Adams"]
  }
];

function loadHighScores() {
  const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
  highScoresList.innerHTML = highScores
    .slice(0, 5)
    .map(score => `<li>${score.score} / ${score.max} (${score.difficulty})</li>`)
    .join('');
}

function saveHighScore() {
  const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
  highScores.push({ score, max: maxQuestions, difficulty });
  highScores.sort((a, b) => b.score - a.score);
  localStorage.setItem('highScores', JSON.stringify(highScores));
  loadHighScores();
}

async function fetchQuestion() {
  try {
    const categoryParam = category === 'any' ? '' : `&category=${category}`;
    const url = `https://opentdb.com/api.php?amount=1&type=multiple&difficulty=${difficulty}${categoryParam}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }
      throw new Error(`HTTP error: ${res.status}`);
    }
    const data = await res.json();
    if (data.response_code !== 0) {
      switch (data.response_code) {
        case 1:
          throw new Error('No questions available for this category/difficulty.');
        case 2:
          throw new Error('Invalid parameters in API request.');
        case 3:
          throw new Error('Session token issue. Please try again.');
        case 4:
          throw new Error('Session token has exhausted questions.');
        default:
          throw new Error('Unknown API error.');
      }
    }
    retryCount = 0;
    return data.results[0];
  } catch (error) {
    console.error('Fetch error:', error.message);
    if (retryCount < maxRetries) {
      retryCount++;
      errorMessage.textContent = `Failed to load question (Attempt ${retryCount}/${maxRetries}). Retrying...`;
      errorMessage.classList.remove('hidden');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return await fetchQuestion();
    } else {
      errorMessage.textContent = 'Unable to load question. Using fallback question.';
      errorMessage.classList.remove('hidden');
      retryButton.classList.remove('hidden');
      const randomIndex = Math.floor(Math.random() * fallbackQuestions.length);
      return fallbackQuestions[randomIndex];
    }
  }
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function startTimer() {
  timeLeft = 30;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  timer = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    timerDisplay.textContent = `Time: ${timeLeft}`;
    if (timeLeft <= 5 && timeLeft > 0) tickSound.play();
    if (timeLeft <= 0) {
      clearInterval(timer);
      selectAnswer(null, null, currentQuestion.correct_answer);
    }
  }, 1000);
}

async function loadNextQuestion() {
  if (questionCounter >= maxQuestions) {
    clearInterval(timer);
    gameScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = `Your Score: ${score} / ${maxQuestions}`;
    saveHighScore();
    return;
  }

  questionCounter++;
  errorMessage.classList.add('hidden');
  retryButton.classList.add('hidden');
  const question = await fetchQuestion();
  if (!question) return;

  currentQuestion = question;
  const questionText = decodeHTML(currentQuestion.question);
  const correctAnswer = decodeHTML(currentQuestion.correct_answer);
  const answers = shuffleArray([
    ...currentQuestion.incorrect_answers.map(a => decodeHTML(a)),
    correctAnswer
  ]);

  questionElement.textContent = questionText;
  answersElement.innerHTML = '';
  nextButton.classList.add('hidden');
  pauseButton.classList.remove('hidden');
  acceptingAnswers = true;

  answers.forEach((answer, index) => {
    const btn = document.createElement('button');
    btn.textContent = answer;
    btn.classList.add('answer-btn');
    btn.style.animationDelay = `${0.2 + index * 0.1}s`;
    btn.addEventListener('click', () => selectAnswer(btn, answer, correctAnswer));
    answersElement.appendChild(btn);
  });

  questionCounterDisplay.textContent = `Question ${questionCounter} / ${maxQuestions}`;
  scoreDisplay.textContent = `Score: ${score}`;
  progressBar.style.width = `${(questionCounter / maxQuestions) * 100}%`;
  startTimer();
}

function selectAnswer(btn, selected, correct) {
  if (!acceptingAnswers) return;
  acceptingAnswers = false;
  clearInterval(timer);

  const allButtons = document.querySelectorAll('.answer-btn');
  allButtons.forEach(b => b.disabled = true);

  if (selected === correct) {
    btn.classList.add('correct');
    score++;
    correctSound.play();
  } else {
    if (btn) btn.classList.add('wrong');
    allButtons.forEach(b => {
      if (b.textContent === correct) b.classList.add('correct');
    });
    wrongSound.play();
  }

  nextButton.classList.remove('hidden');
}

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

startButton.addEventListener('click', () => {
  maxQuestions = parseInt(numQuestionsSelect.value);
  difficulty = difficultySelect.value;
  category = categorySelect.value;
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  score = 0;
  questionCounter = 0;
  retryCount = 0;
  loadNextQuestion();
});

pauseButton.addEventListener('click', () => {
  isPaused = true;
  clearInterval(timer);
  gameScreen.classList.add('hidden');
  pauseScreen.classList.remove('hidden');
});

resumeButton.addEventListener('click', () => {
  isPaused = false;
  pauseScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  startTimer();
});

nextButton.addEventListener('click', loadNextQuestion);

retryButton.addEventListener('click', () => {
  retryCount = 0;
  loadNextQuestion();
});

restartButton.addEventListener('click', () => {
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

loadHighScores();