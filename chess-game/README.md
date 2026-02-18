# Chess Game

A chess web game developed with HTML5, CSS3, and JavaScript, supporting player vs AI battles with AI self-learning capabilities.

## Features

- **Complete chess rules implementation**: Including all piece movements, capturing rules, castling, en passant, pawn promotion, etc.
- **AI battle system**: Supports three difficulty levels (easy, medium, hard) and integrates Stockfish AI engine
- **AI self-learning**: AI can record battle data, learn and optimize strategies, and improve future game performance
- **Game controls**: Supports new game, undo, restart, save game, etc.
- **Data recording**: Saves historical battle records, displays AI learning progress and statistical data
- **Game analysis**: Provides chess game analysis features to help players improve their skills
- **User system**: Supports user registration and login, saves personal game data
- **Responsive design**: Adapts to different device sizes, providing a good user experience
- **Audio support**: Provides background music during gameplay

## Technical Implementation

- **Frontend interface**: HTML5 + CSS3 + Tailwind CSS + Font Awesome
- **Game logic**: Vanilla JavaScript
- **AI algorithms**:
  - Stockfish AI engine (WebAssembly version)
- **Data storage**:
  - Uses localStorage for local data storage
  - User system data management
- **Modular design**: Splits functions into multiple modules for easy maintenance and expansion

## Project Structure

```
chess-game/
├── index.html                # Main page
├── game.html                 # Game page
├── rules.html                # Rules page
├── records.html              # Game records page
├── analysis.html             # Game analysis page
├── auth.html                 # User authentication page
├── profile.html              # User profile page
├── download.html             # Download page
├── support.html              # Support page
├── README.md                 # Project documentation
├── chess.mp3                 # Background music
├── icon.jpg                  # Website icon
├── default.png               # Default image
├── game.png                  # Game screenshot
├── records.png               # Records page screenshot
├── stockfish.js              # Stockfish AI engine
├── stockfish-17.1-lite-single-03e3232.js  # Stockfish AI script
├── stockfish-17.1-lite-single-03e3232.wasm # Stockfish AI WebAssembly
├── stockfish-part-0.wasm     # Stockfish AI WebAssembly chunk
├── stockfish-part-1.wasm     # Stockfish AI WebAssembly chunk
├── stockfish-part-2.wasm     # Stockfish AI WebAssembly chunk
├── stockfish-part-3.wasm     # Stockfish AI WebAssembly chunk
├── stockfish-part-4.wasm     # Stockfish AI WebAssembly chunk
├── stockfish-part-5.wasm     # Stockfish AI WebAssembly chunk
└── js/
    ├── script.js             # Main game logic module
    ├── chessRules.js         # Chess rules validation module
    ├── aiLogic.js            # AI logic and learning mechanism module
    ├── stockfishAI.js        # Stockfish AI integration module
    ├── analysis.js           # Game analysis module
    ├── storage.js            # Data storage module
    └── userSystem.js         # User system module
```

## How to Use

1. Directly open the `index.html` file to enter the main page
2. Click the "Start Game" button to enter the game interface
3. By default, the player plays as white, and the AI plays as black
4. Click a piece to select it, then click the target position to move the piece
5. You can adjust the AI difficulty and AI type (custom AI or Stockfish AI) through the right control panel
6. You can access various function pages through the top navigation bar

## AI Features

### Custom AI
- Based on Minimax algorithm with Alpha-Beta pruning optimization
- Supports three difficulty levels: easy, medium, hard
- Has self-learning capabilities, records battle data to optimize strategies

### Stockfish AI
- Integrates Stockfish 17.1 chess engine
- Provides more powerful AI battle capabilities
- Supports different search depth settings

## User System

- Supports user registration and login
- Saves personal game records and preference settings
- Views personal game statistical data

## Browser Compatibility

Supports all modern browsers, including Chrome, Firefox, Safari, Edge, etc., requires WebAssembly support.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Future Plans

- Add player vs player battle mode
- Implement online battle functionality
- Add more AI algorithm options
- Optimize UI/UX, provide more customization options
- Add more game analysis tools
- Support game sharing functionality