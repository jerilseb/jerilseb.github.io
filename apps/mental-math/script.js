const { createClient } = supabase;
const supabaseUrl = 'https://rmethuurxctjakzkjlaf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRodXVyeGN0amFremtqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MTkwMjUsImV4cCI6MjA1NzA5NTAyNX0.qYkFNpxOSRVAq3kDy08nM14xo9va3tGik02x1tthtUM';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const gameSetup = document.getElementById('game-setup');
const gameArea = document.getElementById('game-area');
const gameOver = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const playerNameInput = document.getElementById('player-name');
const nameError = document.getElementById('name-error');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const namePrompt = document.getElementById('name-prompt');
const welcomeBack = document.getElementById('welcome-back');
const welcomeName = document.getElementById('welcome-name');
const changeNameBtn = document.getElementById('change-name-btn');
const leaderboardView = document.getElementById('leaderboard');
const leaderboardTableBody = document.getElementById('leaderboard-body');
const backToMenuBtn = document.getElementById('back-to-menu');

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
    let playerName = localStorage.getItem('currentPlayer');
    if (!playerName) {
        playerName = playerNameInput.value.trim();
        if (!playerName) {
            nameError.classList.remove('hidden');
            return;
        }
        nameError.classList.add('hidden');
        localStorage.setItem('currentPlayer', playerName);
    }

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
    saveScore(localStorage.getItem('currentPlayer'), score);
};

const saveScore = async (name, score) => {
    await supabaseClient
        .from('mental-math-scores')
        .insert([{ player_name: name, score: score }]);
};

const showLeaderboard = async () => {
    gameSetup.classList.add('hidden');
    leaderboardView.classList.remove('hidden');

    const { data: scores, error } = await supabaseClient
        .from('mental-math-scores')
        .select('player_name, score')
        .order('score', { ascending: false });

    if (error) {
        console.error('Error fetching scores:', error);
        return;
    }

    leaderboardTableBody.innerHTML = '';
    scores.forEach((score, index) => {
        const row = document.createElement('tr');
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        const nameCell = document.createElement('td');
        nameCell.textContent = score.player_name;
        const scoreCell = document.createElement('td');
        scoreCell.textContent = score.score;
        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        leaderboardTableBody.appendChild(row);
    });
};

const showMenu = () => {
    leaderboardView.classList.add('hidden');
    gameSetup.classList.remove('hidden');
    initializeWelcomeScreen();
}

const playAgain = () => {
    gameOver.classList.add('hidden');
    gameSetup.classList.remove('hidden');
    initializeWelcomeScreen();
};

const changeName = () => {
    localStorage.removeItem('currentPlayer');
    initializeWelcomeScreen();
};

const initializeWelcomeScreen = () => {
    const playerName = localStorage.getItem('currentPlayer');
    if (playerName) {
        namePrompt.classList.add('hidden');
        welcomeBack.classList.remove('hidden');
        welcomeName.textContent = playerName;
        changeNameBtn.classList.remove('hidden');
    } else {
        namePrompt.classList.remove('hidden');
        welcomeBack.classList.add('hidden');
        changeNameBtn.classList.add('hidden');
    }
};

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', playAgain);
leaderboardBtn.addEventListener('click', showLeaderboard);
backToMenuBtn.addEventListener('click', showMenu);
changeNameBtn.addEventListener('click', changeName);

initializeWelcomeScreen();