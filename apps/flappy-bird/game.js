// Game variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// Game settings
const GRAVITY = 0.5;
const FLAP_STRENGTH = -10;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const GROUND_HEIGHT = 100;
const SHOOT_COOLDOWN = 5000; // 5 seconds in milliseconds

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let bird = {};
let pipes = [];
let projectiles = [];
let explosions = [];
let score = 0;
let frameCount = 0;
let pipeSpawnTimer = 0;
let lastShootTime = 0;
let shootFlashTime = 0;
let leaderboard = [];
const MAX_LEADERBOARD_ENTRIES = 5;

// Load leaderboard from local storage
function loadLeaderboard() {
    const storedLeaderboard = localStorage.getItem('flappyBirdLeaderboard');
    if (storedLeaderboard) {
        leaderboard = JSON.parse(storedLeaderboard);
    } else {
        leaderboard = [];
    }
}

// Save leaderboard to local storage
function saveLeaderboard() {
    localStorage.setItem('flappyBirdLeaderboard', JSON.stringify(leaderboard));
}

// Add score to leaderboard
function addScoreToLeaderboard(newScore) {
    // Add the new score
    leaderboard.push(newScore);
    
    // Sort leaderboard in descending order
    leaderboard.sort((a, b) => b - a);
    
    // Keep only the top scores
    if (leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
        leaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
    }
    
    // Save to local storage
    saveLeaderboard();
}

// Initialize the game
function init() {
    // Initialize bird
    bird = {
        x: canvas.width / 3,
        y: canvas.height / 2,
        width: 40,
        height: 32,
        velocity: 0,
        alive: true
    };

    // Clear pipes, projectiles, and explosions
    pipes = [];
    projectiles = [];
    explosions = [];

    // Reset score
    score = 0;

    // Reset frame count
    frameCount = 0;

    // Reset pipe spawn timer
    pipeSpawnTimer = 0;
    
    // Reset shoot cooldown and flash
    lastShootTime = 0;
    shootFlashTime = 0;
    
    // Load leaderboard
    loadLeaderboard();
}

// Game loop
function gameLoop(timestamp) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game state
    if (gameState === 'playing') {
        update();
    }

    // Render game
    render();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    frameCount++;

    // Update bird
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    // Check if bird hit the ground
    if (bird.y + bird.height >= canvas.height - GROUND_HEIGHT) {
        bird.y = canvas.height - GROUND_HEIGHT - bird.height;
        gameOver();
    }

    // Check if bird hit the ceiling
    if (bird.y <= 0) {
        bird.y = 0;
        bird.velocity = 0;
    }

    // Spawn new pipes
    pipeSpawnTimer += 16; // Approximate milliseconds per frame at 60fps
    if (pipeSpawnTimer >= PIPE_SPAWN_INTERVAL) {
        spawnPipe();
        pipeSpawnTimer = 0;
    }

    // Update pipes
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED;

        // Check if pipe is off screen
        if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            i--;
            continue;
        }

        // Check for collision with bird
        if (checkCollision(bird, pipe)) {
            gameOver();
            break;
        }

        // Check if bird passed the pipe
        if (!pipe.passed && bird.x > pipe.x + PIPE_WIDTH) {
            pipe.passed = true;
            score++;
        }
    }
    
// Update projectiles
for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i];
    projectile.x += projectile.speed;
    
    // Check if projectile is off screen
    if (projectile.x > canvas.width) {
        projectiles.splice(i, 1);
        i--;
        continue;
    }
    
    // Check for collision with pipes
    let hitPipe = false;
    for (let j = 0; j < pipes.length; j++) {
        const pipe = pipes[j];
        
        // Check if projectile is within pipe's x-range
        if (projectile.x + projectile.width > pipe.x && 
            projectile.x < pipe.x + PIPE_WIDTH) {
            
            // Check if projectile hit the top pipe
            if (projectile.y < pipe.topHeight) {
                // Create explosion at the point of impact
                createExplosion(projectile.x, pipe.topHeight);
                
                // Mark the top pipe as destroyed but keep its position for score tracking
                pipe.topDestroyed = true;
                
                // Remove the projectile
                projectiles.splice(i, 1);
                i--;
                
                hitPipe = true;
                break;
            }
            // Check if projectile hit the bottom pipe
            else if (projectile.y + projectile.height > pipe.topHeight + PIPE_GAP) {
                // Create explosion at the point of impact
                createExplosion(projectile.x, pipe.topHeight + PIPE_GAP);
                
                // Mark the bottom pipe as destroyed but keep its position for score tracking
                pipe.bottomDestroyed = true;
                
                // Remove the projectile
                projectiles.splice(i, 1);
                i--;
                
                hitPipe = true;
                break;
            }
        }
    }
    
    if (hitPipe) continue;
}

// Update explosions
for (let i = 0; i < explosions.length; i++) {
    const explosion = explosions[i];
    
    if (explosion.growing) {
        explosion.radius += 2;
        if (explosion.radius >= explosion.maxRadius) {
            explosion.growing = false;
        }
    } else {
        explosion.alpha -= 0.05;
        if (explosion.alpha <= 0) {
            explosions.splice(i, 1);
            i--;
        }
    }
}
}

// Render game
function render() {
    // Draw background (sky)
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pipes
    ctx.fillStyle = '#2ecc71';
    for (const pipe of pipes) {
        // Draw top pipe if not destroyed
        if (!pipe.topDestroyed) {
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        }
        
        // Draw bottom pipe if not destroyed
        if (!pipe.bottomDestroyed) {
            ctx.fillRect(
                pipe.x,
                pipe.topHeight + PIPE_GAP,
                PIPE_WIDTH,
                canvas.height - (pipe.topHeight + PIPE_GAP)
            );
        }
    }

    // Draw ground
    ctx.fillStyle = '#deb887';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Draw grass
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 20);

    // Draw explosions
    for (const explosion of explosions) {
        ctx.beginPath();
        ctx.globalAlpha = explosion.alpha;
        ctx.fillStyle = '#e74c3c';
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Draw projectiles
    ctx.fillStyle = '#e74c3c';
    for (const projectile of projectiles) {
        ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
        
        // Draw projectile trail
        ctx.globalAlpha = 0.5;
        ctx.fillRect(projectile.x - 10, projectile.y, 10, projectile.height);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(projectile.x - 20, projectile.y, 10, projectile.height);
        ctx.globalAlpha = 1;
    }

    // Draw bird
    if (bird.alive) {
        // Bird body
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bird.x + 10, bird.y - 7, 7, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bird.x + 12, bird.y - 7, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(bird.x + 18, bird.y);
        ctx.lineTo(bird.x + 32, bird.y);
        ctx.lineTo(bird.x + 18, bird.y + 8);
        ctx.closePath();
        ctx.fill();
        
        // Draw shooting flash
        const currentTime = Date.now();
        if (currentTime - shootFlashTime < 200) { // Flash lasts for 200ms
            ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(bird.x + bird.width / 2 + 15, bird.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw score
    if (gameState === 'playing' || gameState === 'gameOver') {
        ctx.fillStyle = 'white';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, 60);
    }
    
    // Draw shoot cooldown bar
    if (gameState === 'playing') {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastShootTime;
        const cooldownProgress = Math.min(elapsedTime / SHOOT_COOLDOWN, 1);
        
        // Bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(20, 20, 100, 15);
        
        // Bar fill
        ctx.fillStyle = cooldownProgress >= 1 ? '#e74c3c' : '#f39c12';
        ctx.fillRect(20, 20, 100 * cooldownProgress, 15);
        
        // Bar border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 100, 15);
        
        // Bar label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SHOOT', 20, 50);
        
        // Show "READY" text when cooldown is complete
        if (cooldownProgress >= 1) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('READY', 70, 33);
        }
    }
}

// Spawn a new pipe
function spawnPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        passed: false,
        topDestroyed: false,
        bottomDestroyed: false
    });
}

// Check collision between bird and pipe
function checkCollision(bird, pipe) {
    // Check if bird is within pipe's x-range
    if (bird.x + bird.width / 2 > pipe.x && bird.x - bird.width / 2 < pipe.x + PIPE_WIDTH) {
        // Check if bird is within top pipe's y-range and top pipe is not destroyed
        if (!pipe.topDestroyed && bird.y - bird.height / 2 < pipe.topHeight) {
            return true;
        }
        
        // Check if bird is within bottom pipe's y-range and bottom pipe is not destroyed
        if (!pipe.bottomDestroyed && bird.y + bird.height / 2 > pipe.topHeight + PIPE_GAP) {
            return true;
        }
    }
    return false;
}

// Make the bird flap
function flap() {
    if (gameState === 'playing') {
        bird.velocity = FLAP_STRENGTH;
    }
}

// Start the game
function startGame() {
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    init();
}

// Display leaderboard
function displayLeaderboard() {
    // Get or create leaderboard container
    let leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer) {
        leaderboardContainer = document.createElement('div');
        leaderboardContainer.id = 'leaderboard-container';
        gameOverScreen.appendChild(leaderboardContainer);
    }
    
    // Clear previous leaderboard
    leaderboardContainer.innerHTML = '<h3>Top Scores</h3>';
    
    // Create leaderboard list
    const leaderboardList = document.createElement('ol');
    leaderboardList.className = 'leaderboard-list';
    
    // Add scores to the list
    leaderboard.forEach(score => {
        const listItem = document.createElement('li');
        listItem.textContent = score;
        
        // Highlight current score
        if (score === window.currentScore) {
            listItem.className = 'current-score';
        }
        
        leaderboardList.appendChild(listItem);
    });
    
    // Add the list to the container
    leaderboardContainer.appendChild(leaderboardList);
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    bird.alive = false;
    
    // Save current score for highlighting in the leaderboard
    window.currentScore = score;
    
    // Update score display
    finalScoreElement.textContent = score;
    
    // Add score to leaderboard
    addScoreToLeaderboard(score);
    
    // Display leaderboard
    displayLeaderboard();
    
    // Show game over screen
    gameOverScreen.classList.remove('hidden');
}

// Create an explosion effect
function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 30,
        alpha: 1,
        growing: true
    });
}

// Make the bird shoot
function shoot() {
    if (gameState !== 'playing' || !bird.alive) return;
    
    const currentTime = Date.now();
    if (currentTime - lastShootTime < SHOOT_COOLDOWN) return;
    
    lastShootTime = currentTime;
    shootFlashTime = currentTime;
    
    // Create a new projectile
    projectiles.push({
        x: bird.x + bird.width / 2 + 10,
        y: bird.y,
        width: 15,
        height: 8,
        speed: 10
    });
}

// Event listeners
document.addEventListener('click', function() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        flap();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'playing') {
            flap();
        }
    } else if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        if (gameState === 'playing') {
            shoot();
        }
    }
});

restartButton.addEventListener('click', function() {
    startGame();
});

// Initialize and start the game loop
init();
requestAnimationFrame(gameLoop);
