/**
 * Stockfish AI模块
 * 使用Stockfish国际象棋引擎作为AI
 */

/**
 * 生成指定范围的随机整数
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @returns {number} 随机整数
 */
function getRandomInt(min, max) {
  // 先处理边界：确保min ≤ max
  min = Math.ceil(min); // 向上取整，避免小数干扰
  max = Math.floor(max); // 向下取整
  // 核心公式：Math.floor 向下取整，保证结果是整数
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class StockfishAI {
  constructor() {
    this.stockfish = null;
    this.difficulty = 'medium';
    this.ready = false;
    this.moveCallback = null;
    this.initStockfish();
  }

  /**
   * 初始化Stockfish引擎
   */
  initStockfish() {
    try {
      // 检查是否在本地文件系统中运行
      if (window.location.protocol === 'file:') {
        console.warn('在本地文件系统中运行，无法使用Web Worker。请通过HTTP服务器运行游戏，或使用模拟Stockfish引擎。');
        console.warn('解决方案：1. 使用本地HTTP服务器运行游戏；2. 或使用浏览器的安全策略例外。');
        // 在本地文件系统中运行时使用模拟实现
        this.initMockStockfish();
        return;
      }
      
      // 创建Stockfish引擎实例
      // 使用单文件轻量版本的Stockfish引擎
      this.stockfish = new Worker('./stockfish-17.1-lite-single-03e3232.js');
      
      // 设置消息处理函数
      this.stockfish.onmessage = (event) => {
        this.handleStockfishResponse(event.data);
      };
      
      // 设置错误处理函数
      this.stockfish.onerror = (error) => {
        console.error('Stockfish引擎错误:', error);
        this.ready = false;
      };
      
      // 设置Stockfish引擎
      this.configureStockfish();
      
      console.log('Stockfish引擎初始化成功！');
    } catch (error) {
      console.error('Stockfish引擎初始化失败:', error);
      console.warn('提示：要使用真实的Stockfish引擎，请通过HTTP服务器运行游戏，而不是直接打开HTML文件。');
      console.warn('您可以使用Python的内置服务器：python -m http.server 8000');
      // 初始化失败时使用模拟实现
      this.initMockStockfish();
    }
  }
  
  /**
   * 初始化模拟Stockfish引擎（当真实引擎加载失败时使用）
   */
  initMockStockfish() {
    console.log('使用模拟Stockfish引擎');
    
    // 创建模拟Stockfish引擎实例
    this.stockfish = {
      postMessage: (message) => {
        console.log('Stockfish message:', message);
        // 模拟Stockfish的响应
        setTimeout(() => {
          this.handleStockfishResponse('ready');
        }, 100);
      },
      terminate: () => {
        console.log('模拟Stockfish引擎终止');
      }
    };
    
    // 设置Stockfish引擎
    this.configureStockfish();
  }

  /**
   * 配置Stockfish引擎
   */
  configureStockfish() {
    if (!this.stockfish) return;
    
    // 根据难度设置Stockfish引擎
    switch (this.difficulty) {
      case 'level1':
        // 等级1：非常简单
        this.stockfish.postMessage('setoption name Skill Level value 0');
        break;
      case 'level2':
        // 等级2：简单
        this.stockfish.postMessage('setoption name Skill Level value 3');
        break;
      case 'level3':
        // 等级3：较简单
        this.stockfish.postMessage('setoption name Skill Level value 6');
        break;
      case 'level4':
        // 等级4：中等
        this.stockfish.postMessage('setoption name Skill Level value 9');
        break;
      case 'level5':
        // 等级5：较困难
        this.stockfish.postMessage('setoption name Skill Level value 12');
        break;
      case 'level6':
        // 等级6：困难
        this.stockfish.postMessage('setoption name Skill Level value 15');
        break;
      case 'level7':
        // 等级7：非常困难
        this.stockfish.postMessage('setoption name Skill Level value 18');
        break;
      case 'level8':
        // 等级8：专家级别
        this.stockfish.postMessage('setoption name Skill Level value 20');
        break;
    }
    
    console.log('Stockfish引擎配置完成，难度:', this.difficulty);
  }

  /**
   * 根据难度设置获取思考时间
   */
  getTimeLimit() {
    switch (this.difficulty) {
      case 'level1':
        return 1000; // 1秒
      case 'level2':
        return 1500; // 1.5秒
      case 'level3':
        return 2000; // 2秒
      case 'level4':
        return 2500; // 2.5秒
      case 'level5':
        return 3000; // 3秒
      case 'level6':
        return 3500; // 3.5秒
      case 'level7':
        return 4500; // 4.5秒
      case 'level8':
        return 6000; // 6秒
      default:
        return 2500;
    }
  }
  
  /**
   * 根据难度设置获取搜索深度限制
   */
  getDepthLimit() {
    switch (this.difficulty) {
      case 'level1':
        return getRandomInt(2, 3); // 等级1：非常浅的搜索
      case 'level2':
        return getRandomInt(3, 4); // 等级2：较浅的搜索
      case 'level3':
        return getRandomInt(4, 5); // 等级3：浅度搜索
      case 'level4':
        return getRandomInt(5, 6); // 等级4：中等搜索
      case 'level5':
        return getRandomInt(6, 8); // 等级5：较深搜索
      case 'level6':
        return getRandomInt(8, 10); // 等级6：深度搜索
      case 'level7':
        return getRandomInt(10, 12); // 等级7：非常深的搜索
      case 'level8':
        return null; // 等级8：不限制搜索深度
      default:
        return null;
    }
  }

  /**
   * 处理Stockfish引擎的响应
   */
  handleStockfishResponse(response) {
    console.log('Stockfish响应:', response);
    
    if (response === 'readyok') {
      this.ready = true;
    } else if (response.startsWith('bestmove')) {
      // 解析最佳移动
      const parts = response.split(' ');
      const bestMove = parts[1];
      
      // 调用回调函数返回移动
      if (this.moveCallback) {
        this.moveCallback(bestMove);
        this.moveCallback = null;
      }
    } else if (response.startsWith('info')) {
      // 处理引擎信息（可以忽略）
    }
  }

  /**
   * 设置AI难度
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.configureStockfish();
  }

  /**
   * 将棋盘状态转换为FEN表示
   */
  boardToFEN(board, currentPlayer, gameState) {
    let fen = '';
    
    // 棋盘部分
    for (let y = 0; y < 8; y++) {
      let emptyCount = 0;
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece === '') {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          // 转换棋子表示
          const pieceSymbol = {
            'wp': 'P',
            'wn': 'N',
            'wb': 'B',
            'wr': 'R',
            'wq': 'Q',
            'wk': 'K',
            'bp': 'p',
            'bn': 'n',
            'bb': 'b',
            'br': 'r',
            'bq': 'q',
            'bk': 'k'
          }[piece];
          fen += pieceSymbol;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (y < 7) {
        fen += '/';
      }
    }
    
    // 当前玩家
    fen += ' ' + (currentPlayer === 'w' ? 'w' : 'b');
    
    // 王车易位权利
    let castlingRights = '';
    if (!gameState.whiteKingMoved && !gameState.whiteKRookMoved) castlingRights += 'K';
    if (!gameState.whiteKingMoved && !gameState.whiteQRookMoved) castlingRights += 'Q';
    if (!gameState.blackKingMoved && !gameState.blackKRookMoved) castlingRights += 'k';
    if (!gameState.blackKingMoved && !gameState.blackQRookMoved) castlingRights += 'q';
    if (castlingRights === '') castlingRights = '-';
    fen += ' ' + castlingRights;
    
    // 吃过路兵目标位置
    fen += ' -';
    
    // 半回合计数和完整回合计数
    fen += ' ' + gameState.halfMoves + ' ' + gameState.fullMoves;
    
    return fen;
  }

  /**
   * 将Stockfish移动转换为内部移动格式
   */
  stockfishMoveToInternalMove(move, board, currentPlayer) {
    // 解析Stockfish移动格式（例如：e2e4）
    const fromSquare = move.substring(0, 2);
    const toSquare = move.substring(2, 4);
    const promotionPiece = move.length > 4 ? move[4].toLowerCase() : null;
    
    // 转换为坐标
    const fromX = fromSquare.charCodeAt(0) - 97;
    const fromY = 8 - parseInt(fromSquare[1]);
    const toX = toSquare.charCodeAt(0) - 97;
    const toY = 8 - parseInt(toSquare[1]);
    
    // 获取移动的棋子
    const piece = board[fromY][fromX];
    
    // 创建移动对象
    const internalMove = {
      fromX,
      fromY,
      toX,
      toY,
      piece,
      promotionPiece
    };
    
    return internalMove;
  }

  /**
   * 获取AI的下一步移动
   */
  getMove(board, currentPlayer, gameState) {
    return new Promise((resolve) => {
      // 显示AI正在思考的提示
      this.showThinking(true);
      
      try {
        // 转换棋盘状态为FEN
        const fen = this.boardToFEN(board, currentPlayer, gameState);
        console.log('发送给Stockfish的FEN:', fen);
        
        // 发送位置信息给Stockfish
        this.stockfish.postMessage(`position fen ${fen}`);
        
        // 根据难度设置分析参数
        const timeLimit = this.getTimeLimit();
        const depthLimit = this.getDepthLimit();
        
        if (depthLimit !== null) {
          // 简单和中等难度：使用深度限制
          console.log('Stockfish搜索深度:', depthLimit);
          this.stockfish.postMessage(`go depth ${depthLimit}`);
        } else {
          // 困难难度：使用时间限制
          console.log('Stockfish思考时间:', timeLimit, 'ms');
          this.stockfish.postMessage(`go movetime ${timeLimit}`);
        }
        
        // 设置移动回调函数
        this.moveCallback = (bestMove) => {
          try {
            // 隐藏AI正在思考的提示
            this.showThinking(false);
            
            console.log('Stockfish推荐移动:', bestMove);
            
            // 将Stockfish移动转换为内部移动格式
            const internalMove = this.stockfishMoveToInternalMove(bestMove, board, currentPlayer);
            console.log('转换后的内部移动:', internalMove);
            
            resolve(internalMove);
          } catch (error) {
            console.error('处理Stockfish移动时出错:', error);
            // 出错时使用模拟移动
            const mockMove = this.getMockMove(board, currentPlayer, gameState);
            this.showThinking(false);
            resolve(mockMove);
          }
        };
        
        // 设置超时处理
        setTimeout(() => {
          if (this.moveCallback) {
            console.error('Stockfish思考超时');
            // 超时后使用模拟移动
            const mockMove = this.getMockMove(board, currentPlayer, gameState);
            this.showThinking(false);
            this.moveCallback = null;
            resolve(mockMove);
          }
        }, timeLimit + 2000); // 超时时间为思考时间 + 2秒
      } catch (error) {
        console.error('获取Stockfish移动时出错:', error);
        // 出错时使用模拟移动
        const mockMove = this.getMockMove(board, currentPlayer, gameState);
        this.showThinking(false);
        resolve(mockMove);
      }
    });
  }

  /**
   * 获取模拟移动（用于测试）
   */
  getMockMove(board, currentPlayer, gameState) {
    // 简单的模拟实现，随机选择一个合法移动
    const rules = new ChessRules();
    const validMoves = rules.getAllValidMoves(board, currentPlayer, gameState);
    
    if (validMoves.length === 0) {
      return null;
    }
    
    // 随机选择一个移动
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
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
}
