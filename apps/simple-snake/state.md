# Snake Game - Current State

## Project Overview
This is a JavaScript-based Snake game rendered on an HTML Canvas. The game includes player name input (stored in local storage), a global leaderboard system using Supabase, and modern UI styling.

## Project Structure
```
snake-game/
├── index.html        // HTML skeleton with canvas, input form, leaderboard section, and Supabase setup instructions
├── style.css         // Styling for the game canvas, input form, and leaderboard
└── src/
    ├── main.js       // Game logic, event listeners, local storage for player name, and game mechanics
    └── supabase.js   // Supabase client initialization and leaderboard operations
```

## Features

### Core Game Mechanics
- **Snake Movement**: Controlled using W, A, S, D keys
- **Food Generation**: Random placement of food items on the canvas
- **Collision Detection**: Detects collisions with walls and the snake's own body
- **Scoring System**: Score increases by 10 points when food is eaten
- **Game Loop**: Implemented using setInterval for continuous updates

### User Interface
- **Pre-game Player Name Input**: Allows players to enter their name before starting
- **Game Canvas**: 400x400 pixel canvas with a 20x20 grid (each cell is 20x20 pixels)
- **Score Display**: Shows current score during gameplay
- **Game Controls**: Instructions displayed for player reference
- **Restart Button**: Allows players to restart the game after game over

### Data Persistence
- **Player Name Storage**: Stores player name in local storage
- **Global Leaderboard System**: Maintains a list of top 10 scores with player names in Supabase database
- **Score Filtering**: Scores of 0 are not saved to the leaderboard
- **Error Handling**: Displays appropriate error messages if Supabase operations fail

### UI Flow
1. **Initial State**: Shows player name input form and leaderboard
2. **During Gameplay**: Hides leaderboard, shows only game canvas and score
3. **Game Over**: Shows leaderboard again with updated scores

## Code Implementation Details

### HTML (index.html)
The HTML structure consists of three main sections:
1. **Player Form**: Input field for player name and start button
2. **Game Container**: Canvas element, player info, score display, and controls
3. **Leaderboard**: Table displaying player rankings, names, and scores

Additionally, it includes:
- Supabase CDN for the Supabase JavaScript client
- Setup instructions for configuring Supabase

These sections are shown/hidden at different stages of the game using CSS classes.

### CSS (style.css)
The styling follows a clean, modern design with:
- Consistent color scheme (blues for UI elements, red for food)
- Responsive layout with proper spacing
- Card-like sections with shadows and rounded corners
- Clear typography and button styling
- Table styling for the leaderboard

### JavaScript (src/main.js)

#### Constants and Variables
- Grid size and dimensions (20x20 cells, each 20px)
- Game speed (150ms between updates)
- Game state variables (snake array, food position, direction, score)

#### Core Functions
1. **initializeGame()**: Sets up initial game state (snake position, direction, score)
2. **gameLoop()**: Main game loop that calls update() and draw()
3. **update()**: Updates game state (snake movement, collision detection, food consumption)
4. **draw()**: Renders the game state to the canvas
5. **generateFood()**: Creates food at random positions (avoiding snake)
6. **checkCollision()**: Detects collisions with walls or snake body

#### Event Handling
- **handleKeyPress()**: Captures W, A, S, D key presses for snake movement
- Button click handlers for starting and restarting the game

#### Data Management
- **saveScore()**: Saves player scores to Supabase (ignores scores of 0)
- **updateLeaderboard()**: Updates the leaderboard display from Supabase data
- **checkStoredPlayerName()**: Retrieves player name from local storage if available

### JavaScript (src/supabase.js)

#### Supabase Integration
- **initSupabase()**: Initializes the Supabase client with URL and anon key
- **saveScoreToSupabase()**: Saves a player's score to the Supabase leaderboard table
- **getLeaderboardFromSupabase()**: Retrieves the top 10 scores from Supabase

## Supabase Integration

### Database Structure
- **Table**: snake_leaderboard
- **Fields**:
  - id (UUID, primary key)
  - player_name (TEXT)
  - score (INTEGER)
  - created_at (TIMESTAMP)

### Security
- Row Level Security (RLS) policies to allow anonymous inserts and reads
- No authentication required for basic functionality

### Error Handling
- Proper error handling for failed Supabase operations
- User-friendly error messages displayed in the UI

## Known Behaviors
- The snake moves at a constant speed regardless of score
- The game ends immediately upon collision with walls or self
- The leaderboard is hidden during gameplay and shown after game over
- Scores of 0 are not recorded in the leaderboard
- The snake cannot reverse direction (e.g., cannot go right when moving left)
- If Supabase operations fail, appropriate error messages are displayed

## Potential Future Enhancements
- Difficulty levels with different speeds
- Mobile touch controls
- Visual effects for food consumption or game over
- Sound effects
- Different types of food with special effects
- Obstacles or maze elements
- Multiplayer functionality
- Real-time leaderboard updates using Supabase's real-time subscriptions
- User authentication for secure player identification

## Technical Implementation Notes
- The game uses a grid-based system where each cell is 20x20 pixels
- The snake is represented as an array of objects with x,y coordinates
- The game loop runs at a fixed interval of 150ms
- Local storage is used for player name persistence
- Supabase is used exclusively for the global leaderboard system
- CSS classes control the visibility of different UI sections
- ES modules are used for code organization (import/export)