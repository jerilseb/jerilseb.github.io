// Game variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const shootButton = document.getElementById('shoot-button');

// Original canvas dimensions (for scaling)
const ORIGINAL_WIDTH = 480;
const ORIGINAL_HEIGHT = 640;
let scaleRatio = 1; // Will be calculated based on screen size

// Game settings
let GRAVITY = 0.5;
let FLAP_STRENGTH = -10;
let PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500; // milliseconds
let PIPE_WIDTH = 70;
let PIPE_GAP = 180;
let GROUND_HEIGHT = 100;
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
let isMobile = false;

// Check if device is mobile
function checkMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 800 && window.innerHeight <= 900);
}

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

// Calculate scale ratio based on screen size
function calculateScaleRatio() {
    // Get the container dimensions
    const gameContainer = document.querySelector('.game-container');
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // Calculate scale ratio
    const widthRatio = containerWidth / ORIGINAL_WIDTH;
    const heightRatio = containerHeight / ORIGINAL_HEIGHT;
    
    // Use the smaller ratio to ensure the canvas fits within the container
    return Math.min(widthRatio, heightRatio);
}

// Resize canvas and adjust game parameters
function resizeCanvas() {
    isMobile = checkMobile();
    
    // Calculate new scale ratio
    scaleRatio = calculateScaleRatio();
    
    // Set canvas dimensions
    canvas.width = ORIGINAL_WIDTH;
    canvas.height = ORIGINAL_HEIGHT;
    
    // Scale game parameters based on screen size
    GRAVITY = 0.5 * scaleRatio;
    FLAP_STRENGTH = -10 * scaleRatio;
    PIPE_SPEED = 3 * scaleRatio;
    PIPE_WIDTH = 70 * scaleRatio;
    PIPE_GAP = isMobile ? 200 * scaleRatio : 180 * scaleRatio; // Slightly easier on mobile
    GROUND_HEIGHT = 100 * scaleRatio;
    
    // Update bird position and size if game is in progress
    if (bird.x) {
        bird.width = 40 * scaleRatio;
        bird.height = 32 * scaleRatio;
    }
}

// Initialize the game
function init() {
    // Resize canvas and adjust game parameters
    resizeCanvas();
    
    // Initialize bird
    bird = {
        x: canvas.width / 3,
        y: canvas.height / 2,
        width: 40 * scaleRatio,
        height: 32 * scaleRatio,
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
    
    // Show/hide shoot button based on game state
    if (gameState === 'playing') {
        shootButton.style.display = 'flex';
    } else {
        shootButton.style.display = 'none';
    }
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
            explosion.radius += 2 * scaleRatio;
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
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 20 * scaleRatio);

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
        ctx.fillRect(projectile.x - 10 * scaleRatio, projectile.y, 10 * scaleRatio, projectile.height);
        ctx.globalAlpha = 0.3;
        ctx.fillRect(projectile.x - 20 * scaleRatio, projectile.y, 10 * scaleRatio, projectile.height);
        ctx.globalAlpha = 1;
    }

    // Draw bird
    if (bird.alive) {
        const birdRadius = bird.width / 2;
        
        // Bird body
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, birdRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bird.x + 10 * scaleRatio, bird.y - 7 * scaleRatio, 7 * scaleRatio, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bird.x + 12 * scaleRatio, bird.y - 7 * scaleRatio, 3 * scaleRatio, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(bird.x + 18 * scaleRatio, bird.y);
        ctx.lineTo(bird.x + 32 * scaleRatio, bird.y);
        ctx.lineTo(bird.x + 18 * scaleRatio, bird.y + 8 * scaleRatio);
        ctx.closePath();
        ctx.fill();
        
        // Draw shooting flash
        const currentTime = Date.now();
        if (currentTime - shootFlashTime < 200) { // Flash lasts for 200ms
            ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(bird.x + birdRadius + 15 * scaleRatio, bird.y, 15 * scaleRatio, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw score
    if (gameState === 'playing' || gameState === 'gameOver') {
        ctx.fillStyle = 'white';
        ctx.font = `${32 * scaleRatio}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, 60 * scaleRatio);
    }
    
    // Draw shoot cooldown bar
    if (gameState === 'playing') {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastShootTime;
        const cooldownProgress = Math.min(elapsedTime / SHOOT_COOLDOWN, 1);
        
        const barWidth = 100 * scaleRatio;
        const barHeight = 15 * scaleRatio;
        const barX = 20 * scaleRatio;
        const barY = 20 * scaleRatio;
        
        // Bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Bar fill
        ctx.fillStyle = cooldownProgress >= 1 ? '#e74c3c' : '#f39c12';
        ctx.fillRect(barX, barY, barWidth * cooldownProgress, barHeight);
        
        // Bar border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * scaleRatio;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Bar label
        ctx.fillStyle = 'white';
        ctx.font = `${12 * scaleRatio}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('SHOOT', barX, barY + 30 * scaleRatio);
        
        // Show "READY" text when cooldown is complete
        if (cooldownProgress >= 1) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = `${14 * scaleRatio}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('READY', barX + barWidth / 2, barY + barHeight / 2 + 5 * scaleRatio);
        }
        
        // Update shoot button visibility based on cooldown
        if (cooldownProgress >= 1) {
            shootButton.style.opacity = '1';
        } else {
            shootButton.style.opacity = '0.5';
        }
    }
}

// Spawn a new pipe
function spawnPipe() {
    const minHeight = 50 * scaleRatio;
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
    shootButton.style.display = 'flex';
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
    
    // Hide shoot button
    shootButton.style.display = 'none';
    
    // Add vibration feedback on mobile devices
    if (isMobile && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Create an explosion effect
function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 5 * scaleRatio,
        maxRadius: 30 * scaleRatio,
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
        x: bird.x + bird.width / 2 + 10 * scaleRatio,
        y: bird.y,
        width: 15 * scaleRatio,
        height: 8 * scaleRatio,
        speed: 10 * scaleRatio
    });
    
    // Add vibration feedback on mobile devices
    if (isMobile && navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// Event listeners
canvas.addEventListener('click', function(event) {
    // Prevent default behavior
    event.preventDefault();
    
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        flap();
    }
});

// Touch events for mobile
canvas.addEventListener('touchstart', function(event) {
    // Prevent default behavior (scrolling, zooming)
    event.preventDefault();
    
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        flap();
    }
}, { passive: false });

// Shoot button event listeners
shootButton.addEventListener('click', function(event) {
    event.preventDefault();
    shoot();
});

shootButton.addEventListener('touchstart', function(event) {
    event.preventDefault();
    shoot();
}, { passive: false });

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        // Prevent default spacebar behavior (scrolling)
        event.preventDefault();
        
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

// Handle window resize
window.addEventListener('resize', function() {
    resizeCanvas();
});

// Handle device orientation change
window.addEventListener('orientationchange', function() {
    setTimeout(resizeCanvas, 100); // Small delay to ensure new dimensions are available
});

// Initialize and start the game loop
init();
requestAnimationFrame(gameLoop);
