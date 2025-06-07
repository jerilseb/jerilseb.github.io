const gameSetup = document.getElementById('game-setup');
const gameArea = document.getElementById('game-area');
const gameOver = document.getElementById('game-over');

const startBtn = document.getElementById('start-btn');

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const problemEl = document.getElementById('problem');
const optionsContainer = document.getElementById('options-container');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again');
const feedbackIndicator = document.getElementById('feedback-indicator');

let score;
let timer;
let timerInterval;
let correctAnswer;
let questionCount;

const startGame = () => {
    score = 0;
    questionCount = 0;
    timer = 60;
    scoreEl.textContent = score;
    timerEl.textContent = timer;

    gameSetup.classList.add('hidden');
    gameOver.classList.add('hidden');
    gameArea.classList.remove('hidden');

    generateProblem();
    startTimer();
};

const generateProblem = () => {
    questionCount++;
    let num1, num2, operator;
    const modes = ['addition', 'subtraction', 'multiplication'];
    const mode = modes[Math.floor(Math.random() * modes.length)];

    switch (mode) {
        case 'addition':
            num1 = Math.floor(Math.random() * 900) + 100;
            num2 = Math.floor(Math.random() * 900) + 100;
            operator = '+';
            correctAnswer = num1 + num2;
            break;
        case 'subtraction':
            num1 = Math.floor(Math.random() * 900) + 100;
            num2 = Math.floor(Math.random() * num1) + 100; // Ensure positive result
            operator = '-';
            correctAnswer = num1 - num2;
            break;
        case 'multiplication':
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;
            operator = '×';
            correctAnswer = num1 * num2;
            break;
    }

    problemEl.textContent = `${num1} ${operator} ${num2}`;
    generateOptions();
};

const generateOptions = () => {
    optionsContainer.innerHTML = '';
    const options = new Set([correctAnswer]);
    let attempts = 0;

    // Generate 4 unique distractors
    while (options.size < 5 && attempts < 100) {
        const range = Math.ceil(correctAnswer * 0.3);
        const delta = Math.floor(Math.random() * (2 * range + 1)) - range;
        let distractor = correctAnswer + delta;

        // Ensure distractor is different and plausible
        if (distractor !== correctAnswer && distractor > 0) {
            // Add a chance for the last digit to be the same
            if (Math.random() > 0.5) {
                const lastDigitCorrect = correctAnswer % 10;
                distractor = Math.floor(distractor / 10) * 10 + lastDigitCorrect;
            }
            options.add(distractor);
        }
        attempts++;
    }

    // Fallback to simple options if the loop fails
    let fallbackOption = 1;
    while (options.size < 5) {
        let nextOption = correctAnswer + fallbackOption;
        if(nextOption !== correctAnswer) options.add(nextOption);
        fallbackOption = (fallbackOption > 0) ? -fallbackOption : -fallbackOption + 1;
    }


    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-btn');
        button.addEventListener('click', () => checkAnswer(option));
        optionsContainer.appendChild(button);
    });
};


const checkAnswer = (selectedOption) => {
    // Disable buttons to prevent multiple answers
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(button => button.disabled = true);

    const isCorrect = selectedOption === correctAnswer;
    if (isCorrect) {
        score++;
        scoreEl.textContent = score;
    }
    showFeedback(isCorrect);
};

const showFeedback = (isCorrect) => {
    feedbackIndicator.textContent = isCorrect ? '✓' : '✗';
    feedbackIndicator.className = isCorrect ? 'correct' : 'incorrect';
    feedbackIndicator.classList.remove('hidden');

    setTimeout(() => {
        feedbackIndicator.classList.add('hidden');
        if (questionCount >= 10) {
            endGame();
        } else {
            generateProblem();
        }
    }, 500);
};

const startTimer = () => {
    timerInterval = setInterval(() => {
        timer--;
        timerEl.textContent = timer;
        if (timer <= 0) {
            endGame();
        }
    }, 1000);
};

const endGame = () => {
    clearInterval(timerInterval);
    gameArea.classList.add('hidden');
    gameOver.classList.remove('hidden');
    finalScoreEl.textContent = score;
};

const playAgain = () => {
    gameOver.classList.add('hidden');
    gameSetup.classList.remove('hidden');
};

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', playAgain);