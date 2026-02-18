/**
 * 数据存储模块
 * 负责管理游戏记录和AI学习数据的本地存储
 */

class ChessStorage {
  constructor() {
    this.gameHistoryKey = 'chessGameHistory';
    this.aiLearningKey = 'chessAILearning';
    this.settingsKey = 'chessSettings';
  }
  
  /**
   * 保存游戏记录
   * @param {Object} gameData 游戏数据
   */
  saveGameRecord(gameData) {
    const history = this.getGameHistory();
    
    // 添加新的游戏记录
    history.push({
      date: new Date().toISOString(),
      duration: gameData.duration,
      moves: gameData.moves,
      result: gameData.result,
      difficulty: gameData.difficulty,
      aiLearning: gameData.aiLearning,
      movesList: gameData.movesList,
      firstMove: gameData.firstMove
    });
    
    // 保存更新后的历史记录
    localStorage.setItem(this.gameHistoryKey, JSON.stringify(history));
    
    return history.length - 1; // 返回新记录的索引
  }
  
  /**
   * 获取游戏历史记录
   * @return {Array} 游戏历史记录数组
   */
  getGameHistory() {
    const history = localStorage.getItem(this.gameHistoryKey);
    return history ? JSON.parse(history) : [];
  }
  
  /**
   * 清空游戏历史记录
   */
  clearGameHistory() {
    localStorage.removeItem(this.gameHistoryKey);
  }
  
  /**
   * 保存AI学习数据
   * @param {Object} learningData AI学习数据
   */
  saveAILearningData(learningData) {
    localStorage.setItem(this.aiLearningKey, JSON.stringify(learningData));
  }
  
  /**
   * 获取AI学习数据
   * @return {Object} AI学习数据
   */
  getAILearningData() {
    const data = localStorage.getItem(this.aiLearningKey);
    return data ? JSON.parse(data) : this.getEmptyAILearningData();
  }
  
  /**
   * 获取空的AI学习数据
   * @return {Object} 空的AI学习数据
   */
  getEmptyAILearningData() {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalMoves: 0,
      moves: {},
      
      // 学习进度
      openingPatterns: 0,
      openingSuccessRate: 0,
      middleTactics: 0,
      middleSuccessRate: 0,
      endgameSkills: 0,
      endgameSuccessRate: 0,
      defensiveStrategies: 0,
      defensiveSuccessRate: 0,
      attackingStrategies: 0,
      attackingSuccessRate: 0,
      
      // 最近改进时间
      lastOpeningImprovement: null,
      lastMiddleImprovement: null,
      lastEndgameImprovement: null,
      lastDefensiveImprovement: null,
      lastAttackingImprovement: null
    };
  }
  
  /**
   * 重置AI学习数据
   */
  resetAILearningData() {
    localStorage.removeItem(this.aiLearningKey);
  }
  
  /**
   * 保存游戏设置
   * @param {Object} settings 游戏设置
   */
  saveSettings(settings) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }
  
  /**
   * 获取游戏设置
   * @return {Object} 游戏设置
   */
  getSettings() {
    const settings = localStorage.getItem(this.settingsKey);
    return settings ? JSON.parse(settings) : this.getDefaultSettings();
  }
  
  /**
   * 获取默认游戏设置
   * @return {Object} 默认游戏设置
   */
  getDefaultSettings() {
    return {
      difficulty: 'medium',
      aiLearning: true,
      soundEnabled: true,
      theme: 'default'
    };
  }
  
  /**
   * 保存当前游戏状态
   * @param {Object} gameData 当前游戏状态
   */
  saveCurrentGame(gameData) {
    localStorage.setItem('chessCurrentGame', JSON.stringify({
      board: gameData.board,
      currentPlayer: gameData.currentPlayer,
      gameState: {
        whiteKingMoved: gameData.gameState.whiteKingMoved,
        blackKingMoved: gameData.gameState.blackKingMoved,
        whiteKRookMoved: gameData.gameState.whiteKRookMoved,
        whiteQRookMoved: gameData.gameState.whiteQRookMoved,
        blackKRookMoved: gameData.gameState.blackKRookMoved,
        blackQRookMoved: gameData.gameState.blackQRookMoved,
        halfMoves: gameData.gameState.halfMoves,
        fullMoves: gameData.gameState.fullMoves,
        lastMove: gameData.gameState.lastMove,
        positionHistory: gameData.gameState.positionHistory
      },
      movesList: gameData.movesList,
      startTime: gameData.startTime,
      difficulty: gameData.difficulty,
      aiLearning: gameData.aiLearning
    }));
  }
  
  /**
   * 获取保存的游戏状态
   * @return {Object|null} 保存的游戏状态，如果没有则返回null
   */
  getSavedGame() {
    const savedGame = localStorage.getItem('chessCurrentGame');
    return savedGame ? JSON.parse(savedGame) : null;
  }
  
  /**
   * 清除保存的游戏状态
   */
  clearSavedGame() {
    localStorage.removeItem('chessCurrentGame');
  }
  
  /**
   * 获取统计数据
   * @return {Object} 统计数据
   */
  getStatistics() {
    const history = this.getGameHistory();
    
    if (history.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgMoves: 0,
        avgDuration: 0,
        difficultyStats: {
          easy: { games: 0, wins: 0, winRate: 0 },
          medium: { games: 0, wins: 0, winRate: 0 },
          hard: { games: 0, wins: 0, winRate: 0 }
        },
        openingStats: {}
      };
    }
    
    // 计算基本统计数据
    const wins = history.filter(game => game.result === 'win').length;
    const losses = history.filter(game => game.result === 'loss').length;
    const draws = history.filter(game => game.result === 'draw').length;
    const totalMoves = history.reduce((sum, game) => sum + game.moves, 0);
    const totalDuration = history.reduce((sum, game) => sum + game.duration, 0);
    
    // 计算各难度统计数据
    const difficultyStats = {
      easy: { games: 0, wins: 0 },
      medium: { games: 0, wins: 0 },
      hard: { games: 0, wins: 0 }
    };
    
    history.forEach(game => {
      const difficulty = game.difficulty || 'medium';
      difficultyStats[difficulty].games++;
      if (game.result === 'win') {
        difficultyStats[difficulty].wins++;
      }
    });
    
    // 计算各难度胜率
    Object.keys(difficultyStats).forEach(difficulty => {
      const { games, wins } = difficultyStats[difficulty];
      difficultyStats[difficulty].winRate = games > 0 ? wins / games : 0;
    });
    
    // 计算开局统计数据
    const openingStats = {};
    history.forEach(game => {
      if (game.firstMove) {
        if (!openingStats[game.firstMove]) {
          openingStats[game.firstMove] = { count: 0, wins: 0 };
        }
        openingStats[game.firstMove].count++;
        if (game.result === 'win') {
          openingStats[game.firstMove].wins++;
        }
      }
    });
    
    // 计算开局胜率
    Object.keys(openingStats).forEach(opening => {
      const { count, wins } = openingStats[opening];
      openingStats[opening].winRate = wins / count;
    });
    
    return {
      totalGames: history.length,
      wins,
      losses,
      draws,
      winRate: wins / history.length,
      avgMoves: totalMoves / history.length,
      avgDuration: totalDuration / history.length,
      difficultyStats,
      openingStats
    };
  }
}