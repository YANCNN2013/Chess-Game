/** 
 * AI逻辑模块
 * 负责AI决策和自我学习机制 (已弃用, 功能已迁移至stockfishAI.js)
 */

class ChessAI {
  constructor() {
    this.rules = new ChessRules();
    this.learningEnabled = true;
    this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.learningData = this.loadLearningData();
    
    // 搜索深度配置
    this.searchDepth = {
      'easy': 2,
      'medium': 4,
      'hard': 8
    };
    
    // 走法评估权重（增强防守）
    this.weights = {
      material: 1.0,      // 子力价值
      position: 0.4,      // 位置价值
      mobility: 0.25,     // 机动性
      kingSafety: 0.8,    // 王的安全（增强）
      controlCenter: 0.35, // 控制中心
      pawnStructure: 0.45, // 兵的结构
      pieceCoordination: 0.3, // 棋子协同
      tacticalPatterns: 0.5, // 战术模式
      pieceSafety: 0.7     // 棋子安全（新增）
    };
    
    // 棋子价值表（更精确的价值评估）
    this.pieceValues = {
      'p': 100,
      'n': 320,
      'b': 330,
      'r': 500,
      'q': 900,
      'k': 20000
    };
    
    // 位置评估表（基于国际象棋大师对局数据）
    this.positionTables = {
      // 兵的位置评估表
      'p': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
      ],
      // 马的位置评估表
      'n': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
      ],
      // 象的位置评估表
      'b': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
      ],
      // 车的位置评估表
      'r': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  5,  5,  0,  0,  0]
      ],
      // 皇后的位置评估表
      'q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
      ],
      // 王的位置评估表（中局）
      'k_mid': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
      ],
      // 王的位置评估表（残局）
      'k_end': [
        [-50,-40,-30,-20,-20,-30,-40,-50],
        [-30,-20,-10,  0,  0,-10,-20,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-30,  0,  0,  0,  0,-30,-30],
        [-50,-30,-30,-30,-30,-30,-30,-50]
      ]
    };
    
    // 常见战术模式识别（增强版）
    this.tacticalPatterns = {
      // 叉攻击（一个棋子同时攻击多个目标）
      fork: {
        pattern: this.identifyFork,
        weight: 60
      },
      // 牵制（一个棋子被牵制无法移动）
      pin: {
        pattern: this.identifyPin,
        weight: 50
      },
      // 抽将（通过将军同时攻击其他棋子）
      skewer: {
        pattern: this.identifySkewer,
        weight: 55
      },
      // 闪击（一个棋子移开，露出后面棋子的攻击）
      discovery: {
        pattern: this.identifyDiscovery,
        weight: 45
      },
      // 双重攻击（两个棋子同时攻击同一个目标）
      doubleAttack: {
        pattern: this.identifyDoubleAttack,
        weight: 40
      },
      // 消除保护（移除对方棋子的保护）
      removalOfGuard: {
        pattern: this.identifyRemovalOfGuard,
        weight: 35
      },
      // 无保护子攻击（攻击没有保护的对方棋子）
      unprotectedPiece: {
        pattern: this.identifyUnprotectedPiece,
        weight: 45
      }
    };
    
    // 开局库（常见开局走法）
    this.openingBook = {
      // 开放性开局
      'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'g7g6', 'd7d6', 'f7f5'],
      'e7e5': ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'b1c3', 'f2f4'],
      
      // 意大利开局
      'e2e4e7e5': ['g1f3', 'b1c3'],
      'g1f3g8f6': ['b1c3', 'f1c4'],
      'b1c3b8c6': ['f1c4', 'f1b5'],
      
      // 西班牙开局（Ruy Lopez）
      'e2e4e7e5': ['g1f3', 'b1c3'],
      'g1f3g8f6': ['b1c3', 'f1b5'],
      'f1b5b8c6': ['d2d4', '0-0', 'c2c3'],
      
      // 半开放性开局
      'e2e4c7c5': ['g1f3', 'd2d4', 'c2c3'], // 西西里防御
      'e2e4e7e6': ['d2d4', 'c2c4', 'g1f3'], // 法兰西防御
      'e2e4c7c6': ['d2d4', 'g1f3'], // 卡罗-康防御
      'e2e4g7g6': ['d2d4', 'c2c4', 'g1f3'], // 王翼印度防御
      
      // 封闭性开局
      'd2d4': ['d7d5', 'e7e6', 'c7c5', 'g7g6', 'f7f5'],
      'd7d5': ['d2d4', 'e2e4', 'c2c4', 'g1f3'],
      'c2c4': ['e7e5', 'c7c5', 'e7e6', 'g7g6', 'd7d5', 'e7e4'], // 英国式开局
      'g1f3': ['d7d5', 'e7e5', 'c7c5', 'g7g6', 'e7e6'],
      
      // 王翼弃兵
      'e2e4e7e5': ['f2f4'],
      'f2f4e7e4': ['g1f3', 'b1c3'],
      
      // 后翼弃兵
      'd2d4d7d5': ['c2c4', 'g1f3'],
      'c2c4e7e6': ['g1f3', 'b1c3'],
      
      // 荷兰防御
      'd2d4f7f5': ['c2c4', 'g1f3', 'e2e3'],
      
      // 斯堪的纳维亚防御
      'e2e4d7d5': ['e4d5', 'g1f3', 'd2d4']
    };
    
    // 缓存机制
    this.cache = {
      evaluate: new Map(), // 评估缓存
      validMoves: new Map(), // 有效移动缓存
      cacheSize: 1000, // 缓存大小限制
      hits: 0, // 缓存命中次数
      misses: 0 // 缓存未命中次数
    };
    
    // 移动排序权重（增强防守）
    this.moveOrderingWeights = {
      capture: 1000,      // 吃子
      promotion: 900,     // 升变
      check: 800,         // 将军
      safety: 750,        // 安全移动（增强）
      controlCenter: 700, // 控制中心
      development: 600,   // 子力发展
      protection: 650,    // 保护移动（新增）
      escape: 600         // 逃脱移动（新增）
    };
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.evaluate.clear();
    this.cache.validMoves.clear();
    this.cache.hits = 0;
    this.cache.misses = 0;
  }
  
  /**
   * 获取缓存键
   */
  getCacheKey(board, currentPlayer, gameState) {
    const boardKey = this.getBoardKey(board);
    const stateKey = JSON.stringify({
      currentPlayer,
      fullMoves: gameState.fullMoves || 0,
      halfMoves: gameState.halfMoves || 0
    });
    return boardKey + '|' + stateKey;
  }
  
  /**
   * 设置AI难度
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }
  
  /**
   * 设置是否启用学习
   */
  setLearningEnabled(enabled) {
    this.learningEnabled = enabled;
  }
  
  /**
   * 获取AI的下一步移动
   */
  getMove(board, currentPlayer, gameState) {
    // 显示AI正在思考的提示
    this.showThinking(true);
    
    return new Promise((resolve) => {
      // 首先尝试从开局库中获取走法
      const openingMove = this.getOpeningMove(board, currentPlayer, gameState);
      if (openingMove) {
        // 隐藏AI正在思考的提示
        this.showThinking(false);
        
        // 记录AI的移动以供学习
        if (this.learningEnabled) {
          this.recordMove(board, openingMove, currentPlayer);
        }
        
        resolve(openingMove);
        return;
      }
      
      // 根据难度设置思考时间（增加思考时间以支持更深的搜索）
      const maxThinkingTime = this.getThinkingTime();
      const startTime = Date.now();
      
      // 根据难度设置最大搜索深度（进一步提高搜索深度）
      let maxDepth;
      switch (this.difficulty) {
        case 'easy':
          maxDepth = 4;
          break;
        case 'medium':
          maxDepth = 7;
          break;
        case 'hard':
          maxDepth = 10;
          break;
        default:
          maxDepth = 7;
      }
      
      // 使用带时间限制的迭代加深搜索
      let bestMove = null;
      let bestScore = -Infinity;
      let currentDepth = 1;
      
      // 异步执行搜索，确保在时间限制内完成
      const searchWithTimeLimit = () => {
        // 检查是否超时
        if (Date.now() - startTime > maxThinkingTime * 0.9) {
          // 超时，使用当前找到的最佳移动
          if (!bestMove) {
            bestMove = this.getRandomMove(board, currentPlayer, gameState);
          }
          finishSearch();
          return;
        }
        
        // 搜索当前深度
        try {
          const result = this.minimax(board, currentDepth, -Infinity, Infinity, true, currentPlayer, gameState);
          
          if (result.move) {
            bestMove = result.move;
            bestScore = result.score;
          }
          
          // 增加深度继续搜索
          currentDepth++;
          if (currentDepth <= maxDepth && bestScore < 1000) {
            // 继续搜索更深层次
            setTimeout(searchWithTimeLimit, 0);
          } else {
            // 搜索完成
            if (!bestMove) {
              bestMove = this.getRandomMove(board, currentPlayer, gameState);
            }
            finishSearch();
          }
        } catch (error) {
          // 发生错误，使用随机移动
          bestMove = this.getRandomMove(board, currentPlayer, gameState);
          finishSearch();
        }
      };
      
      const finishSearch = () => {
        // 隐藏AI正在思考的提示
        this.showThinking(false);
        
        // 记录AI的移动以供学习
        if (this.learningEnabled) {
          this.recordMove(board, bestMove, currentPlayer);
        }
        
        resolve(bestMove);
      };
      
      // 开始搜索
      searchWithTimeLimit();
    });
  }
  
  /**
   * 从开局库中获取走法
   */
  getOpeningMove(board, currentPlayer, gameState) {
    // 检查游戏是否处于开局阶段（前10步）
    const fullMoves = gameState.fullMoves || 0;
    if (fullMoves > 10) {
      return null;
    }
    
    // 尝试从开局库中找到匹配的走法
    const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
    
    // 检查每个有效移动是否在开局库中
    for (const move of validMoves) {
      // 转换移动为标准代数记号
      const moveNotation = this.moveToNotation(move, board);
      
      // 检查单个移动是否在开局库中
      if (this.openingBook[moveNotation]) {
        return move;
      }
      
      // 检查移动序列是否在开局库中
      if (gameState.moveHistory) {
        const moveHistory = gameState.moveHistory.join('');
        const sequenceNotation = moveHistory + moveNotation;
        if (this.openingBook[sequenceNotation]) {
          return move;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 将移动转换为标准代数记号
   */
  moveToNotation(move, board) {
    const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromSquare = columns[move.fromX] + (8 - move.fromY);
    const toSquare = columns[move.toX] + (8 - move.toY);
    return fromSquare + toSquare;
  }
  

  
  /**
   * 获取思考时间（增加时间以支持更深的搜索）
   */
  getThinkingTime() {
    switch (this.difficulty) {
      case 'easy':
        return 500 + Math.random() * 500; // 0.5-1秒，保持响应迅速
      case 'medium':
        return 2000 + Math.random() * 1000; // 2-3秒，平衡思考深度和响应速度
      case 'hard':
        return 4000 + Math.random() * 2000; // 4-6秒，为深度搜索提供足够时间
      default:
        return 2000;
    }
  }
  
  /**
   * 显示或隐藏AI正在思考的提示
   */
  showThinking(show) {
    const board = document.getElementById('chess-board');
    const loadingToast = document.getElementById('loading-toast');
    
    if (show) {
      board.classList.add('ai-thinking');
      loadingToast.classList.remove('translate-y-20', 'opacity-0');
    } else {
      board.classList.remove('ai-thinking');
      loadingToast.classList.add('translate-y-20', 'opacity-0');
    }
  }
  
  /**
   * 随机选择一个合法移动
   */
  getRandomMove(board, currentPlayer, gameState) {
    const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
    
    if (validMoves.length === 0) {
      return null;
    }
    
    // 从学习数据中获取最佳移动
    if (this.learningEnabled) {
      const boardKey = this.getBoardKey(board);
      const learnedMove = this.getLearnedMove(boardKey, validMoves);
      if (learnedMove) {
        return learnedMove;
      }
    }
    
    // 随机选择一个合法移动
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
  
  /**
   * Minimax算法（带Alpha-Beta剪枝、迭代加深和空着裁剪）
   */
  minimax(board, depth, alpha, beta, isMaximizingPlayer, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 到达搜索深度或游戏结束
    if (depth === 0) {
      const score = this.evaluateBoard(board, currentPlayer, gameState);
      return { score, move: null };
    }
    
    // 检查游戏是否结束
    if (this.rules.isCheckmated(board, currentPlayer, gameState)) {
      return { score: -Infinity, move: null };
    }
    
    if (this.rules.isCheckmated(board, opponentColor, gameState)) {
      return { score: Infinity, move: null };
    }
    
    if (this.rules.isDraw(board, currentPlayer, gameState)) {
      return { score: 0, move: null };
    }
    
    // 获取有效移动（带缓存）
    let validMoves = this.getValidMovesWithCache(board, currentPlayer, gameState);
    
    // 对移动进行高效排序，优先考虑更好的移动（提高Alpha-Beta剪枝效率）
    validMoves.sort((a, b) => {
      let scoreA = this.orderMove(a, board, currentPlayer, gameState);
      let scoreB = this.orderMove(b, board, currentPlayer, gameState);
      
      // 如果启用了学习，从学习数据中获取额外的分数
      if (this.learningEnabled) {
        const boardKey = this.getBoardKey(board);
        scoreA += this.getMoveScoreFromLearning(boardKey, a) * 10; // 增加学习数据的权重
        scoreB += this.getMoveScoreFromLearning(boardKey, b) * 10;
      }
      
      return scoreB - scoreA;
    });
    
    // 如果没有有效移动，返回平局
    if (validMoves.length === 0) {
      return { score: 0, move: null };
    }
    
    // 空着裁剪（Null Move Pruning）- 仅在深度大于2时使用
    if (depth >= 3 && !this.rules.isInCheck(board, currentPlayer)) {
      // 尝试空着（让对方连走两步）
      const nullMoveScore = -this.minimax(board, depth - 3, -beta, -beta + 1, !isMaximizingPlayer, opponentColor, gameState).score;
      
      // 如果空着后的分数仍然大于等于beta，则可以剪枝
      if (nullMoveScore >= beta) {
        return { score: nullMoveScore, move: null };
      }
    }
    
    let bestMove = null;
    
    if (isMaximizingPlayer) {
      let maxScore = -Infinity;
      
      for (const move of validMoves) {
        const newBoard = this.makeMove(board, move, currentPlayer, gameState);
        const newGameState = this.updateGameState(gameState, move, currentPlayer);
        const result = this.minimax(newBoard, depth - 1, alpha, beta, false, opponentColor, newGameState);
        
        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = move;
        }
        
        alpha = Math.max(alpha, maxScore);
        
        // Alpha-Beta剪枝
        if (beta <= alpha) {
          break;
        }
      }
      
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      
      for (const move of validMoves) {
        const newBoard = this.makeMove(board, move, currentPlayer, gameState);
        const newGameState = this.updateGameState(gameState, move, currentPlayer);
        const result = this.minimax(newBoard, depth - 1, alpha, beta, true, opponentColor, newGameState);
        
        if (result.score < minScore) {
          minScore = result.score;
          bestMove = move;
        }
        
        beta = Math.min(beta, minScore);
        
        // Alpha-Beta剪枝
        if (beta <= alpha) {
          break;
        }
      }
      
      return { score: minScore, move: bestMove };
    }
  }
  
  /**
   * 移动启发式评估（用于排序移动，提高Alpha-Beta剪枝效率）
   */
  moveHeuristic(move, board, currentPlayer) {
    const { fromX, fromY, toX, toY, piece } = move;
    const targetPiece = board[toY][toX];
    
    let score = 0;
    
    // 吃子加分
    if (targetPiece) {
      const pieceValue = this.rules.pieceValues[piece[1]];
      const targetValue = this.rules.pieceValues[targetPiece[1]];
      
      // 优先考虑高价值吃子，避免低价值棋子被吃
      score += (targetValue - pieceValue) * 10;
    }
    
    // 控制中心加分
    if ((toX >= 3 && toX <= 4) && (toY >= 3 && toY <= 4)) {
      score += 5;
    }
    
    // 保护王加分
    if (piece[1] === 'k') {
      score += 10;
    }
    
    return score;
  }
  
  /**
   * 评估棋盘状态（带缓存）
   */
  evaluateBoard(board, currentPlayer, gameState) {
    // 生成缓存键
    const cacheKey = this.getCacheKey(board, currentPlayer, gameState);
    
    // 检查缓存
    if (this.cache.evaluate.has(cacheKey)) {
      this.cache.hits++;
      return this.cache.evaluate.get(cacheKey);
    }
    
    this.cache.misses++;
    
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    let score = 0;
    
    // 子力价值（使用更精确的价值表）
    score += this.evaluateMaterial(board, currentPlayer) * this.weights.material;
    
    // 位置价值（使用详细的位置评估表）
    score += this.evaluatePosition(board, currentPlayer) * this.weights.position;
    
    // 机动性（可移动的棋子数量）
    score += this.evaluateMobility(board, currentPlayer, gameState) * this.weights.mobility;
    
    // 王的安全
    score += this.evaluateKingSafety(board, currentPlayer, gameState) * this.weights.kingSafety;
    
    // 皇后的安全
    score += this.evaluateQueenSafety(board, currentPlayer, gameState) * 0.8; // 增强皇后安全权重
    
    // 控制中心
    score += this.evaluateCenterControl(board, currentPlayer) * this.weights.controlCenter;
    
    // 兵的结构
    score += this.evaluatePawnStructure(board, currentPlayer) * this.weights.pawnStructure;
    
    // 棋子协同
    score += this.evaluatePieceCoordination(board, currentPlayer) * this.weights.pieceCoordination;
    
    // 战术模式识别
    score += this.evaluateTacticalPatterns(board, currentPlayer, gameState) * this.weights.tacticalPatterns;
    
    // 棋子安全
    score += this.evaluatePieceSafety(board, currentPlayer, gameState) * this.weights.pieceSafety;
    
    // 评估未来威胁
    score += this.evaluateFutureThreats(board, currentPlayer, gameState) * 0.4;
    
    // 缓存结果
    if (this.cache.evaluate.size >= this.cache.cacheSize) {
      // 如果缓存已满，删除最旧的条目
      const firstKey = this.cache.evaluate.keys().next().value;
      this.cache.evaluate.delete(firstKey);
    }
    
    this.cache.evaluate.set(cacheKey, score);
    
    return score;
  }
  
  /**
   * 评估棋子安全
   */
  evaluatePieceSafety(board, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 检查每个己方棋子的安全状态
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === currentPlayer) {
          // 检查棋子是否被攻击
          if (this.isPieceUnderAttack(board, x, y, currentPlayer, opponentColor, gameState)) {
            // 根据棋子价值给予不同程度的惩罚
            const pieceValue = this.pieceValues[piece[1]];
            let penaltyMultiplier = 0.3;
            
            // 检查攻击者是否是低价值棋子
            const attackers = this.findPieceAttackers(board, x, y, currentPlayer, opponentColor, gameState);
            let hasLowValueAttacker = false;
            
            for (const attacker of attackers) {
              const attackerValue = this.pieceValues[attacker[1]];
              if (attackerValue < pieceValue) {
                hasLowValueAttacker = true;
                break;
              }
            }
            
            // 高价值棋子被低价值棋子攻击时给予更高的惩罚
            if (hasLowValueAttacker) {
              penaltyMultiplier = 0.8;
            } else if (piece[1] === 'q') {
              penaltyMultiplier = 0.6;
            }
            
            score -= pieceValue * penaltyMultiplier;
            
            // 对于被低价值棋子攻击的高价值棋子，不鼓励用其他棋子保护，而是鼓励逃脱
            if (!hasLowValueAttacker && piece[1] !== 'q') {
              // 检查是否有保护者
              const hasProtector = this.hasPieceProtector(board, x, y, currentPlayer, gameState);
              if (hasProtector) {
                // 有保护者，减少惩罚
                score += pieceValue * 0.2;
              }
            }
          }
          
          // 检查关键棋子的位置安全性
          if (piece[1] === 'q' || piece[1] === 'r' || piece[1] === 'k') {
            // 关键棋子位置安全性评估
            if (this.isKeyPieceInSafePosition(board, x, y, currentPlayer, gameState)) {
              score += this.pieceValues[piece[1]] * 0.1;
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 检查棋子是否有保护者
   */
  hasPieceProtector(board, x, y, currentPlayer, gameState) {
    // 检查是否有己方棋子能保护该位置
    for (let ay = 0; ay < 8; ay++) {
      for (let ax = 0; ax < 8; ax++) {
        const protectorPiece = board[ay][ax];
        if (protectorPiece && protectorPiece[0] === currentPlayer && !(ay === y && ax === x)) {
          const protectMove = {
            fromX: ax,
            fromY: ay,
            toX: x,
            toY: y,
            piece: protectorPiece
          };
          if (this.rules.isValidMove(board, protectMove, currentPlayer, gameState)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * 检查关键棋子是否在安全位置
   */
  isKeyPieceInSafePosition(board, x, y, currentPlayer, gameState) {
    // 检查关键棋子（皇后、车、王）是否在安全位置
    const piece = board[y][x];
    if (!piece) return false;
    
    // 检查周围是否有己方棋子保护
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    let nearbyProtectors = 0;
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        const nearbyPiece = board[ny][nx];
        if (nearbyPiece && nearbyPiece[0] === currentPlayer) {
          nearbyProtectors++;
        }
      }
    }
    
    // 王需要至少2个保护者，其他关键棋子需要至少1个保护者
    if (piece[1] === 'k') {
      return nearbyProtectors >= 2;
    } else {
      return nearbyProtectors >= 1;
    }
  }
  
  /**
   * 评估未来威胁
   */
  evaluateFutureThreats(board, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 检查己方棋子是否会被对方下一步攻击
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === currentPlayer) {
          // 检查该棋子是否会被对方下一步攻击
          if (this.isPieceUnderAttack(board, x, y, currentPlayer, opponentColor, gameState)) {
            // 根据棋子价值给予不同程度的惩罚
            const pieceValue = this.rules.pieceValues[piece[1]];
            score -= pieceValue * 0.2;
          }
        }
      }
    }
    
    // 检查对方棋子是否会被己方下一步攻击
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === opponentColor) {
          // 检查该棋子是否会被己方下一步攻击
          if (this.isPieceUnderAttack(board, x, y, opponentColor, currentPlayer, gameState)) {
            // 根据棋子价值给予不同程度的奖励
            const pieceValue = this.rules.pieceValues[piece[1]];
            score += pieceValue * 0.15;
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 评估子力价值
   */
  evaluateMaterial(board, currentPlayer) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          const pieceType = piece[1];
          const pieceValue = this.pieceValues[pieceType];
          score += piece[0] === currentPlayer ? pieceValue : -pieceValue;
        }
      }
    }
    
    return score;
  }
  
  /**
   * 评估位置价值
   */
  evaluatePosition(board, currentPlayer) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 计算棋盘阶段（中局或残局）
    const gamePhase = this.calculateGamePhase(board);
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          const pieceType = piece[1];
          const pieceColor = piece[0];
          const isCurrentPlayer = pieceColor === currentPlayer;
          
          // 调整位置评估表的索引（根据棋子颜色）
          let tableY = y;
          if (pieceColor === 'b') {
            tableY = 7 - y;
          }
          
          // 根据棋子类型使用相应的位置评估表
          if (pieceType === 'k') {
            // 王的位置评估根据游戏阶段使用不同的表
            const kingTable = gamePhase === 'endgame' ? this.positionTables.k_end : this.positionTables.k_mid;
            if (kingTable && kingTable[tableY] && kingTable[tableY][x] !== undefined) {
              score += isCurrentPlayer ? kingTable[tableY][x] : -kingTable[tableY][x];
            }
          } else if (this.positionTables[pieceType] && this.positionTables[pieceType][tableY] && this.positionTables[pieceType][tableY][x] !== undefined) {
            // 其他棋子的位置评估
            score += isCurrentPlayer ? this.positionTables[pieceType][tableY][x] : -this.positionTables[pieceType][tableY][x];
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 计算游戏阶段（中局或残局）
   */
  calculateGamePhase(board) {
    let totalMaterial = 0;
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          const pieceType = piece[1];
          if (pieceType === 'q' || pieceType === 'r') {
            totalMaterial += this.pieceValues[pieceType];
          }
        }
      }
    }
    
    // 如果双方总子力价值低于1500（大约相当于各剩一个车），则认为是残局
    return totalMaterial < 1500 ? 'endgame' : 'midgame';
  }
  
  /**
   * 评估机动性
   */
  evaluateMobility(board, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    const playerMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState).length;
    const opponentMoves = this.rules.getAllValidMoves(board, opponentColor, gameState).length;
    
    return (playerMoves - opponentMoves) * 0.1;
  }
  
  /**
   * 评估王的安全
   */
  evaluateKingSafety(board, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 检查王是否被将军
    if (this.rules.isInCheck(board, currentPlayer)) {
      score -= 10; // 增加将军的惩罚力度
    }
    
    if (this.rules.isInCheck(board, opponentColor)) {
      score += 5; // 增加将军的奖励力度
    }
    
    // 检查王周围的防守
    const kingPosition = this.findKingPosition(board, currentPlayer);
    if (kingPosition) {
      const { x, y } = kingPosition;
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      
      let lowValueDefenders = 0; // 低价值防守者（兵、马）
      let highValueDefenders = 0; // 高价值防守者（车、后）
      let attackPaths = 0;
      
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
          const piece = board[ny][nx];
          if (piece && piece[0] === currentPlayer) {
            const pieceValue = this.pieceValues[piece[1]];
            if (pieceValue <= 350) { // 兵、马视为低价值棋子
              lowValueDefenders++;
            } else {
              highValueDefenders++;
            }
          } else if (piece && piece[0] === opponentColor) {
            // 检查敌方棋子是否能威胁到王
            const move = {
              fromX: nx,
              fromY: ny,
              toX: x,
              toY: y,
              piece: piece
            };
            if (this.rules.isValidMove(board, move, opponentColor, gameState)) {
              score -= 3; // 敌方棋子能直接攻击王
            }
          }
        }
      }
      
      // 评估王的位置安全性
      if (this.isKingInSafePosition(board, kingPosition, currentPlayer)) {
        score += 3;
      }
      
      // 优先奖励低价值棋子防守，惩罚高价值棋子防守
      score += lowValueDefenders * 0.5; // 增加低价值防守者的奖励
      score -= highValueDefenders * 0.8; // 惩罚高价值棋子防守
    }
    
    return score;
  }
  
  /**
   * 评估皇后的安全
   */
  evaluateQueenSafety(board, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 找到皇后的位置
    const queenPosition = this.findQueenPosition(board, currentPlayer);
    if (queenPosition) {
      const { x, y } = queenPosition;
      
      // 检查皇后是否被攻击
      if (this.isPieceUnderAttack(board, x, y, currentPlayer, opponentColor, gameState)) {
        score -= 8; // 增加皇后被攻击的惩罚
        
        // 检查攻击者是否是低价值棋子（如兵）
        const attackers = this.findPieceAttackers(board, x, y, currentPlayer, opponentColor, gameState);
        for (const attacker of attackers) {
          const attackerType = attacker[1];
          if (attackerType === 'p') {
            score -= 10; // 兵攻击皇后的额外惩罚
          }
        }
      }
      
      // 评估皇后的位置价值
      if (this.isQueenInGoodPosition(board, queenPosition, currentPlayer, gameState)) {
        score += 3; // 增加皇后在安全位置的奖励
      }
    }
    
    return score;
  }
  
  /**
   * 找到攻击指定位置的所有敌方棋子
   */
  findPieceAttackers(board, x, y, pieceColor, attackerColor, gameState) {
    const attackers = [];
    
    for (let dy = 0; dy < 8; dy++) {
      for (let dx = 0; dx < 8; dx++) {
        const piece = board[dy][dx];
        if (piece && piece[0] === attackerColor) {
          const move = {
            fromX: dx,
            fromY: dy,
            toX: x,
            toY: y,
            piece: piece
          };
          if (this.rules.isValidMove(board, move, attackerColor, gameState)) {
            attackers.push(piece);
          }
        }
      }
    }
    
    return attackers;
  }
  
  /**
   * 检查王是否在安全位置
   */
  isKingInSafePosition(board, kingPosition, currentPlayer) {
    const { x, y } = kingPosition;
    
    // 检查王是否在角落或边上（通常更安全）
    if (x === 0 || x === 7 || y === 0 || y === 7) {
      return true;
    }
    
    // 检查王周围是否有己方棋子保护
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    let nearbyDefenders = 0;
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        const piece = board[ny][nx];
        if (piece && piece[0] === currentPlayer) {
          nearbyDefenders++;
        }
      }
    }
    
    return nearbyDefenders >= 2;
  }
  
  /**
   * 检查皇后是否在好位置
   */
  isQueenInGoodPosition(board, queenPosition, currentPlayer, gameState) {
    const { x, y } = queenPosition;
    
    // 检查皇后是否控制中心
    if ((x >= 2 && x <= 5) && (y >= 2 && y <= 5)) {
      return true;
    }
    
    // 检查皇后是否安全（不被攻击）
    return !this.isPieceUnderAttack(board, x, y, currentPlayer, currentPlayer === 'w' ? 'b' : 'w', gameState);
  }
  
  /**
   * 检查棋子是否被攻击
   */
  isPieceUnderAttack(board, x, y, pieceColor, attackerColor, gameState) {
    // 检查所有敌方棋子是否能攻击到该位置
    for (let dy = 0; dy < 8; dy++) {
      for (let dx = 0; dx < 8; dx++) {
        const piece = board[dy][dx];
        if (piece && piece[0] === attackerColor) {
          const move = {
            fromX: dx,
            fromY: dy,
            toX: x,
            toY: y,
            piece: piece
          };
          if (this.rules.isValidMove(board, move, attackerColor, gameState)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 找到皇后的位置
   */
  findQueenPosition(board, playerColor) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board[y][x] === playerColor + 'q') {
          return { x, y };
        }
      }
    }
    return null;
  }
  
  /**
   * 评估控制中心
   */
  evaluateCenterControl(board, currentPlayer) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 中央区域（d4, e4, d5, e5）
    const centerSquares = [
      { x: 3, y: 3 }, { x: 4, y: 3 },
      { x: 3, y: 4 }, { x: 4, y: 4 }
    ];
    
    for (const { x, y } of centerSquares) {
      const piece = board[y][x];
      if (piece) {
        score += piece[0] === currentPlayer ? 1 : -1;
      }
    }
    
    // 检查攻击中央的棋子
    for (const { x, y } of centerSquares) {
      for (let dy = 0; dy < 8; dy++) {
        for (let dx = 0; dx < 8; dx++) {
          const piece = board[dy][dx];
          if (piece && piece[0] === currentPlayer) {
            const move = {
              fromX: dx,
              fromY: dy,
              toX: x,
              toY: y,
              piece: piece
            };
            
            if (this.rules.isValidMove(board, move, currentPlayer, {})) {
              score += 0.2;
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 评估兵的结构
   */
  evaluatePawnStructure(board, currentPlayer) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 简化版：检查孤立兵和叠兵
    for (let x = 0; x < 8; x++) {
      let playerPawns = 0;
      let opponentPawns = 0;
      
      for (let y = 0; y < 8; y++) {
        const piece = board[y][x];
        if (piece === currentPlayer + 'p') {
          playerPawns++;
        } else if (piece === opponentColor + 'p') {
          opponentPawns++;
        }
      }
      
      // 叠兵扣分
      if (playerPawns > 1) {
        score -= (playerPawns - 1) * 0.5;
      }
      
      if (opponentPawns > 1) {
        score += (opponentPawns - 1) * 0.5;
      }
    }
    
    // 检查孤立兵
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = board[y][x];
        if (piece === currentPlayer + 'p') {
          // 检查左右是否有友方的兵
          const leftHasPawn = x > 0 && board[y][x - 1] === currentPlayer + 'p';
          const rightHasPawn = x < 7 && board[y][x + 1] === currentPlayer + 'p';
          
          if (!leftHasPawn && !rightHasPawn) {
            score -= 0.3;
          }
        } else if (piece === opponentColor + 'p') {
          const leftHasPawn = x > 0 && board[y][x - 1] === opponentColor + 'p';
          const rightHasPawn = x < 7 && board[y][x + 1] === opponentColor + 'p';
          
          if (!leftHasPawn && !rightHasPawn) {
            score += 0.3;
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 评估棋子协同
   */
  evaluatePieceCoordination(board, currentPlayer) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    let score = 0;
    
    // 检查棋子之间的协同
    const playerPieces = [];
    const opponentPieces = [];
    
    // 收集所有棋子的位置
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          if (piece[0] === currentPlayer) {
            playerPieces.push({ x, y, type: piece[1] });
          } else {
            opponentPieces.push({ x, y, type: piece[1] });
          }
        }
      }
    }
    
    // 评估己方棋子的协同
    for (let i = 0; i < playerPieces.length; i++) {
      for (let j = i + 1; j < playerPieces.length; j++) {
        const piece1 = playerPieces[i];
        const piece2 = playerPieces[j];
        
        // 计算棋子之间的距离
        const distance = Math.sqrt(Math.pow(piece1.x - piece2.x, 2) + Math.pow(piece1.y - piece2.y, 2));
        
        // 棋子之间距离适中（2-4格）时，协同效果较好
        if (distance >= 2 && distance <= 4) {
          score += 0.5;
        }
        
        // 不同类型的棋子协同加分
        if ((piece1.type === 'n' && piece2.type === 'b') || (piece1.type === 'b' && piece2.type === 'n')) {
          score += 1.0; // 马象协同
        }
        if ((piece1.type === 'r' && piece2.type === 'q') || (piece1.type === 'q' && piece2.type === 'r')) {
          score += 1.5; // 车后协同
        }
      }
    }
    
    // 评估对方棋子的协同（作为惩罚）
    for (let i = 0; i < opponentPieces.length; i++) {
      for (let j = i + 1; j < opponentPieces.length; j++) {
        const piece1 = opponentPieces[i];
        const piece2 = opponentPieces[j];
        
        // 计算棋子之间的距离
        const distance = Math.sqrt(Math.pow(piece1.x - piece2.x, 2) + Math.pow(piece1.y - piece2.y, 2));
        
        // 棋子之间距离适中（2-4格）时，协同效果较好
        if (distance >= 2 && distance <= 4) {
          score -= 0.5;
        }
        
        // 不同类型的棋子协同扣分
        if ((piece1.type === 'n' && piece2.type === 'b') || (piece1.type === 'b' && piece2.type === 'n')) {
          score -= 1.0; // 马象协同
        }
        if ((piece1.type === 'r' && piece2.type === 'q') || (piece1.type === 'q' && piece2.type === 'r')) {
          score -= 1.5; // 车后协同
        }
      }
    }
    
    return score;
  }
  
  /**
   * 评估战术模式
   */
  evaluateTacticalPatterns(board, currentPlayer, gameState) {
    let score = 0;
    
    // 识别各种战术模式
    for (const patternName in this.tacticalPatterns) {
      const pattern = this.tacticalPatterns[patternName];
      const patternScore = pattern.pattern.call(this, board, currentPlayer, gameState);
      score += patternScore * pattern.weight;
    }
    
    return score;
  }
  
  /**
   * 识别叉攻击
   */
  identifyFork(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查所有己方棋子是否有叉攻击机会
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === currentPlayer) {
          const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
          
          // 检查每个移动是否能同时攻击多个目标
          for (const move of validMoves) {
            if (move.fromX === x && move.fromY === y) {
              // 创建临时棋盘，模拟移动
              const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
              
              // 检查移动后是否能攻击多个敌方棋子
              const attackedPieces = [];
              for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                  const targetPiece = tempBoard[ty][tx];
                  if (targetPiece && targetPiece[0] === opponentColor) {
                    const attackMove = {
                      fromX: move.toX,
                      fromY: move.toY,
                      toX: tx,
                      toY: ty,
                      piece: piece
                    };
                    if (this.rules.isValidMove(tempBoard, attackMove, currentPlayer, gameState)) {
                      attackedPieces.push(targetPiece);
                    }
                  }
                }
              }
              
              // 如果能攻击2个或以上有价值的棋子，则认为是叉攻击
              if (attackedPieces.length >= 2) {
                // 计算被攻击棋子的总价值
                const totalValue = attackedPieces.reduce((sum, p) => sum + this.pieceValues[p[1]], 0);
                score += totalValue / 100;
              }
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 识别牵制
   */
  identifyPin(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查对方棋子是否被牵制
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === opponentColor) {
          // 检查该棋子是否被牵制
          if (this.isPiecePinned(board, x, y, opponentColor, currentPlayer, gameState)) {
            score += this.pieceValues[piece[1]] / 200;
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 检查棋子是否被牵制
   */
  isPiecePinned(board, x, y, pieceColor, attackerColor, gameState) {
    const piece = board[y][x];
    if (!piece) return false;
    
    // 找到对方的王
    let kingPosition = null;
    for (let ky = 0; ky < 8; ky++) {
      for (let kx = 0; kx < 8; kx++) {
        const kingPiece = board[ky][kx];
        if (kingPiece === pieceColor + 'k') {
          kingPosition = { x: kx, y: ky };
          break;
        }
      }
      if (kingPosition) break;
    }
    
    if (!kingPosition) return false;
    
    // 检查棋子是否在王和攻击者之间的直线上
    const dx = kingPosition.x - x;
    const dy = kingPosition.y - y;
    
    // 只有在同一直线或斜线上才可能被牵制
    if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
      const stepX = dx !== 0 ? dx / Math.abs(dx) : 0;
      const stepY = dy !== 0 ? dy / Math.abs(dy) : 0;
      
      // 检查直线上是否有攻击者
      let currentX = x + stepX;
      let currentY = y + stepY;
      
      while (currentX !== kingPosition.x || currentY !== kingPosition.y) {
        const currentPiece = board[currentY][currentX];
        if (currentPiece) {
          // 如果遇到己方棋子，则不是牵制
          if (currentPiece[0] === pieceColor) {
            return false;
          }
          // 如果遇到对方棋子，检查是否是可以牵制的棋子（后、车、象）
          else if (currentPiece[0] === attackerColor) {
            const attackerType = currentPiece[1];
            if ((attackerType === 'q') || 
                (attackerType === 'r' && (dx === 0 || dy === 0)) || 
                (attackerType === 'b' && Math.abs(dx) === Math.abs(dy))) {
              return true;
            }
            return false;
          }
        }
        currentX += stepX;
        currentY += stepY;
      }
    }
    
    return false;
  }
  
  /**
   * 识别抽将
   */
  identifySkewer(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查是否有抽将机会
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === currentPlayer) {
          const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
          
          for (const move of validMoves) {
            if (move.fromX === x && move.fromY === y) {
              // 创建临时棋盘，模拟移动
              const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
              
              // 检查移动后是否将军
              if (this.rules.isInCheck(tempBoard, opponentColor)) {
                // 检查将军的同时是否能攻击其他棋子
                const attackedPieces = [];
                for (let ty = 0; ty < 8; ty++) {
                  for (let tx = 0; tx < 8; tx++) {
                    const targetPiece = tempBoard[ty][tx];
                    if (targetPiece && targetPiece[0] === opponentColor && targetPiece[1] !== 'k') {
                      const attackMove = {
                        fromX: move.toX,
                        fromY: move.toY,
                        toX: tx,
                        toY: ty,
                        piece: piece
                      };
                      if (this.rules.isValidMove(tempBoard, attackMove, currentPlayer, gameState)) {
                        attackedPieces.push(targetPiece);
                      }
                    }
                  }
                }
                
                if (attackedPieces.length > 0) {
                  const totalValue = attackedPieces.reduce((sum, p) => sum + this.pieceValues[p[1]], 0);
                  score += totalValue / 100;
                }
              }
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 识别闪击
   */
  identifyDiscovery(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查是否有闪击机会
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === currentPlayer) {
          const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
          
          for (const move of validMoves) {
            if (move.fromX === x && move.fromY === y) {
              // 创建临时棋盘，模拟移动
              const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
              
              // 检查移动后是否露出后面棋子的攻击
              for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                  const rearPiece = board[ty][tx];
                  if (rearPiece && rearPiece[0] === currentPlayer && !(ty === y && tx === x)) {
                    // 检查后面的棋子是否能攻击敌方棋子
                    for (let tty = 0; tty < 8; tty++) {
                      for (let ttx = 0; ttx < 8; ttx++) {
                        const targetPiece = tempBoard[tty][ttx];
                        if (targetPiece && targetPiece[0] === opponentColor) {
                          const attackMove = {
                            fromX: tx,
                            fromY: ty,
                            toX: ttx,
                            toY: tty,
                            piece: rearPiece
                          };
                          if (this.rules.isValidMove(tempBoard, attackMove, currentPlayer, gameState)) {
                            score += this.pieceValues[targetPiece[1]] / 100;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 识别双重攻击
   */
  identifyDoubleAttack(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查每个敌方棋子是否被多个己方棋子攻击
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const targetPiece = board[y][x];
        if (targetPiece && targetPiece[0] === opponentColor) {
          let attackers = 0;
          
          // 检查所有己方棋子是否能攻击该目标
          for (let ay = 0; ay < 8; ay++) {
            for (let ax = 0; ax < 8; ax++) {
              const attackerPiece = board[ay][ax];
              if (attackerPiece && attackerPiece[0] === currentPlayer) {
                const attackMove = {
                  fromX: ax,
                  fromY: ay,
                  toX: x,
                  toY: y,
                  piece: attackerPiece
                };
                if (this.rules.isValidMove(board, attackMove, currentPlayer, gameState)) {
                  attackers++;
                }
              }
            }
          }
          
          // 如果有2个或以上的攻击者，给予加分
          if (attackers >= 2) {
            score += (attackers - 1) * this.pieceValues[targetPiece[1]] / 200;
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 识别消除保护
   */
  identifyRemovalOfGuard(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查每个敌方棋子的保护者
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const targetPiece = board[y][x];
        if (targetPiece && targetPiece[0] === opponentColor) {
          // 找到保护该棋子的敌方棋子
          const guardians = [];
          
          for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
              const guardianPiece = board[gy][gx];
              if (guardianPiece && guardianPiece[0] === opponentColor) {
                const protectMove = {
                  fromX: gx,
                  fromY: gy,
                  toX: x,
                  toY: y,
                  piece: guardianPiece
                };
                if (this.rules.isValidMove(board, protectMove, opponentColor, gameState)) {
                  guardians.push({ x: gx, y: gy, piece: guardianPiece });
                }
              }
            }
          }
          
          // 检查是否可以消除保护者
          for (const guardian of guardians) {
            const captureMove = {
              fromX: x,
              fromY: y,
              toX: guardian.x,
              toY: guardian.y,
              piece: targetPiece
            };
            
            if (this.rules.isValidMove(board, captureMove, currentPlayer, gameState)) {
              // 计算消除保护后的收益
              const targetValue = this.pieceValues[targetPiece[1]];
              const guardianValue = this.pieceValues[guardian.piece[1]];
              
              if (targetValue > guardianValue) {
                score += (targetValue - guardianValue) / 200;
              }
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 识别无保护子攻击
   */
  identifyUnprotectedPiece(board, currentPlayer, gameState) {
    let score = 0;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查每个敌方棋子是否有保护者
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const targetPiece = board[y][x];
        if (targetPiece && targetPiece[0] === opponentColor) {
          // 检查该棋子是否有保护者
          let hasGuardian = false;
          
          // 检查是否有敌方棋子能保护该位置
          for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
              const guardianPiece = board[gy][gx];
              if (guardianPiece && guardianPiece[0] === opponentColor && !(gy === y && gx === x)) {
                const protectMove = {
                  fromX: gx,
                  fromY: gy,
                  toX: x,
                  toY: y,
                  piece: guardianPiece
                };
                if (this.rules.isValidMove(board, protectMove, opponentColor, gameState)) {
                  hasGuardian = true;
                  break;
                }
              }
            }
            if (hasGuardian) break;
          }
          
          // 如果没有保护者，检查我方是否有棋子能攻击它
          if (!hasGuardian) {
            for (let ay = 0; ay < 8; ay++) {
              for (let ax = 0; ax < 8; ax++) {
                const attackerPiece = board[ay][ax];
                if (attackerPiece && attackerPiece[0] === currentPlayer) {
                  const attackMove = {
                    fromX: ax,
                    fromY: ay,
                    toX: x,
                    toY: y,
                    piece: attackerPiece
                  };
                  if (this.rules.isValidMove(board, attackMove, currentPlayer, gameState)) {
                    // 计算攻击收益
                    const attackerValue = this.pieceValues[attackerPiece[1]];
                    const targetValue = this.pieceValues[targetPiece[1]];
                    
                    // 只有当目标价值大于攻击者价值时才加分（避免以大换小）
                    if (targetValue > attackerValue) {
                      score += (targetValue - attackerValue) / 100;
                    } else if (targetValue === attackerValue) {
                      // 价值相等时也给予一定加分
                      score += targetValue / 200;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * 找到王的位置
   */
  findKingPosition(board, playerColor) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (board[y][x] === playerColor + 'k') {
          return { x, y };
        }
      }
    }
    return null;
  }
  
  /**
   * 执行移动
   */
  makeMove(board, move, currentPlayer, gameState) {
    const { fromX, fromY, toX, toY, piece } = move;
    let newBoard = this.rules.cloneBoard(board);
    
    // 检查是否是王车易位
    if (this.rules.isCastlingMove(board, move, currentPlayer, gameState)) {
      return this.rules.executeCastling(board, move);
    }
    
    // 检查是否是吃过路兵
    if (piece[1] === 'p' && Math.abs(toX - fromX) === 1 && newBoard[toY][toX] === '') {
      const direction = currentPlayer === 'w' ? -1 : 1;
      if (toY === fromY + direction) {
        const adjacentPiece = newBoard[fromY][toX];
        if (adjacentPiece && adjacentPiece === (currentPlayer === 'w' ? 'bp' : 'wp')) {
          return this.rules.executeEnPassant(board, move);
        }
      }
    }
    
    // 普通移动
    newBoard[toY][toX] = piece;
    newBoard[fromY][fromX] = '';
    
    // 检查兵的升变
    if (this.rules.canPromote(board, move)) {
      newBoard = this.rules.promotePawn(newBoard, move, 'q'); // 默认升变为后
    }
    
    return newBoard;
  }
  
  /**
   * 更新游戏状态
   */
  updateGameState(gameState, move, currentPlayer) {
    const newGameState = { ...gameState };
    
    // 更新最后移动
    newGameState.lastMove = move;
    
    // 更新王和车的移动状态
    if (move.piece[1] === 'k') {
      if (currentPlayer === 'w') {
        newGameState.whiteKingMoved = true;
      } else {
        newGameState.blackKingMoved = true;
      }
    } else if (move.piece[1] === 'r') {
      if (currentPlayer === 'w') {
        if (move.fromX === 0) {
          newGameState.whiteQRookMoved = true;
        } else if (move.fromX === 7) {
          newGameState.whiteKRookMoved = true;
        }
      } else {
        if (move.fromX === 0) {
          newGameState.blackQRookMoved = true;
        } else if (move.fromX === 7) {
          newGameState.blackKRookMoved = true;
        }
      }
    }
    
    // 更新半回合计数（用于五十步规则）
    if (move.piece[1] === 'p') {
      newGameState.halfMoves = 0;
    } else {
      newGameState.halfMoves++;
    }
    
    // 更新完整回合计数
    if (currentPlayer === 'b') {
      newGameState.fullMoves++;
    }
    
    // 更新位置历史（用于三次重复局面规则）
    if (!newGameState.positionHistory) {
      newGameState.positionHistory = [];
    }
    
    return newGameState;
  }
  
  /**
   * 记录AI的移动以供学习
   */
  recordMove(board, move, currentPlayer) {
    const boardKey = this.getBoardKey(board);
    
    if (!this.learningData.moves[boardKey]) {
      this.learningData.moves[boardKey] = [];
    }
    
    // 记录移动，包括更多信息
    this.learningData.moves[boardKey].push({
      move: move,
      timestamp: Date.now(),
      success: false // 初始标记为未成功，后续会根据游戏结果更新
    });
    
    // 更新统计数据
    this.learningData.totalMoves++;
    
    // 定期保存学习数据
    if (this.learningData.totalMoves % 10 === 0) {
      this.saveLearningData();
    }
  }
  
  /**
   * 从学习数据中获取最佳移动
   */
  getLearnedMove(boardKey, validMoves) {
    if (!this.learningData.moves[boardKey]) {
      return null;
    }
    
    // 统计每种移动的使用次数和成功率
    const moveStats = {};
    
    for (const record of this.learningData.moves[boardKey]) {
      const moveKey = this.getMoveKey(record.move);
      
      if (!moveStats[moveKey]) {
        moveStats[moveKey] = {
          count: 0,
          successes: 0,
          move: record.move
        };
      }
      
      moveStats[moveKey].count++;
      if (record.success) {
        moveStats[moveKey].successes++;
      }
    }
    
    // 找出成功率最高的移动
    let bestMove = null;
    let bestScore = -1;
    
    for (const move of validMoves) {
      const moveKey = this.getMoveKey(move);
      const stats = moveStats[moveKey];
      
      if (stats) {
        const successRate = stats.successes / stats.count;
        // 综合考虑使用次数和成功率
        const score = (stats.count * 0.3) + (successRate * 0.7);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    // 如果找到合适的移动且成功率足够高，返回它
    if (bestMove) {
      const moveKey = this.getMoveKey(bestMove);
      const stats = moveStats[moveKey];
      const successRate = stats.successes / stats.count;
      
      // 只返回成功率高于50%的移动
      if (successRate > 0.5) {
        return bestMove;
      }
    }
    
    return null;
  }
  
  /**
   * 学习游戏结果
   */
  learnFromGameResult(result, gameMoves, currentPlayer) {
    if (!this.learningEnabled) {
      return;
    }
    
    // 更新游戏统计
    this.learningData.totalGames++;
    
    if (result === 'win') {
      this.learningData.wins++;
    } else if (result === 'loss') {
      this.learningData.losses++;
    } else {
      this.learningData.draws++;
    }
    
    // 分析走棋序列，从失败中学习
    if (result === 'loss') {
      this.analyzeGameMoves(gameMoves, currentPlayer, false);
    } else if (result === 'win') {
      this.analyzeGameMoves(gameMoves, currentPlayer, true);
    }
    
    // 更新学习进度
    this.updateLearningProgress();
    
    // 保存学习数据
    this.saveLearningData();
  }
  
  /**
   * 分析走棋序列
   */
  analyzeGameMoves(gameMoves, currentPlayer, isWin) {
    // 分析AI的走棋序列，更新移动的成功状态
    // 遍历学习数据中的所有移动记录
    for (const boardKey in this.learningData.moves) {
      const moves = this.learningData.moves[boardKey];
      
      for (const moveRecord of moves) {
        // 如果移动还没有标记成功状态，根据游戏结果标记
        if (!moveRecord.success) {
          moveRecord.success = isWin;
        }
      }
    }
    
    // 对于失败的游戏，惩罚最后几步关键走法
    if (!isWin) {
      this.punishFailedMoves();
    }
  }
  
  /**
   * 惩罚失败的走法
   */
  punishFailedMoves() {
    // 遍历所有移动记录，对失败的移动进行惩罚
    for (const boardKey in this.learningData.moves) {
      const moves = this.learningData.moves[boardKey];
      
      // 计算失败率
      let totalMoves = moves.length;
      let failedMoves = moves.filter(m => !m.success).length;
      let failureRate = totalMoves > 0 ? failedMoves / totalMoves : 0;
      
      // 如果失败率过高，降低这些移动的优先级
      if (failureRate > 0.7) {
        // 可以在这里实现更复杂的惩罚机制
        // 例如：减少失败移动的权重，或暂时禁用这些移动
      }
    }
  }
  
  /**
   * 更新学习进度
   */
  updateLearningProgress() {
    // 基于游戏次数和学习效果计算学习进度
    const totalGames = this.learningData.totalGames;
    
    // 计算胜率
    const winRate = totalGames > 0 ? this.learningData.wins / totalGames : 0;
    
    // 开局库学习进度
    this.learningData.openingPatterns = Math.min(20, Math.floor(totalGames / 5) + Math.floor(winRate * 10));
    this.learningData.openingSuccessRate = Math.min(1, this.learningData.openingPatterns / 20);
    
    // 中局战术学习进度
    this.learningData.middleTactics = Math.min(30, Math.floor(totalGames / 3) + Math.floor(winRate * 15));
    this.learningData.middleSuccessRate = Math.min(1, this.learningData.middleTactics / 30);
    
    // 残局技巧学习进度
    this.learningData.endgameSkills = Math.min(25, Math.floor(totalGames / 4) + Math.floor(winRate * 12));
    this.learningData.endgameSuccessRate = Math.min(1, this.learningData.endgameSkills / 25);
    
    // 防守策略学习进度
    this.learningData.defensiveStrategies = Math.min(15, Math.floor(totalGames / 6) + Math.floor(winRate * 8));
    this.learningData.defensiveSuccessRate = Math.min(1, this.learningData.defensiveStrategies / 15);
    
    // 攻击策略学习进度
    this.learningData.attackingStrategies = Math.min(15, Math.floor(totalGames / 6) + Math.floor(winRate * 8));
    this.learningData.attackingSuccessRate = Math.min(1, this.learningData.attackingStrategies / 15);
    
    // 更新最近改进时间
    const now = Date.now();
    this.learningData.lastOpeningImprovement = now;
    this.learningData.lastMiddleImprovement = now;
    this.learningData.lastEndgameImprovement = now;
    this.learningData.lastDefensiveImprovement = now;
    this.learningData.lastAttackingImprovement = now;
  }
  
  /**
   * 获取棋盘的唯一键
   */
  getBoardKey(board) {
    return board.map(row => row.join('')).join('');
  }
  
  /**
   * 获取移动的唯一键
   */
  getMoveKey(move) {
    return `${move.fromX},${move.fromY},${move.toX},${move.toY}`;
  }
  
  /**
   * 加载学习数据
   */
  loadLearningData() {
    const savedData = localStorage.getItem('chessAILearning');
    
    if (savedData) {
      return JSON.parse(savedData);
    }
    
    // 初始化学习数据
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
   * 从学习数据中获取移动的分数
   */
  getMoveScoreFromLearning(boardKey, move) {
    if (!this.learningData.moves[boardKey]) {
      return 0;
    }
    
    const moveKey = this.getMoveKey(move);
    const moveRecords = this.learningData.moves[boardKey];
    
    // 统计该移动的使用次数和成功次数
    let moveCount = 0;
    let successCount = 0;
    
    for (const record of moveRecords) {
      if (this.getMoveKey(record.move) === moveKey) {
        moveCount++;
        if (record.success) {
          successCount++;
        }
      }
    }
    
    // 计算成功率
    const successRate = moveCount > 0 ? successCount / moveCount : 0;
    
    // 根据使用次数和成功率计算分数
    // 成功的走法获得更高的分数，失败的走法获得较低的分数
    // 对失败的走法给予惩罚
    if (successRate < 0.3 && moveCount > 2) {
      // 失败率高的走法给予负分
      return -1.0;
    } else if (successRate < 0.5) {
      // 成功率低的走法给予低分
      return (moveCount * 0.1) + (successCount * 0.3);
    } else {
      // 成功率高的走法给予高分
      return (moveCount * 0.3) + (successCount * 0.7);
    }
  }
  
  /**
   * 获取有效移动（带缓存）
   */
  getValidMovesWithCache(board, currentPlayer, gameState) {
    // 生成缓存键
    const cacheKey = this.getCacheKey(board, currentPlayer, gameState);
    
    // 检查缓存
    if (this.cache.validMoves.has(cacheKey)) {
      this.cache.hits++;
      return this.cache.validMoves.get(cacheKey);
    }
    
    this.cache.misses++;
    
    // 获取有效移动
    const validMoves = this.rules.getAllValidMoves(board, currentPlayer, gameState);
    
    // 缓存结果
    if (this.cache.validMoves.size >= this.cache.cacheSize) {
      // 如果缓存已满，删除最旧的条目
      const firstKey = this.cache.validMoves.keys().next().value;
      this.cache.validMoves.delete(firstKey);
    }
    
    this.cache.validMoves.set(cacheKey, validMoves);
    
    return validMoves;
  }
  
  /**
   * 移动排序函数（增强防守和攻击无保护子）
   */
  orderMove(move, board, currentPlayer, gameState) {
    let score = 0;
    const { fromX, fromY, toX, toY, piece } = move;
    const targetPiece = board[toY][toX];
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 1. 检查是否是将军状态下的移动
    const isInCheck = this.rules.isInCheck(board, currentPlayer);
    
    // 2. 升变
    if (this.rules.canPromote(board, move)) {
      score += this.moveOrderingWeights.promotion;
    }
    
    // 3. 将军
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    if (this.rules.isInCheck(tempBoard, opponentColor)) {
      score += this.moveOrderingWeights.check;
    }
    
    // 4. 将军状态下的逃脱移动（最高优先级）
    if (isInCheck) {
      // 检查移动后是否解除将军
      if (!this.rules.isInCheck(tempBoard, currentPlayer)) {
        // 优先考虑王的移动（躲避将军）
        if (piece[1] === 'k') {
          score += 1000; // 王躲避将军的最高优先级
        } else {
          // 用低价值棋子挡将
          const pieceValue = this.pieceValues[piece[1]];
          if (pieceValue <= 350) { // 兵、马视为低价值棋子
            score += 800; // 低价值棋子挡将的高优先级
          } else {
            score -= 300; // 惩罚高价值棋子挡将
          }
        }
      }
    }
    
    // 5. 吃子（MVV-LVA：Most Valuable Victim - Least Valuable Aggressor）
    if (targetPiece) {
      const attackerValue = this.pieceValues[piece[1]];
      const victimValue = this.pieceValues[targetPiece[1]];
      score += this.moveOrderingWeights.capture + (victimValue - attackerValue);
      
      // 5.1 攻击无保护子（额外加分）
      if (this.isUnprotectedPiece(board, toX, toY, targetPiece[0], gameState)) {
        score += 200; // 攻击无保护子的额外加分
      }
    }
    
    // 6. 高价值棋子的逃脱移动（优先考虑）
    if (!isInCheck && this.isEscapeMove(board, move, currentPlayer, gameState)) {
      const pieceValue = this.pieceValues[piece[1]];
      // 检查是否是被低价值棋子攻击的高价值棋子
      const isHighValuePiece = pieceValue >= 500; // 车及以上价值的棋子
      const hasLowValueAttacker = this.isAttackedByLowValuePiece(board, fromX, fromY, currentPlayer, gameState);
      
      if (isHighValuePiece && hasLowValueAttacker) {
        score += this.moveOrderingWeights.escape * 3; // 高价值棋子被低价值棋子攻击时的额外加分
      } else if (piece[1] === 'q') {
        score += this.moveOrderingWeights.escape * 2; // 皇后逃脱移动的额外加分
      } else {
        score += this.moveOrderingWeights.escape; // 其他棋子的逃脱移动
      }
    }
    
    // 7. 安全移动（不被对方攻击）
    if (!this.isPieceUnderAttack(tempBoard, toX, toY, currentPlayer, opponentColor, gameState)) {
      score += this.moveOrderingWeights.safety;
    }
    
    // 8. 保护移动（移动后保护其他棋子，但避免用高价值棋子保护王和被低价值棋子攻击的高价值棋子）
    if (this.isProtectionMove(board, move, currentPlayer, gameState)) {
      // 检查是否是保护被低价值棋子攻击的高价值棋子
      const isProtectingHighValueFromLowValue = this.isProtectingHighValueFromLowValue(board, move, currentPlayer, gameState);
      // 检查是否是保护王的移动
      const isProtectingKing = this.isProtectingKingMove(board, move, currentPlayer, gameState);
      
      if (!isProtectingHighValueFromLowValue) {
        if (!isProtectingKing) {
          score += this.moveOrderingWeights.protection;
        } else {
          // 只允许低价值棋子保护王
          const pieceValue = this.pieceValues[piece[1]];
          if (pieceValue <= 350) { // 兵、马视为低价值棋子
            score += this.moveOrderingWeights.protection * 1.5; // 低价值棋子保护王的额外奖励
          } else {
            score -= 200; // 惩罚高价值棋子保护王
          }
        }
      }
    }
    
    // 9. 控制中心
    if ((toX >= 3 && toX <= 4) && (toY >= 3 && toY <= 4)) {
      score += this.moveOrderingWeights.controlCenter;
    }
    
    // 10. 子力发展（将马和象从初始位置移动）
    if ((piece[1] === 'n' && ((piece[0] === 'w' && fromY === 6) || (piece[0] === 'b' && fromY === 1))) ||
        (piece[1] === 'b' && ((piece[0] === 'w' && fromY === 6) || (piece[0] === 'b' && fromY === 1))) ||
        (piece[1] === 'r' && ((piece[0] === 'w' && fromY === 7) || (piece[0] === 'b' && fromY === 0))) ||
        (piece[1] === 'q' && ((piece[0] === 'w' && fromY === 7) || (piece[0] === 'b' && fromY === 0)))) {
      score += this.moveOrderingWeights.development;
    }
    
    // 11. 避免主动送死（惩罚无意义的送子行为）
    if (this.isSuicidalMove(board, move, currentPlayer, gameState)) {
      score -= 500; // 严重惩罚主动送死的行为
    }
    
    return score;
  }
  
  /**
   * 检查是否是保护王的移动
   */
  isProtectingKingMove(board, move, currentPlayer, gameState) {
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    const kingPosition = this.findKingPosition(tempBoard, currentPlayer);
    
    if (kingPosition) {
      const { x, y } = kingPosition;
      return this.hasPieceProtector(tempBoard, x, y, currentPlayer, gameState);
    }
    
    return false;
  }
  
  /**
   * 检查是否是主动送死的移动
   */
  isSuicidalMove(board, move, currentPlayer, gameState) {
    const { fromX, fromY, toX, toY, piece } = move;
    const targetPiece = board[toY][toX];
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 兵的送子行为可以接受（因为兵价值低）
    if (piece[1] === 'p') {
      return false;
    }
    
    // 检查送子后是否可以获得更大的利益
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    const currentScore = this.evaluateBoard(board, currentPlayer, gameState);
    const newScore = this.evaluateBoard(tempBoard, currentPlayer, gameState);
    
    // 如果送子后局面更好，则不视为送死
    if (newScore > currentScore) {
      return false;
    }
    
    // 有目标棋子时，检查是否是以大换小
    if (targetPiece) {
      const attackerValue = this.pieceValues[piece[1]];
      const victimValue = this.pieceValues[targetPiece[1]];
      
      // 以大换小的行为视为送死
      if (attackerValue > victimValue) {
        return true;
      }
    }
    
    // 没有目标棋子时，检查移动后是否会被对方低价值棋子攻击
    if (this.isPieceUnderAttack(tempBoard, toX, toY, currentPlayer, opponentColor, gameState)) {
      const pieceValue = this.pieceValues[piece[1]];
      const attackers = this.findPieceAttackers(tempBoard, toX, toY, currentPlayer, opponentColor, gameState);
      
      for (const attacker of attackers) {
        const attackerValue = this.pieceValues[attacker[1]];
        // 移动后被低价值棋子攻击视为送死
        if (attackerValue < pieceValue) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查棋子是否被低价值棋子攻击
   */
  isAttackedByLowValuePiece(board, x, y, currentPlayer, gameState) {
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    const piece = board[y][x];
    if (!piece) return false;
    
    const pieceValue = this.pieceValues[piece[1]];
    const attackers = this.findPieceAttackers(board, x, y, currentPlayer, opponentColor, gameState);
    
    for (const attacker of attackers) {
      const attackerValue = this.pieceValues[attacker[1]];
      if (attackerValue < pieceValue) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 检查是否是保护被低价值棋子攻击的高价值棋子
   */
  isProtectingHighValueFromLowValue(board, move, currentPlayer, gameState) {
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查移动后是否保护了被低价值棋子攻击的高价值棋子
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = tempBoard[y][x];
        if (piece && piece[0] === currentPlayer) {
          const pieceValue = this.pieceValues[piece[1]];
          if (pieceValue >= 500) { // 车及以上价值的棋子
            // 检查该棋子是否被低价值棋子攻击
            if (this.isAttackedByLowValuePiece(tempBoard, x, y, currentPlayer, gameState)) {
              // 检查是否有保护者
              if (this.hasPieceProtector(tempBoard, x, y, currentPlayer, gameState)) {
                return true;
              }
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查是否是保护皇后的移动
   */
  isProtectingQueenMove(board, move, currentPlayer, gameState) {
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    const queenPosition = this.findQueenPosition(tempBoard, currentPlayer);
    
    if (queenPosition) {
      const { x, y } = queenPosition;
      return this.hasPieceProtector(tempBoard, x, y, currentPlayer, gameState);
    }
    
    return false;
  }
  
  /**
   * 检查棋子是否是无保护的
   */
  isUnprotectedPiece(board, x, y, pieceColor, gameState) {
    // 检查是否有同色棋子能保护该位置
    for (let gy = 0; gy < 8; gy++) {
      for (let gx = 0; gx < 8; gx++) {
        const guardianPiece = board[gy][gx];
        if (guardianPiece && guardianPiece[0] === pieceColor && !(gy === y && gx === x)) {
          const protectMove = {
            fromX: gx,
            fromY: gy,
            toX: x,
            toY: y,
            piece: guardianPiece
          };
          if (this.rules.isValidMove(board, protectMove, pieceColor, gameState)) {
            return false; // 有保护者
          }
        }
      }
    }
    return true; // 无保护者
  }
  
  /**
   * 检查是否是保护移动
   */
  isProtectionMove(board, move, currentPlayer, gameState) {
    const { toX, toY } = move;
    const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
    
    // 检查移动后是否能保护其他己方棋子
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = tempBoard[y][x];
        if (piece && piece[0] === currentPlayer) {
          // 检查该棋子是否现在受到保护
          if (this.hasPieceProtector(tempBoard, x, y, currentPlayer, gameState)) {
            // 检查移动前该棋子是否没有受到保护
            if (!this.hasPieceProtector(board, x, y, currentPlayer, gameState)) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查是否是逃脱移动
   */
  isEscapeMove(board, move, currentPlayer, gameState) {
    const { fromX, fromY, piece } = move;
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查移动前棋子是否被攻击
    if (this.isPieceUnderAttack(board, fromX, fromY, currentPlayer, opponentColor, gameState)) {
      // 检查移动后棋子是否不再被攻击
      const tempBoard = this.makeMove(board, move, currentPlayer, gameState);
      if (!this.isPieceUnderAttack(tempBoard, move.toX, move.toY, currentPlayer, opponentColor, gameState)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 保存学习数据
   */
  saveLearningData() {
    localStorage.setItem('chessAILearning', JSON.stringify(this.learningData));
  }
  
  /**
   * 重置学习数据
   */
  resetLearningData() {
    this.learningData = {
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
    
    this.saveLearningData();
  }
  
  /**
   * 获取学习进度
   */
  getLearningProgress() {
    return {
      totalGames: this.learningData.totalGames,
      winRate: this.learningData.totalGames > 0 ? this.learningData.wins / this.learningData.totalGames : 0,
      openingProgress: this.learningData.openingPatterns,
      middleProgress: this.learningData.middleTactics,
      endgameProgress: this.learningData.endgameSkills,
      defensiveProgress: this.learningData.defensiveStrategies,
      attackingProgress: this.learningData.attackingStrategies
    };
  }
  
  /**
   * AI选择升变棋子
   * @param {Array} board 当前棋盘状态
   * @param {Object} move 移动信息
   * @return {String} 选择的升变棋子类型
   */
  choosePromotionPiece(board, move) {
    const { toY, toX, piece } = move;
    const playerColor = piece[0];
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    
    // 评估所有可能的升变选项
    const promotionOptions = ['q', 'r', 'b', 'n'];
    let bestOption = 'q'; // 默认升变为后
    let bestScore = -Infinity;
    
    for (const option of promotionOptions) {
      try {
        // 创建临时棋盘，模拟升变
        const tempBoard = this.rules.cloneBoard(board);
        tempBoard[toY][toX] = playerColor + option;
        tempBoard[move.fromY][move.fromX] = '';
        
        // 评估升变后的棋盘状态
        let score = this.evaluateBoard(tempBoard, playerColor, {});
        
        // 检查是否避免了逼和
        if (option !== 'q' && this.rules.isStalemate(tempBoard, opponentColor, {})) {
          // 避免逼和，给予额外加分
          score += 10;
        }
        
        // 检查是否避免了被将军
        if (!this.rules.isInCheck(tempBoard, playerColor)) {
          score += 5;
        }
        
        // 检查是否能一步将死对方
        if (this.rules.isCheckmated(tempBoard, opponentColor, {})) {
          // 能一步将死，给予最高加分
          score += 100;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestOption = option;
        }
      } catch (error) {
        // 捕获错误，避免游戏崩溃
        console.error('升变评估错误:', error);
      }
    }
    
    return bestOption;
  }
}