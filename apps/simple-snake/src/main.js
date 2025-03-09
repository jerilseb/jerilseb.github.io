// Import Supabase functions
import { initSupabase, saveScoreToSupabase, getLeaderboardFromSupabase } from './supabase.js';

// Game Constants
const GRID_SIZE = 20; // Size of each grid cell in pixels
const GRID_WIDTH = 20; // Number of cells horizontally
const GRID_HEIGHT = 20; // Number of cells vertically
const GAME_SPEED = 150; // Milliseconds between game updates

// Game Variables
let canvas, ctx;
let snake = [];
let food = {};
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let gameInterval;
let gameActive = false;
let playerName = '';

// DOM Elements
const playerForm = document.getElementById('player-form');
const gameContainer = document.getElementById('game-container');
const playerNameInput = document.getElementById('player-name');
const startGameButton = document.getElementById('start-game');
const restartGameButton = document.getElementById('restart-game');
const currentPlayerDisplay = document.getElementById('current-player');
const currentScoreDisplay = document.getElementById('current-score');
const leaderboard = document.getElementById('leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Set up canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Initialize Supabase
    initSupabase();
    
    // Check for stored player name
    checkStoredPlayerName();
    
    // Load and display leaderboard
    updateLeaderboard();
    
    // Event listeners
    startGameButton.addEventListener('click', startGame);
    restartGameButton.addEventListener('click', restartGame);
    document.addEventListener('keydown', handleKeyPress);
});

// Check if player name is stored in local storage
function checkStoredPlayerName() {
    const storedName = localStorage.getItem('snakeGamePlayerName');
    if (storedName) {
        playerName = storedName;
        playerNameInput.value = storedName;
    }
}

// Start the game
function startGame() {
    // Get and validate player name
    const inputName = playerNameInput.value.trim();
    if (!inputName) {
        alert('Please enter your name to start the game');
        return;
    }
    
    // Store player name
    playerName = inputName;
    localStorage.setItem('snakeGamePlayerName', playerName);
    
    // Update display
    currentPlayerDisplay.textContent = playerName;
    currentScoreDisplay.textContent = '0';
    
    // Show game container, hide form and leaderboard
    playerForm.classList.add('hidden');
    leaderboard.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Initialize game state
    initializeGame();
    
    // Start game loop
    gameActive = true;
    gameInterval = setInterval(gameLoop, GAME_SPEED);
}

// Initialize game state
function initializeGame() {
    // Reset score
    score = 0;
    currentScoreDisplay.textContent = '0';
    
    // Initialize snake at center
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);
    snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY }
    ];
    
    // Set initial direction
    direction = 'right';
    nextDirection = 'right';
    
    // Generate first food
    generateFood();
    
    // Draw initial state
    draw();
}

// Game loop
function gameLoop() {
    update();
    draw();
}

// Update game state
function update() {
    // Update direction
    direction = nextDirection;
    
    // Calculate new head position
    const head = { ...snake[0] };
    
    switch (direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // Check for collisions
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        // Increase score
        score += 10;
        currentScoreDisplay.textContent = score;
        
        // Generate new food
        generateFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
}

// Draw game state
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    ctx.fillStyle = '#3498db';
    snake.forEach((segment, index) => {
        // Make head a different color
        if (index === 0) {
            ctx.fillStyle = '#2980b9';
        } else {
            ctx.fillStyle = '#3498db';
        }
        
        ctx.fillRect(
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE
        );
        
        // Add border to segments
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE
        );
    });
    
    // Draw food
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Generate food at random position
function generateFood() {
    // Create random position
    const position = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
    };
    
    // Check if position overlaps with snake
    const isOnSnake = snake.some(segment => 
        segment.x === position.x && segment.y === position.y
    );
    
    // If overlaps, try again
    if (isOnSnake) {
        return generateFood();
    }
    
    food = position;
}

// Check for collisions with walls or self
function checkCollision(head) {
    // Wall collision
    if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= GRID_WIDTH ||
        head.y >= GRID_HEIGHT
    ) {
        return true;
    }
    
    // Self collision (check if head collides with any segment)
    return snake.some((segment, index) => {
        // Skip checking against the head itself
        if (index === 0) return false;
        return segment.x === head.x && segment.y === head.y;
    });
}

// Handle key presses for movement
function handleKeyPress(event) {
    // Only handle keys if game is active
    if (!gameActive) return;
    
    switch (event.key.toLowerCase()) {
        case 'w':
            // Prevent moving down if currently moving up
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 's':
            // Prevent moving up if currently moving down
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'a':
            // Prevent moving right if currently moving left
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'd':
            // Prevent moving left if currently moving right
            if (direction !== 'left') nextDirection = 'right';
            break;
    }
}

// Game over
async function gameOver() {
    // Stop game loop
    clearInterval(gameInterval);
    gameActive = false;
    
    // Save score to leaderboard
    await saveScore(playerName, score);
    
    // Update leaderboard display
    await updateLeaderboard();
    
    // Show leaderboard
    leaderboard.classList.remove('hidden');
    
    // Show game over message
    alert(`Game Over! Your score: ${score}`);
}

// Restart game
async function restartGame() {
    // Stop current game if active
    if (gameActive) {
        clearInterval(gameInterval);
    }
    
    // Hide leaderboard
    leaderboard.classList.add('hidden');
    
    // Reset and start new game
    initializeGame();
    gameActive = true;
    gameInterval = setInterval(gameLoop, GAME_SPEED);
}

// Save score to leaderboard in Supabase
async function saveScore(name, score) {
    // Don't save scores of 0
    if (score === 0) return;
    
    try {
        // Save to Supabase
        await saveScoreToSupabase(name, score);
    } catch (error) {
        console.error('Failed to save score to Supabase:', error);
        alert('Failed to save your score to the leaderboard. Please check your connection and Supabase settings.');
    }
}

// Update leaderboard display
async function updateLeaderboard() {
    // Show loading state
    leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Loading leaderboard...</td></tr>';
    
    try {
        // Get leaderboard data from Supabase
        const leaderboard = await getLeaderboardFromSupabase();
        
        // Clear current leaderboard
        leaderboardBody.innerHTML = '';
        
        // Add entries
        leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            
            // Rank cell
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            row.appendChild(rankCell);
            
            // Name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = entry.player_name; // Only use Supabase format
            row.appendChild(nameCell);
            
            // Score cell
            const scoreCell = document.createElement('td');
            scoreCell.textContent = entry.score;
            row.appendChild(scoreCell);
            
            // Add row to table
            leaderboardBody.appendChild(row);
        });
        
        // If no entries, show message
        if (leaderboard.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'No scores yet. Play a game!';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            leaderboardBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Error connecting to Supabase leaderboard. Please check your connection and Supabase settings.</td></tr>';
    }
}