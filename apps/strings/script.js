// Canvas setup
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');
const stringCountSlider = document.getElementById('stringCount');
const stringCountValue = document.getElementById('stringCountValue');

// Set canvas to full window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initialize canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse tracking
const mouse = {
    x: undefined,
    y: undefined,
    radius: 100, // Interaction radius
    isMoving: false,
    lastX: undefined,
    lastY: undefined,
    velocityX: 0,
    velocityY: 0
};

// Track mouse movement
window.addEventListener('mousemove', (event) => {
    // Calculate mouse velocity
    if (mouse.lastX !== undefined) {
        mouse.velocityX = event.clientX - mouse.lastX;
        mouse.velocityY = event.clientY - mouse.lastY;
    }
    
    mouse.lastX = event.clientX;
    mouse.lastY = event.clientY;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.isMoving = true;
    
    // Reset isMoving after a short delay
    clearTimeout(mouse.timeout);
    mouse.timeout = setTimeout(() => {
        mouse.isMoving = false;
        mouse.velocityX = 0;
        mouse.velocityY = 0;
    }, 100);
});

// Spatial grid for efficient collision detection
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows).fill().map(() => []);
    }
    
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }
    
    getCell(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
        return row * this.cols + col;
    }
    
    insert(point) {
        const cell = this.getCell(point.x, point.y);
        if (cell !== -1) {
            this.grid[cell].push(point);
        }
    }
    
    queryRadius(x, y, radius) {
        const results = [];
        const startCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const startRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const cell = row * this.cols + col;
                results.push(...this.grid[cell]);
            }
        }
        
        return results;
    }
}

// Optimized String point class
class Point {
    constructor(x, y, fixed = false) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.vx = 0;
        this.vy = 0;
        this.fixed = fixed;
        this.forceX = 0; // Accumulated forces
        this.forceY = 0;
    }

    update(gravity, friction) {
        if (this.fixed) return;
        
        // Apply accumulated forces
        this.vx += this.forceX;
        this.vy += this.forceY;
        this.forceX = 0;
        this.forceY = 0;
        
        // Apply gravity and friction
        this.vx *= friction;
        this.vy *= friction;
        this.vy += gravity;
        
        // Update position
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += this.vx;
        this.y += this.vy;
        
        // Simple boundary constraints
        if (this.x < 0) {
            this.x = 0;
            this.vx *= -0.3;
        } else if (this.x > canvas.width) {
            this.x = canvas.width;
            this.vx *= -0.3;
        }
        
        if (this.y < 0) {
            this.y = 0;
            this.vy *= -0.3;
        } else if (this.y > canvas.height) {
            this.y = canvas.height;
            this.vy *= -0.3;
        }
    }

    applyMouseForce(mouse, forceMultiplier = 1) {
        if (this.fixed) return;
        
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = mouse.radius * mouse.radius;
        
        // Fast distance check using squared values (avoid sqrt)
        if (distSq < radiusSq) {
            const distance = Math.sqrt(distSq); // Only calculate sqrt when needed
            const force = (mouse.radius - distance) / mouse.radius * forceMultiplier;
            
            // Normalize direction vector without using trig functions
            const invDist = 1 / distance;
            const nx = dx * invDist;
            const ny = dy * invDist;
            
            // Apply force based on mouse movement
            if (mouse.isMoving) {
                this.forceX += nx * force * 2 + (mouse.velocityX * 0.2);
                this.forceY += ny * force * 2 + (mouse.velocityY * 0.2);
            } else {
                // Just push away when mouse is stationary
                this.forceX += nx * force * 0.5;
                this.forceY += ny * force * 0.5;
            }
        }
    }
}

// Animation constants
const GRAVITY = 0.5;
const FRICTION = 0.98;
const COLORS = [
    { top: '#64B5F6', middle: '#E1F5FE', bottom: '#1976D2', glow: '#64B5F6' }, // Blue
    { top: '#81C784', middle: '#E8F5E9', bottom: '#388E3C', glow: '#81C784' }, // Green
    { top: '#E57373', middle: '#FFEBEE', bottom: '#D32F2F', glow: '#E57373' }, // Red
    { top: '#BA68C8', middle: '#F3E5F5', bottom: '#7B1FA2', glow: '#BA68C8' }, // Purple
    { top: '#FFD54F', middle: '#FFFDE7', bottom: '#FFA000', glow: '#FFD54F' }  // Yellow
];

// Performance monitoring and adaptive quality
const performance = {
    lastTime: 0,
    frameTime: 0,
    frames: 0,
    fps: 60,
    fpsAlpha: 0.1, // For smoothing
    isLowPerformance: false,
    qualityLevel: 2, // 0=low, 1=medium, 2=high
    fpsThresholds: [30, 45, 60],
    fpsHistory: [],
    historySize: 10,
    lastQualityAdjustTime: 0,
    
    updateFPS(timestamp) {
        this.frameTime = timestamp - this.lastTime || 0;
        this.lastTime = timestamp;
        
        if (this.frameTime === 0) return;
        
        // Calculate current FPS
        const currentFps = 1000 / this.frameTime;
        
        // Update FPS with smoothing
        this.fps = this.fps * (1 - this.fpsAlpha) + currentFps * this.fpsAlpha;
        
        // Add to history
        this.fpsHistory.push(this.fps);
        if (this.fpsHistory.length > this.historySize) {
            this.fpsHistory.shift();
        }
        
        // Check if performance is low
        this.isLowPerformance = this.fps < 40;
        
        // Adjust quality every 2 seconds if needed
        if (timestamp - this.lastQualityAdjustTime > 2000 && this.fpsHistory.length >= this.historySize) {
            this.adjustQuality();
            this.lastQualityAdjustTime = timestamp;
        }
        
        // Reset frames counter every second
        this.frames++;
        if (timestamp % 1000 < this.frameTime) {
            this.frames = 0;
        }
    },
    
    adjustQuality() {
        // Calculate average FPS from history
        const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        
        // Adjust quality based on FPS
        if (avgFps < this.fpsThresholds[0] && this.qualityLevel > 0) {
            this.qualityLevel--;
            console.log('Reducing quality to level', this.qualityLevel);
        } else if (avgFps > this.fpsThresholds[2] && this.qualityLevel < 2) {
            this.qualityLevel++;
            console.log('Increasing quality to level', this.qualityLevel);
        }
    },
    
    getQualitySettings() {
        // Return different settings based on quality level
        switch(this.qualityLevel) {
            case 0: // Low quality
                return {
                    useGlow: false,
                    useEndGlow: false,
                    constraintIterations: 1,
                    mouseInteractionSkip: 3,
                    segmentReduction: 0.5 // Reduce segments by 50%
                };
            case 1: // Medium quality
                return {
                    useGlow: stringCount <= 60,
                    useEndGlow: stringCount <= 80,
                    constraintIterations: 2,
                    mouseInteractionSkip: 2,
                    segmentReduction: 0.75 // Reduce segments by 25%
                };
            case 2: // High quality
            default:
                return {
                    useGlow: stringCount <= 80,
                    useEndGlow: stringCount <= 100,
                    constraintIterations: 3,
                    mouseInteractionSkip: 1,
                    segmentReduction: 1 // No reduction
                };
        }
    }
};

// Create spatial grid for efficient collision detection
let spatialGrid;

// String class with advanced optimizations
class String {
    constructor(x, segments = 15, length = 300, colors = COLORS[0]) {
        this.points = [];
        this.x = x;
        this.colors = colors;
        
        // Get quality settings
        const quality = performance.getQualitySettings();
        
        // Adjust segments based on string count and quality
        const baseSegments = stringCount > 80 ? 8 : (stringCount > 40 ? 12 : segments);
        this.segments = Math.max(5, Math.floor(baseSegments * quality.segmentReduction));
        this.segmentLength = length / this.segments;
        
        // Create points
        for (let i = 0; i <= this.segments; i++) {
            const y = (i / this.segments) * length;
            this.points.push(new Point(x, y, i === 0)); // First point is fixed
        }
        
        // For mouse interaction optimization
        this.updateCounter = 0;
    }

    update(gravity, friction, mouseInteractionSkip) {
        // Update all points
        const len = this.points.length;
        
        // Add points to spatial grid for collision detection
        for (let i = 0; i < len; i++) {
            const point = this.points[i];
            point.update(gravity, friction);
            
            // Add to spatial grid for efficient collision detection
            if (!point.fixed) {
                spatialGrid.insert(point);
            }
        }
        
        // Apply mouse force only on certain frames to improve performance
        this.updateCounter = (this.updateCounter + 1) % mouseInteractionSkip;
        
        // Apply constraints with adaptive iterations
        const quality = performance.getQualitySettings();
        for (let j = 0; j < quality.constraintIterations; j++) {
            this.applyConstraints();
        }
    }

    applyConstraints() {
        // Keep points at consistent distances
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const difference = this.segmentLength - distance;
            const percent = difference / distance / 2;
            const offsetX = dx * percent;
            const offsetY = dy * percent;
            
            // If p1 is fixed, only move p2
            if (p1.fixed) {
                p2.x += offsetX * 2;
                p2.y += offsetY * 2;
            } 
            // If p2 is fixed, only move p1
            else if (p2.fixed) {
                p1.x -= offsetX * 2;
                p1.y -= offsetY * 2;
            } 
            // Otherwise, move both
            else {
                p1.x -= offsetX;
                p1.y -= offsetY;
                p2.x += offsetX;
                p2.y += offsetY;
            }
        }
    }

    draw(ctx) {
        // Skip drawing if off-screen (simple culling)
        const lastPoint = this.points[this.points.length - 1];
        const firstPoint = this.points[0];
        if (lastPoint.x < -50 || lastPoint.x > canvas.width + 50) return;
        
        // Create gradient for the string (reuse for all segments)
        const gradient = ctx.createLinearGradient(
            firstPoint.x, firstPoint.y, 
            lastPoint.x, lastPoint.y
        );
        gradient.addColorStop(0, this.colors.top);
        gradient.addColorStop(0.5, this.colors.middle);
        gradient.addColorStop(1, this.colors.bottom);
        
        // Reduce shadow blur operations when many strings or low performance
        const useGlow = !performance.isLowPerformance && stringCount <= 80;
        const useEndGlow = !performance.isLowPerformance && stringCount <= 100;
        
        // Draw all segments at once for better performance
        ctx.beginPath();
        
        // Draw segments with varying thickness based on tension
        const len = this.points.length - 1;
        for (let i = 0; i < len; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            
            // Calculate tension (distance between points compared to rest length)
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const tension = Math.abs(distance - this.segmentLength) / this.segmentLength;
            
            // Thickness varies based on tension and position
            // Reduce thickness when many strings
            const baseThickness = stringCount > 80 ? 1.5 : 2;
            const thickness = baseThickness + (tension * 2) + (1 - i / this.segments) * 1;
            
            // Draw segment
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Set line width for this segment
            ctx.lineWidth = thickness;
        }
        
        // Draw outer glow if performance allows
        if (useGlow) {
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 3;
            ctx.strokeStyle = `rgba(${hexToRgb(this.colors.glow)}, 0.2)`;
            ctx.stroke();
        }
        
        // Main string (no shadow for better performance)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = gradient;
        ctx.stroke();
        
        // Draw a small circle at the end of the string
        // Only if not in low performance mode
        if (useEndGlow) {
            ctx.beginPath();
            const endPoint = this.points[this.points.length - 1];
            ctx.arc(endPoint.x, endPoint.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.bottom;
            ctx.shadowColor = this.colors.glow;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

// Create strings with optimized allocation
let strings = [];
let stringCount = parseInt(stringCountSlider.value);

function createStrings() {
    strings = [];
    const spacing = canvas.width / (stringCount + 1);
    
    // Determine segment count based on string count for better performance
    const segments = stringCount > 80 ? 8 : (stringCount > 40 ? 12 : 15);
    
    for (let i = 1; i <= stringCount; i++) {
        // Assign colors in a repeating pattern
        const colorIndex = (i - 1) % COLORS.length;
        strings.push(new String(i * spacing, segments, canvas.height * 0.7, COLORS[colorIndex]));
    }
}

// Handle slider changes
stringCountSlider.addEventListener('input', () => {
    stringCount = parseInt(stringCountSlider.value);
    stringCountValue.textContent = stringCount;
    createStrings();
});

// Highly optimized animation loop
function animate(timestamp) {
    // Update performance metrics
    performance.updateFPS(timestamp);
    
    // Get quality settings based on current performance
    const quality = performance.getQualitySettings();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Initialize or resize spatial grid if needed
    if (!spatialGrid || canvas.width !== spatialGrid.width || canvas.height !== spatialGrid.height) {
        const cellSize = mouse.radius;
        spatialGrid = new SpatialGrid(canvas.width, canvas.height, cellSize);
    } else {
        spatialGrid.clear();
    }
    
    // Process mouse interaction with points using spatial grid
    if (mouse.x !== undefined && mouse.y !== undefined) {
        // Draw mouse pointer (only when not in low performance mode)
        if (!performance.isLowPerformance) {
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
            
            // Draw interaction radius when mouse is moving
            if (mouse.isMoving) {
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.stroke();
            }
        }
    }
    
    // Update all strings
    const len = strings.length;
    for (let i = 0; i < len; i++) {
        const string = strings[i];
        string.update(GRAVITY, FRICTION, quality.mouseInteractionSkip);
    }
    
    // Apply mouse forces using spatial grid for efficiency
    if (mouse.x !== undefined && mouse.y !== undefined) {
        const nearbyPoints = spatialGrid.queryRadius(mouse.x, mouse.y, mouse.radius);
        const forceMultiplier = 1 / Math.max(1, nearbyPoints.length / 20); // Reduce force when many points
        
        for (let i = 0; i < nearbyPoints.length; i++) {
            nearbyPoints[i].applyMouseForce(mouse, forceMultiplier);
        }
    }
    
    // Draw all strings
    for (let i = 0; i < len; i++) {
        strings[i].draw(ctx);
    }
    
    requestAnimationFrame(animate);
}

// Initialize
createStrings();
animate();
