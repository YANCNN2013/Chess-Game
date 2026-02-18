/**
 * 国际象棋游戏主逻辑模块
 * 负责初始化游戏、处理用户交互和协调各个模块
 */

class ChessGame {
  constructor() {
    this.board = this.initializeBoard();
    this.currentPlayer = 'w'; // 'w' 表示白方，'b' 表示黑方
    this.selectedPiece = null;
    this.selectedPosition = null;
    this.validMoves = [];
    this.gameOver = false;
    this.gameResult = null; // 'win', 'loss', 'draw'
    this.movesList = [];
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.gameStateHistory = []; // 用于悔棋的游戏状态历史记录
    
    // 游戏状态
    this.gameState = {
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteKRookMoved: false,
      whiteQRookMoved: false,
      blackKRookMoved: false,
      blackQRookMoved: false,
      halfMoves: 0, // 用于五十步规则
      fullMoves: 1, // 当前完整回合数
      lastMove: null,
      positionHistory: []
    };
    
    // 初始化模块
    this.rules = new ChessRules();
    this.ai = new ChessAI();
    this.storage = new ChessStorage();
    this.userSystem = new UserSystem();
    
    // Stockfish AI相关属性
    this.stockfishAI = null;
    this.useStockfishAI = false;
    
    // 初始化应用
    this.initApp();
  }
  
  /**
   * 初始化应用
   */
  async initApp() {
    await userSystem.initDB();
    await this.userSystem.initDB();
    
    // 加载设置
    await this.loadSettings();
    
    // 从localStorage读取AI难度
    const selectedDifficulty = localStorage.getItem('selectedAIDifficulty');
    if (selectedDifficulty) {
      this.ai.difficulty = selectedDifficulty;
    }
    
    // 初始化界面
    this.initializeUI();
    
    // 保存初始状态到历史记录
    this.saveStateToHistory();
    
    // 尝试加载保存的游戏
    this.tryLoadSavedGame();
    
    // 尝试加载Stockfish AI
    this.loadStockfishAI();
  }
  
  /**
   * 加载Stockfish AI
   */
  loadStockfishAI() {
    // 重置Stockfish AI状态
    this.stockfishAI = null;
    this.useStockfishAI = false;
    
    // 检查是否支持Web Workers
    if (typeof Worker !== 'undefined') {
      try {
        // 这里可以加载真实的Stockfish引擎
        // 例如：this.stockfishWorker = new Worker('js/stockfish.js');
        console.log('Stockfish AI 加载中...');
        
        // 初始化Stockfish AI
        this.stockfishAI = new StockfishAI();
        console.log('Stockfish AI 加载成功！');
        
        // 设置AI为Stockfish
        this.useStockfishAI = true;
        
        // 同步难度设置
        if (this.ai) {
          this.stockfishAI.setDifficulty(this.ai.difficulty);
        }
      } catch (error) {
        console.error('Stockfish AI 加载失败:', error);
        this.stockfishAI = null;
        this.useStockfishAI = false;
      }
    } else {
      console.warn('浏览器不支持Web Workers，无法使用Stockfish AI');
      this.stockfishAI = null;
      this.useStockfishAI = false;
    }
  }
  
  /**
   * 初始化棋盘
   * @return {Array} 初始化的棋盘
   */
  initializeBoard() {
    // 创建空棋盘
    const board = Array(8).fill().map(() => Array(8).fill(''));
    
    // 设置初始布局
    // 黑方后排
    board[0][0] = 'br'; // 黑车
    board[0][1] = 'bn'; // 黑马
    board[0][2] = 'bb'; // 黑象
    board[0][3] = 'bq'; // 黑后
    board[0][4] = 'bk'; // 黑王
    board[0][5] = 'bb'; // 黑象
    board[0][6] = 'bn'; // 黑马
    board[0][7] = 'br'; // 黑车
    
    // 黑方兵
    for (let i = 0; i < 8; i++) {
      board[1][i] = 'bp';
    }
    
    // 白方兵
    for (let i = 0; i < 8; i++) {
      board[6][i] = 'wp';
    }
    
    // 白方后排
    board[7][0] = 'wr'; // 白车
    board[7][1] = 'wn'; // 白马
    board[7][2] = 'wb'; // 白象
    board[7][3] = 'wq'; // 白后
    board[7][4] = 'wk'; // 白王
    board[7][5] = 'wb'; // 白象
    board[7][6] = 'wn'; // 白马
    board[7][7] = 'wr'; // 白车
    
    return board;
  }
  
  /**
   * 初始化用户界面
   */
  initializeUI() {
    // 创建棋盘
    this.createChessBoard();
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 更新游戏信息
    this.updateGameInfo();
    
    // 更新AI设置
    this.updateAISettings();
  }
  
  /**
   * 创建棋盘UI
   */
  createChessBoard() {
    const chessBoard = document.getElementById('chess-board');
    chessBoard.innerHTML = '';
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const square = document.createElement('div');
        square.classList.add('chess-square');
        
        // 交替颜色
        if ((x + y) % 2 === 0) {
          square.classList.add('bg-secondary');
        } else {
          square.classList.add('bg-primary');
        }
        
        // 设置坐标属性
        square.setAttribute('data-x', x);
        square.setAttribute('data-y', y);
        
        // 添加棋子（如果有）
        const piece = this.board[y][x];
        if (piece) {
          this.addPieceToSquare(square, piece);
        }
        
        chessBoard.appendChild(square);
      }
    }
  }
  
  /**
   * 向方格添加棋子
   * @param {HTMLElement} square 方格元素
   * @param {String} piece 棋子标识符
   */
  addPieceToSquare(square, piece) {
    const pieceElement = document.createElement('div');
    pieceElement.classList.add('chess-piece');
    
    // 根据棋子类型和颜色设置图像
    const pieceType = piece[1];
    const pieceColor = piece[0];
    
    // 使用新的棋子图片链接
    const pieceImages = {
      'wk': 'https://lichess1.org/assets/hashed/wK.bc7274dd.svg',
      'wq': 'https://lichess1.org/assets/hashed/wQ.79c9227e.svg',
      'wr': 'https://lichess1.org/assets/hashed/wR.e9e95adc.svg',
      'wb': 'https://lichess1.org/assets/hashed/wB.b7d1a118.svg',
      'wn': 'https://lichess1.org/assets/hashed/wN.68b788d7.svg',
      'wp': 'https://lichess1.org/assets/hashed/wP.0596b7ce.svg',
      'bk': 'https://lichess1.org/assets/hashed/bK.c5f22c23.svg',
      'bq': 'https://lichess1.org/assets/hashed/bQ.5abdb5aa.svg',
      'br': 'https://lichess1.org/assets/hashed/bR.c33a3d54.svg',
      'bb': 'https://lichess1.org/assets/hashed/bB.77e9debf.svg',
      'bn': 'https://lichess1.org/assets/hashed/bN.d0665564.svg',
      'bp': 'https://lichess1.org/assets/hashed/bP.09539f32.svg'
    };
    
    pieceElement.style.backgroundImage = `url('${pieceImages[piece]}')`;
    pieceElement.style.backgroundPosition = 'center';
    pieceElement.style.backgroundSize = 'contain';
    
    // 设置棋子属性
    pieceElement.setAttribute('data-piece', piece);
    
    square.appendChild(pieceElement);
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 棋盘点击事件
    document.getElementById('chess-board').addEventListener('click', (e) => {
      this.handleSquareClick(e);
    });
    
    // 新游戏按钮
    document.getElementById('new-game').addEventListener('click', () => {
      this.startNewGame();
    });
    
    // 悔棋按钮
    document.getElementById('undo').addEventListener('click', () => {
      this.undoMove();
      this.undoMove();
    });
    
    // 重新开始按钮
    document.getElementById('restart').addEventListener('click', () => {
      this.restartGame();
    });
    
    // 保存游戏按钮
    document.getElementById('save-game').addEventListener('click', () => {
      this.saveGame();
    });
    
    // 认输按钮
    document.getElementById('resign').addEventListener('click', () => {
      this.resignGame();
    });
    
    // AI学习模式切换
    document.getElementById('ai-learning').addEventListener('change', (e) => {
      this.toggleAILearning(e.target.checked);
    });
    
    // 关闭游戏结果模态框
    document.getElementById('close-modal').addEventListener('click', () => {
      this.hideGameResultModal();
    });
    
    document.getElementById('new-game-modal').addEventListener('click', () => {
      this.hideGameResultModal();
      this.startNewGame();
    });
  }
  
  /**
   * 处理方格点击事件
   * @param {Event} e 点击事件
   */
  handleSquareClick(e) {
    // 如果游戏结束或当前是AI回合，不处理点击
    if (this.gameOver || this.currentPlayer === 'b') {
      return;
    }
    
    const square = e.target.closest('.chess-square');
    if (!square) return;
    
    const x = parseInt(square.getAttribute('data-x'));
    const y = parseInt(square.getAttribute('data-y'));
    
    // 如果点击的是已选中的棋子，取消选择
    if (this.selectedPiece && this.selectedPosition.x === x && this.selectedPosition.y === y) {
      this.deselectPiece();
      return;
    }
    
    // 如果点击的是当前玩家的棋子，选择它
    const piece = this.board[y][x];
    if (piece && piece[0] === this.currentPlayer) {
      this.selectPiece(x, y, piece);
      return;
    }
    
    // 如果已经选择了棋子，尝试移动
    if (this.selectedPiece) {
      this.tryMove(this.selectedPosition.x, this.selectedPosition.y, x, y);
    }
  }
  
  /**
   * 选择棋子
   * @param {Number} x X坐标
   * @param {Number} y Y坐标
   * @param {String} piece 棋子标识符
   */
  selectPiece(x, y, piece) {
    // 取消之前的选择
    this.deselectPiece();
    
    // 设置新的选择
    this.selectedPiece = piece;
    this.selectedPosition = { x, y };
    
    // 高亮选中的棋子
    const pieceElement = document.querySelector(`.chess-square[data-x="${x}"][data-y="${y}"] .chess-piece`);
    if (pieceElement) {
      pieceElement.classList.add('selected');
    }
    
    // 显示有效移动
    this.showValidMoves(x, y, piece);
  }
  
  /**
   * 取消选择棋子
   */
  deselectPiece() {
    if (this.selectedPiece) {
      // 移除高亮
      const pieceElement = document.querySelector('.chess-piece.selected');
      if (pieceElement) {
        pieceElement.classList.remove('selected');
      }
      
      // 清除有效移动标记
      this.clearValidMoves();
      
      this.selectedPiece = null;
      this.selectedPosition = null;
      this.validMoves = [];
    }
  }
  
  /**
   * 显示有效移动
   * @param {Number} x 起始X坐标
   * @param {Number} y 起始Y坐标
   * @param {String} piece 棋子标识符
   */
  showValidMoves(x, y, piece) {
    // 获取所有有效移动
    this.validMoves = this.rules.getAllValidMoves(this.board, this.currentPlayer, this.gameState);
    
    // 过滤出当前选中棋子的有效移动
    const pieceValidMoves = this.validMoves.filter(move => move.fromX === x && move.fromY === y);
    
    // 显示有效移动标记
    pieceValidMoves.forEach(move => {
      const square = document.querySelector(`.chess-square[data-x="${move.toX}"][data-y="${move.toY}"]`);
      if (square) {
        const validMoveMarker = document.createElement('div');
        validMoveMarker.classList.add('valid-move');
        validMoveMarker.setAttribute('data-x', move.toX);
        validMoveMarker.setAttribute('data-y', move.toY);
        square.appendChild(validMoveMarker);
      }
    });
  }
  
  /**
   * 清除有效移动标记
   */
  clearValidMoves() {
    const validMoveMarkers = document.querySelectorAll('.valid-move');
    validMoveMarkers.forEach(marker => marker.remove());
  }
  
  /**
   * 尝试移动棋子
   * @param {Number} fromX 起始X坐标
   * @param {Number} fromY 起始Y坐标
   * @param {Number} toX 目标X坐标
   * @param {Number} toY 目标Y坐标
   */
  async tryMove(fromX, fromY, toX, toY) {
    // 检查是否是有效移动
    const move = this.validMoves.find(m => m.fromX === fromX && m.fromY === fromY && m.toX === toX && m.toY === toY);
    
    if (!move) {
      // 显示无效移动提示
      this.showInvalidMoveToast();
      return;
    }
    
    // 执行移动（等待异步操作完成）
    await this.executeMove(move);
    
    // 记录移动
    this.recordMove(move);
    
    // 检查游戏状态
    await this.checkGameState();
    
    // 如果游戏未结束，切换玩家
    if (!this.gameOver) {
      this.switchPlayer();
      
      // 如果是AI回合，让AI移动
      if (this.currentPlayer === 'b') {
        await this.makeAIMove();
      }
    }
  }
  
  /**
   * 保存当前状态到历史记录
   */
  saveStateToHistory() {
    // 保存当前游戏状态的深拷贝
    this.gameStateHistory.push({
      board: this.rules.cloneBoard(this.board),
      currentPlayer: this.currentPlayer,
      gameState: JSON.parse(JSON.stringify(this.gameState)),
      movesList: [...this.movesList]
    });
    
    // 限制历史记录长度，防止内存占用过大
    if (this.gameStateHistory.length > 50) {
      this.gameStateHistory.shift();
    }
  }
  
  /**
   * 执行移动
   * @param {Object} move 移动信息
   */
  async executeMove(move) {
    // 保存移动前的状态到历史记录
    this.saveStateToHistory();
    
    const { fromX, fromY, toX, toY, piece } = move;
    
    // 记录被吃的棋子
    const capturedPiece = this.board[toY][toX];
    
    // 检查是否是王车易位
    if (this.rules.isCastlingMove(this.board, move, this.currentPlayer, this.gameState)) {
      // 执行王车易位的动画
      await this.animateCastling(fromX, fromY, toX, toY, piece);
      this.board = this.rules.executeCastling(this.board, move);
    }
    // 检查是否是吃过路兵
    else if (piece[1] === 'p' && Math.abs(toX - fromX) === 1 && this.board[toY][toX] === '') {
      // 执行棋子移动的动画
      await this.animateMove(fromX, fromY, toX, toY, piece);
      const direction = this.currentPlayer === 'w' ? -1 : 1;
      if (toY === fromY + direction) {
        const adjacentPiece = this.board[fromY][toX];
        if (adjacentPiece && adjacentPiece === (this.currentPlayer === 'w' ? 'bp' : 'wp')) {
          this.board = this.rules.executeEnPassant(this.board, move);
        } else {
          // 普通斜向移动（吃子）
          this.board[toY][toX] = piece;
          this.board[fromY][fromX] = '';
        }
      } else {
        // 普通斜向移动（吃子）
        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = '';
      }
    } else {
      // 执行棋子移动的动画
      await this.animateMove(fromX, fromY, toX, toY, piece);
      // 普通移动
      this.board[toY][toX] = piece;
      this.board[fromY][fromX] = '';
    }
    
    // 检查兵的升变
    if (this.rules.canPromote(this.board, move)) {
      // 如果是白方（玩家），显示升变选择提示
      if (this.currentPlayer === 'w') {
        const promotionPiece = await this.showPromotionPrompt();
        this.board = this.rules.promotePawn(this.board, move, promotionPiece);
        move.promotionPiece = promotionPiece;
      } else {
        // 如果是黑方（AI），让AI选择升变棋子
        const promotionPiece = this.ai.choosePromotionPiece(this.board, move);
        this.board = this.rules.promotePawn(this.board, move, promotionPiece);
        move.promotionPiece = promotionPiece;
      }
    }
    
    // 更新游戏状态
    this.updateGameState(move, capturedPiece);
    
    // 更新棋盘UI
    this.updateBoardUI();
    
    // 高亮最后移动
    this.highlightLastMove(fromX, fromY, toX, toY);
    
    // 如果有棋子被吃，更新吃子记录
    if (capturedPiece) {
      this.updateCapturedPieces(capturedPiece);
    }
  }
  
  /**
   * 显示棋子移动的动画
   * @param {Number} fromX 起始X坐标
   * @param {Number} fromY 起始Y坐标
   * @param {Number} toX 目标X坐标
   * @param {Number} toY 目标Y坐标
   * @param {String} piece 棋子标识符
   * @return {Promise} 动画完成的Promise
   */
  animateMove(fromX, fromY, toX, toY, piece) {
    return new Promise((resolve) => {
      // 获取棋盘元素
      const board = document.getElementById('chess-board');
      
      // 确保棋盘有相对定位
      if (getComputedStyle(board).position === 'static') {
        board.style.position = 'relative';
      }
      
      // 获取所有方格
      const squares = board.querySelectorAll('.chess-square');
      let fromSquare = null;
      let toSquare = null;
      
      // 遍历所有方格，找到正确的起始和目标方格
      squares.forEach((square) => {
        const squareX = parseInt(square.getAttribute('data-x'));
        const squareY = parseInt(square.getAttribute('data-y'));
        
        if (squareX === fromX && squareY === fromY) {
          fromSquare = square;
        }
        if (squareX === toX && squareY === toY) {
          toSquare = square;
        }
      });
      
      if (!fromSquare || !toSquare) {
        console.error('找不到起始或目标方格:', { fromX, fromY, toX, toY });
        resolve();
        return;
      }
      
      // 获取起始和目标方格的位置信息（相对于棋盘）
      const fromRect = fromSquare.getBoundingClientRect();
      const toRect = toSquare.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      
      // 计算相对于棋盘的位置
      const fromLeft = fromRect.left - boardRect.left;
      const fromTop = fromRect.top - boardRect.top;
      const toLeft = toRect.left - boardRect.left;
      const toTop = toRect.top - boardRect.top;
      
      // 创建动画棋子元素
      const animatedPiece = document.createElement('div');
      
      // 设置棋子图片
      const pieceImages = {
        'wk': 'https://lichess1.org/assets/hashed/wK.bc7274dd.svg',
        'wq': 'https://lichess1.org/assets/hashed/wQ.79c9227e.svg',
        'wr': 'https://lichess1.org/assets/hashed/wR.e9e95adc.svg',
        'wb': 'https://lichess1.org/assets/hashed/wB.b7d1a118.svg',
        'wn': 'https://lichess1.org/assets/hashed/wN.68b788d7.svg',
        'wp': 'https://lichess1.org/assets/hashed/wP.0596b7ce.svg',
        'bk': 'https://lichess1.org/assets/hashed/bK.c5f22c23.svg',
        'bq': 'https://lichess1.org/assets/hashed/bQ.5abdb5aa.svg',
        'br': 'https://lichess1.org/assets/hashed/bR.c33a3d54.svg',
        'bb': 'https://lichess1.org/assets/hashed/bB.77e9debf.svg',
        'bn': 'https://lichess1.org/assets/hashed/bN.d0665564.svg',
        'bp': 'https://lichess1.org/assets/hashed/bP.09539f32.svg'
      };
      
      // 设置动画棋子的样式
      animatedPiece.style.position = 'absolute';
      animatedPiece.style.width = `${fromRect.width}px`;
      animatedPiece.style.height = `${fromRect.height}px`;
      animatedPiece.style.backgroundImage = `url('${pieceImages[piece]}')`;
      animatedPiece.style.backgroundPosition = 'center';
      animatedPiece.style.backgroundSize = 'contain';
      animatedPiece.style.backgroundRepeat = 'no-repeat';
      animatedPiece.style.left = `${fromLeft}px`;
      animatedPiece.style.top = `${fromTop}px`;
      animatedPiece.style.transition = 'left 0.5s ease, top 0.5s ease';
      animatedPiece.style.zIndex = '100';
      animatedPiece.style.pointerEvents = 'none';
      
      // 添加动画棋子到棋盘
      board.appendChild(animatedPiece);
      
      // 隐藏起始方格中的原始棋子
      const originalPiece = fromSquare.querySelector('.chess-piece');
      if (originalPiece) {
        originalPiece.style.opacity = '0';
      }
      
      // 隐藏目标方格中的被吃棋子（如果有）
      const capturedPieceElement = toSquare.querySelector('.chess-piece');
      if (capturedPieceElement) {
        capturedPieceElement.style.opacity = '0';
      }
      
      // 播放棋子落下的音效
      this.playChessSound();
      
      // 触发重排，确保动画能够正常开始
      void animatedPiece.offsetWidth;
      
      // 设置动画棋子的目标位置
      animatedPiece.style.left = `${toLeft}px`;
      animatedPiece.style.top = `${toTop}px`;
      
      // 动画完成后清理
      setTimeout(() => {
        // 移除动画棋子
        if (animatedPiece.parentNode) {
          animatedPiece.parentNode.removeChild(animatedPiece);
        }
        
        // 恢复原始棋子的可见性
        if (originalPiece) {
          originalPiece.style.opacity = '1';
        }
        
        // 恢复被吃棋子的可见性（如果有）
        if (capturedPieceElement) {
          capturedPieceElement.style.opacity = '1';
        }
        
        resolve();
      }, 500);
    });
  }
  
  /**
   * 播放棋子落下的音效
   */
  playChessSound() {
    // 创建音频元素并播放音效
    const audio = new Audio('chess.mp3');
    audio.volume = 0.5; // 设置音量为50%
    audio.play().catch(error => {
      console.error('无法播放音效:', error);
    });
  }
  
  /**
   * 显示王车易位的动画
   * @param {Number} fromX 国王起始X坐标
   * @param {Number} fromY 国王起始Y坐标
   * @param {Number} toX 国王目标X坐标
   * @param {Number} toY 国王目标Y坐标
   * @param {String} piece 国王棋子标识符
   * @return {Promise} 动画完成的Promise
   */
  animateCastling(fromX, fromY, toX, toY, piece) {
    return new Promise((resolve) => {
      // 获取棋盘元素
      const board = document.getElementById('chess-board');
      
      // 确保棋盘有相对定位
      if (getComputedStyle(board).position === 'static') {
        board.style.position = 'relative';
      }
      
      // 确定是王翼易位还是后翼易位
      const isKingside = toX > fromX;
      const rookFromX = isKingside ? 7 : 0;
      const rookToX = isKingside ? toX - 1 : toX + 1;
      
      // 获取国王和车的起始和目标方格
      const squares = board.querySelectorAll('.chess-square');
      let kingFromSquare = null;
      let kingToSquare = null;
      let rookFromSquare = null;
      let rookToSquare = null;
      
      // 遍历所有方格，找到正确的方格
      squares.forEach((square) => {
        const squareX = parseInt(square.getAttribute('data-x'));
        const squareY = parseInt(square.getAttribute('data-y'));
        
        if (squareX === fromX && squareY === fromY) {
          kingFromSquare = square;
        }
        if (squareX === toX && squareY === toY) {
          kingToSquare = square;
        }
        if (squareX === rookFromX && squareY === fromY) {
          rookFromSquare = square;
        }
        if (squareX === rookToX && squareY === fromY) {
          rookToSquare = square;
        }
      });
      
      if (!kingFromSquare || !kingToSquare || !rookFromSquare || !rookToSquare) {
        console.error('找不到王车易位的方格:', { fromX, fromY, toX, toY, rookFromX, rookToX });
        resolve();
        return;
      }
      
      // 获取方格的位置信息（相对于棋盘）
      const kingFromRect = kingFromSquare.getBoundingClientRect();
      const kingToRect = kingToSquare.getBoundingClientRect();
      const rookFromRect = rookFromSquare.getBoundingClientRect();
      const rookToRect = rookToSquare.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      
      // 计算相对于棋盘的位置
      const kingFromLeft = kingFromRect.left - boardRect.left;
      const kingFromTop = kingFromRect.top - boardRect.top;
      const kingToLeft = kingToRect.left - boardRect.left;
      const kingToTop = kingToRect.top - boardRect.top;
      const rookFromLeft = rookFromRect.left - boardRect.left;
      const rookFromTop = rookFromRect.top - boardRect.top;
      const rookToLeft = rookToRect.left - boardRect.left;
      const rookToTop = rookToRect.top - boardRect.top;
      
      // 创建国王动画元素
      const kingAnimatedPiece = document.createElement('div');
      kingAnimatedPiece.style.position = 'absolute';
      kingAnimatedPiece.style.width = `${kingFromRect.width}px`;
      kingAnimatedPiece.style.height = `${kingFromRect.height}px`;
      kingAnimatedPiece.style.backgroundImage = `url('${this.getPieceImage(piece)}')`;
      kingAnimatedPiece.style.backgroundPosition = 'center';
      kingAnimatedPiece.style.backgroundSize = 'contain';
      kingAnimatedPiece.style.backgroundRepeat = 'no-repeat';
      kingAnimatedPiece.style.left = `${kingFromLeft}px`;
      kingAnimatedPiece.style.top = `${kingFromTop}px`;
      kingAnimatedPiece.style.transition = 'left 0.5s ease, top 0.5s ease';
      kingAnimatedPiece.style.zIndex = '100';
      kingAnimatedPiece.style.pointerEvents = 'none';
      
      // 创建车动画元素
      const rookAnimatedPiece = document.createElement('div');
      const rookPiece = piece[0] + 'r'; // 车的棋子标识符
      rookAnimatedPiece.style.position = 'absolute';
      rookAnimatedPiece.style.width = `${rookFromRect.width}px`;
      rookAnimatedPiece.style.height = `${rookFromRect.height}px`;
      rookAnimatedPiece.style.backgroundImage = `url('${this.getPieceImage(rookPiece)}')`;
      rookAnimatedPiece.style.backgroundPosition = 'center';
      rookAnimatedPiece.style.backgroundSize = 'contain';
      rookAnimatedPiece.style.backgroundRepeat = 'no-repeat';
      rookAnimatedPiece.style.left = `${rookFromLeft}px`;
      rookAnimatedPiece.style.top = `${rookFromTop}px`;
      rookAnimatedPiece.style.transition = 'left 0.5s ease, top 0.5s ease';
      rookAnimatedPiece.style.zIndex = '100';
      rookAnimatedPiece.style.pointerEvents = 'none';
      
      // 添加动画元素到棋盘
      board.appendChild(kingAnimatedPiece);
      board.appendChild(rookAnimatedPiece);
      
      // 隐藏原始棋子
      const kingOriginalPiece = kingFromSquare.querySelector('.chess-piece');
      if (kingOriginalPiece) {
        kingOriginalPiece.style.opacity = '0';
      }
      
      const rookOriginalPiece = rookFromSquare.querySelector('.chess-piece');
      if (rookOriginalPiece) {
        rookOriginalPiece.style.opacity = '0';
      }
      
      // 播放棋子移动的音效
      this.playChessSound();
      
      // 触发重排，确保动画能够正常开始
      void kingAnimatedPiece.offsetWidth;
      void rookAnimatedPiece.offsetWidth;
      
      // 设置动画目标位置
      kingAnimatedPiece.style.left = `${kingToLeft}px`;
      kingAnimatedPiece.style.top = `${kingToTop}px`;
      rookAnimatedPiece.style.left = `${rookToLeft}px`;
      rookAnimatedPiece.style.top = `${rookToTop}px`;
      
      // 动画完成后清理
      setTimeout(() => {
        // 移除动画元素
        if (kingAnimatedPiece.parentNode) {
          kingAnimatedPiece.parentNode.removeChild(kingAnimatedPiece);
        }
        if (rookAnimatedPiece.parentNode) {
          rookAnimatedPiece.parentNode.removeChild(rookAnimatedPiece);
        }
        
        // 恢复原始棋子的可见性
        if (kingOriginalPiece) {
          kingOriginalPiece.style.opacity = '1';
        }
        if (rookOriginalPiece) {
          rookOriginalPiece.style.opacity = '1';
        }
        
        resolve();
      }, 500);
    });
  }
  
  /**
   * 获取棋子的图片URL
   * @param {String} piece 棋子标识符
   * @return {String} 棋子图片的URL
   */
  getPieceImage(piece) {
    const pieceImages = {
      'wk': 'https://lichess1.org/assets/hashed/wK.bc7274dd.svg',
      'wq': 'https://lichess1.org/assets/hashed/wQ.79c9227e.svg',
      'wr': 'https://lichess1.org/assets/hashed/wR.e9e95adc.svg',
      'wb': 'https://lichess1.org/assets/hashed/wB.b7d1a118.svg',
      'wn': 'https://lichess1.org/assets/hashed/wN.68b788d7.svg',
      'wp': 'https://lichess1.org/assets/hashed/wP.0596b7ce.svg',
      'bk': 'https://lichess1.org/assets/hashed/bK.c5f22c23.svg',
      'bq': 'https://lichess1.org/assets/hashed/bQ.5abdb5aa.svg',
      'br': 'https://lichess1.org/assets/hashed/bR.c33a3d54.svg',
      'bb': 'https://lichess1.org/assets/hashed/bB.77e9debf.svg',
      'bn': 'https://lichess1.org/assets/hashed/bN.d0665564.svg',
      'bp': 'https://lichess1.org/assets/hashed/bP.09539f32.svg'
    };
    
    return pieceImages[piece] || '';
  }
  
  /**
   * 显示升变选择提示
   * @return {String} 选择的升变棋子类型
   */
  showPromotionPrompt() {
    // 创建升变选择模态框
    const modal = document.createElement('div');
    modal.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'z-50');
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 shadow-xl">
        <h3 class="text-xl font-bold mb-4 text-center">选择升变棋子</h3>
        <div class="flex justify-center space-x-4">
          <button class="promotion-option p-2 border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors" data-piece="q">
            <div class="w-12 h-12 bg-contain bg-center bg-no-repeat" style="background-image: url('https://lichess1.org/assets/hashed/wQ.79c9227e.svg');"></div>
            <span class="block text-center mt-1">后</span>
          </button>
          <button class="promotion-option p-2 border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors" data-piece="r">
            <div class="w-12 h-12 bg-contain bg-center bg-no-repeat" style="background-image: url('https://lichess1.org/assets/hashed/wR.e9e95adc.svg');"></div>
            <span class="block text-center mt-1">车</span>
          </button>
          <button class="promotion-option p-2 border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors" data-piece="b">
            <div class="w-12 h-12 bg-contain bg-center bg-no-repeat" style="background-image: url('https://lichess1.org/assets/hashed/wB.b7d1a118.svg');"></div>
            <span class="block text-center mt-1">象</span>
          </button>
          <button class="promotion-option p-2 border-2 border-gray-300 rounded hover:bg-gray-100 transition-colors" data-piece="n">
            <div class="w-12 h-12 bg-contain bg-center bg-no-repeat" style="background-image: url('https://lichess1.org/assets/hashed/wN.68b788d7.svg');"></div>
            <span class="block text-center mt-1">马</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // 返回一个Promise，等待用户选择
    return new Promise((resolve) => {
      const options = modal.querySelectorAll('.promotion-option');
      options.forEach(option => {
        option.addEventListener('click', () => {
          const pieceType = option.getAttribute('data-piece');
          document.body.removeChild(modal);
          resolve(pieceType);
        });
      });
    });
  }
  
  /**
   * 更新游戏状态
   * @param {Object} move 移动信息
   * @param {String} capturedPiece 被吃的棋子
   */
  updateGameState(move, capturedPiece) {
    const { fromX, fromY, piece } = move;
    
    // 更新王和车的移动状态
    if (piece[1] === 'k') {
      if (this.currentPlayer === 'w') {
        this.gameState.whiteKingMoved = true;
      } else {
        this.gameState.blackKingMoved = true;
      }
    } else if (piece[1] === 'r') {
      if (this.currentPlayer === 'w') {
        if (fromX === 0) {
          this.gameState.whiteQRookMoved = true;
        } else if (fromX === 7) {
          this.gameState.whiteKRookMoved = true;
        }
      } else {
        if (fromX === 0) {
          this.gameState.blackQRookMoved = true;
        } else if (fromX === 7) {
          this.gameState.blackKRookMoved = true;
        }
      }
    }
    
    // 更新半回合计数（用于五十步规则）
    if (piece[1] === 'p' || capturedPiece) {
      this.gameState.halfMoves = 0;
    } else {
      this.gameState.halfMoves++;
    }
    
    // 更新完整回合计数
    if (this.currentPlayer === 'b') {
      this.gameState.fullMoves++;
    }
    
    // 记录最后移动
    this.gameState.lastMove = move;
    
    // 记录位置历史（用于三次重复局面规则）
    // 只在白方回合开始时记录位置，因为三次重复局面需要是相同的玩家回合
    if (this.currentPlayer === 'b') {
      const boardString = this.rules.boardToString(this.board);
      this.gameState.positionHistory.push(boardString);
    }
  }
  
  /**
   * 更新棋盘UI
   */
  updateBoardUI() {
    // 重新创建棋盘
    this.createChessBoard();
    
    // 清除选择
    this.deselectPiece();
    
    // 更新游戏信息
    this.updateGameInfo();
  }
  
  /**
   * 高亮最后移动
   * @param {Number} fromX 起始X坐标
   * @param {Number} fromY 起始Y坐标
   * @param {Number} toX 目标X坐标
   * @param {Number} toY 目标Y坐标
   */
  highlightLastMove(fromX, fromY, toX, toY) {
    // 移除之前的高亮
    const lastMoveSquares = document.querySelectorAll('.last-move');
    lastMoveSquares.forEach(square => square.classList.remove('last-move'));
    
    // 高亮起始和目标方格
    const fromSquare = document.querySelector(`.chess-square[data-x="${fromX}"][data-y="${fromY}"]`);
    const toSquare = document.querySelector(`.chess-square[data-x="${toX}"][data-y="${toY}"]`);
    
    if (fromSquare) fromSquare.classList.add('last-move');
    if (toSquare) toSquare.classList.add('last-move');
  }
  
  /**
   * 记录移动
   * @param {Object} move 移动信息
   */
  recordMove(move) {
    const { fromX, fromY, toX, toY, piece } = move;
    const capturedPiece = this.board[fromY][fromX] === piece ? this.board[toY][toX] : '';
    
    // 转换为国际象棋记谱法
    const notation = this.moveToNotation(move, capturedPiece);
    
    // 添加到移动列表
    this.movesList.push(notation);
    
    // 更新移动历史UI
    this.updateMoveHistory();
  }
  
  /**
   * 将移动转换为国际象棋记谱法
   * @param {Object} move 移动信息
   * @param {String} capturedPiece 被吃的棋子
   * @return {String} 国际象棋记谱法表示的移动
   */
  moveToNotation(move, capturedPiece) {
    const { fromX, fromY, toX, toY, piece } = move;
    const pieceType = piece[1];
    
    // 棋盘坐标到代数记谱法的映射
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    let notation = '';
    
    // 王车易位
    if (pieceType === 'k' && Math.abs(toX - fromX) === 2) {
      if (toX > fromX) {
        notation = 'O-O'; // 王翼易位
      } else {
        notation = 'O-O-O'; // 后翼易位
      }
    } else {
      // 棋子符号
      switch (pieceType) {
        case 'k':
          notation += 'K';
          break;
        case 'q':
          notation += 'Q';
          break;
        case 'r':
          notation += 'R';
          break;
        case 'b':
          notation += 'B';
          break;
        case 'n':
          notation += 'N';
          break;
        // 兵不显示符号
      }
      
      // 吃子
      if (capturedPiece) {
        if (pieceType === 'p') {
          notation += files[fromX]; // 兵吃子显示起始列
        }
        notation += 'x';
      }
      
      // 目标位置
      notation += files[toX] + ranks[toY];
      
      // 升变
      if (pieceType === 'p' && (toY === 0 || toY === 7)) {
        const promotionPiece = move.promotionPiece || 'q';
        const promotionPieceSymbol = {
          'q': 'Q',
          'r': 'R',
          'b': 'B',
          'n': 'N'
        }[promotionPiece];
        notation += '=' + promotionPieceSymbol;
      }
    }
    
    // 检查将军或将死
    const opponentColor = this.currentPlayer === 'w' ? 'b' : 'w';
    const tempBoard = this.rules.cloneBoard(this.board);
    
    if (this.rules.isCheckmated(tempBoard, opponentColor, this.gameState)) {
      notation += '#'; // 将死
    } else if (this.rules.isInCheck(tempBoard, opponentColor)) {
      notation += '+'; // 将军
    }
    
    return notation;
  }
  
  /**
   * 更新移动历史UI
   */
  updateMoveHistory() {
    const moveHistory = document.getElementById('move-history');
    
    // 清空移动历史
    moveHistory.innerHTML = '';
    
    // 添加移动记录
    for (let i = 0; i < this.movesList.length; i += 2) {
      const moveRow = document.createElement('div');
      moveRow.classList.add('flex', 'mb-1');
      
      // 回合数
      const turnNumber = document.createElement('span');
      turnNumber.classList.add('w-8', 'text-gray-500');
      turnNumber.textContent = `${Math.floor(i / 2) + 1}.`;
      moveRow.appendChild(turnNumber);
      
      // 白方移动
      const whiteMove = document.createElement('span');
      whiteMove.classList.add('w-16', 'ml-2');
      whiteMove.textContent = this.movesList[i];
      moveRow.appendChild(whiteMove);
      
      // 黑方移动（如果有）
      if (i + 1 < this.movesList.length) {
        const blackMove = document.createElement('span');
        blackMove.classList.add('w-16', 'ml-2');
        blackMove.textContent = this.movesList[i + 1];
        moveRow.appendChild(blackMove);
      }
      
      moveHistory.appendChild(moveRow);
    }
    
    // 滚动到底部
    moveHistory.scrollTop = moveHistory.scrollHeight;
  }
  
  /**
   * 更新吃子记录
   * @param {String} capturedPiece 被吃的棋子
   */
  updateCapturedPieces(capturedPiece) {
    const pieceType = capturedPiece[1];
    const pieceColor = capturedPiece[0];
    
    // 确定要更新的容器
    const containerId = pieceColor === 'w' ? 'white-captures' : 'black-captures';
    const container = document.getElementById(containerId);
    
    // 创建棋子图标
    const pieceIcon = document.createElement('div');
    pieceIcon.classList.add('chess-piece-icon');
    
    // 使用新的棋子图片链接
    const pieceImages = {
      'wk': 'https://lichess1.org/assets/hashed/wK.bc7274dd.svg',
      'wq': 'https://lichess1.org/assets/hashed/wQ.79c9227e.svg',
      'wr': 'https://lichess1.org/assets/hashed/wR.e9e95adc.svg',
      'wb': 'https://lichess1.org/assets/hashed/wB.b7d1a118.svg',
      'wn': 'https://lichess1.org/assets/hashed/wN.68b788d7.svg',
      'wp': 'https://lichess1.org/assets/hashed/wP.0596b7ce.svg',
      'bk': 'https://lichess1.org/assets/hashed/bK.c5f22c23.svg',
      'bq': 'https://lichess1.org/assets/hashed/bQ.5abdb5aa.svg',
      'br': 'https://lichess1.org/assets/hashed/bR.c33a3d54.svg',
      'bb': 'https://lichess1.org/assets/hashed/bB.77e9debf.svg',
      'bn': 'https://lichess1.org/assets/hashed/bN.d0665564.svg',
      'bp': 'https://lichess1.org/assets/hashed/bP.09539f32.svg'
    };
    
    pieceIcon.style.backgroundImage = `url('${pieceImages[capturedPiece]}')`;
    pieceIcon.style.backgroundPosition = 'center';
    pieceIcon.style.backgroundSize = 'contain';
    
    // 添加到容器
    container.appendChild(pieceIcon);
  }
  
  /**
   * 检查游戏状态
   */
  async checkGameState() {
    const opponentColor = this.currentPlayer === 'w' ? 'b' : 'w';
    
    // 检查是否将死
    if (this.rules.isCheckmated(this.board, opponentColor, this.gameState)) {
      this.gameOver = true;
      this.gameResult = this.currentPlayer === 'w' ? 'win' : 'loss';
      this.updateGameInfo();
      await this.showGameResultModal();
      return;
    }
    
    // 检查是否和棋
    if (this.rules.isDraw(this.board, opponentColor, this.gameState)) {
      this.gameOver = true;
      this.gameResult = 'draw';
      this.updateGameInfo();
      await this.showGameResultModal();
      return;
    }
  }
  
  /**
   * 切换当前玩家
   */
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
    this.updateGameInfo();
  }
  
  /**
   * 让AI移动
   */
  async makeAIMove() {
    if (this.gameOver) return;
    
    // 获取AI的移动
    let move;
    if (this.useStockfishAI && this.stockfishAI) {
      // 使用Stockfish AI
      move = await this.stockfishAI.getMove(this.board, this.currentPlayer, this.gameState);
    } else {
      // 使用普通Chess AI
      move = await this.ai.getMove(this.board, this.currentPlayer, this.gameState);
    }
    
    if (!move) {
      // AI无法移动，游戏结束
      this.gameOver = true;
      this.gameResult = this.currentPlayer === 'w' ? 'loss' : 'win';
      this.updateGameInfo();
      await this.showGameResultModal();
      return;
    }
    
    // 执行移动（等待异步操作完成）
    await this.executeMove(move);
    
    // 记录移动
    this.recordMove(move);
    
    // 检查游戏状态
    await this.checkGameState();
    
    // 如果游戏未结束，切换玩家
    if (!this.gameOver) {
      this.switchPlayer();
    }
  }
  
  /**
   * 更新游戏信息
   */
  updateGameInfo() {
    // 更新当前回合
    const currentTurnElement = document.getElementById('current-turn');
    const turnColor = this.currentPlayer === 'w' ? 'bg-white' : 'bg-dark';
    const turnText = this.currentPlayer === 'w' ? '白方' : '黑方';
    
    currentTurnElement.innerHTML = `
      <span class="w-4 h-4 rounded-full ${turnColor} border border-gray-300 mr-2"></span>
      ${turnText}
    `;
    
    // 更新步数
    document.getElementById('move-count').textContent = this.gameState.fullMoves;
    
    // 更新游戏状态
    const gameStatusElement = document.getElementById('game-status');
    if (this.gameOver) {
      let statusText = '';
      let statusClass = '';
      
      if (this.gameResult === 'win') {
        statusText = '白方胜利!';
        statusClass = 'text-green-600';
      } else if (this.gameResult === 'loss') {
        statusText = '黑方胜利!';
        statusClass = 'text-red-600';
      } else {
        statusText = '和棋';
        statusClass = 'text-yellow-600';
      }
      
      gameStatusElement.textContent = statusText;
      gameStatusElement.className = `font-bold ${statusClass}`;
    } else {
      gameStatusElement.textContent = '进行中';
      gameStatusElement.className = 'font-bold text-green-600';
    }
    
    // 检查将军状态
    this.checkCheckStatus();
  }
  
  /**
   * 检查将军状态并更新UI
   */
  checkCheckStatus() {
    // 移除之前的将军高亮
    const checkSquares = document.querySelectorAll('.check-highlight, .check-pulse');
    checkSquares.forEach(square => {
      square.classList.remove('check-highlight', 'check-pulse');
    });
    
    // 检查白方王是否被将军
    if (this.rules.isInCheck(this.board, 'w')) {
      const kingPosition = this.findKingPosition('w');
      if (kingPosition) {
        const kingSquare = document.querySelector(`.chess-square[data-x="${kingPosition.x}"][data-y="${kingPosition.y}"]`);
        if (kingSquare) {
          kingSquare.classList.add('check-pulse');
        }
      }
    }
    
    // 检查黑方王是否被将军
    if (this.rules.isInCheck(this.board, 'b')) {
      const kingPosition = this.findKingPosition('b');
      if (kingPosition) {
        const kingSquare = document.querySelector(`.chess-square[data-x="${kingPosition.x}"][data-y="${kingPosition.y}"]`);
        if (kingSquare) {
          kingSquare.classList.add('check-pulse');
        }
      }
    }
  }
  
  /**
   * 找到王的位置
   * @param {String} color 王的颜色
   * @return {Object|null} 王的位置坐标，如果未找到则返回null
   */
  findKingPosition(color) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (this.board[y][x] === color + 'k') {
          return { x, y };
        }
      }
    }
    return null;
  }
  
  /**
   * 更新AI设置
   */
  updateAISettings() {
    // 更新难度显示
    const difficultyDisplay = document.getElementById('current-ai-difficulty');
    const difficultyTextMap = {
      'level1': '等级1 - 非常简单',
      'level2': '等级2 - 简单',
      'level3': '等级3 - 较简单',
      'level4': '等级4 - 中等',
      'level5': '等级5 - 较困难',
      'level6': '等级6 - 困难',
      'level7': '等级7 - 非常困难',
      'level8': '等级8 - 专家级别'
    };
    difficultyDisplay.textContent = difficultyTextMap[this.ai.difficulty] || difficultyTextMap['level4'];
    
    // 更新学习模式开关
    document.getElementById('ai-learning').checked = this.ai.learningEnabled;
    
    // 更新学习进度
    this.updateLearningProgress();
  }
  
  /**
   * 更新学习进度
   */
  updateLearningProgress() {
    const learningData = this.ai.getLearningProgress();
    const progressPercentage = Math.min(100, Math.round((learningData.totalGames / 50) * 100));
    
    document.getElementById('ai-learning-progress').textContent = `${progressPercentage}%`;
    document.getElementById('ai-learning-bar').style.width = `${progressPercentage}%`;
  }
  
  /**
   * 改变AI难度
   * @param {String} difficulty 难度级别
   */
  changeAIDifficulty(difficulty) {
    // 更新Chess AI难度
    this.ai.setDifficulty(difficulty);
    
    // 更新Stockfish AI难度（如果存在）
    if (this.stockfishAI) {
      this.stockfishAI.setDifficulty(difficulty);
    }
    
    // 保存设置
    this.saveSettings();
  }
  
  /**
   * 切换AI学习模式
   * @param {Boolean} enabled 是否启用学习模式
   */
  toggleAILearning(enabled) {
    this.ai.setLearningEnabled(enabled);
    
    // 保存设置
    this.saveSettings();
  }
  
  /**
   * 显示游戏结果模态框
   */
  async showGameResultModal() {
    const modal = document.getElementById('game-result-modal');
    const resultText = document.getElementById('game-result-text');
    
    let text = '';
    if (this.gameResult === 'win') {
      text = '恭喜，你赢了!';
    } else if (this.gameResult === 'loss') {
      text = '很遗憾，你输了!';
    } else {
      text = '游戏以和棋结束!';
    }
    
    resultText.textContent = text;
    modal.classList.remove('hidden');
    
    // 保存游戏记录
    await this.saveGameRecord();
    
    // 停止计时器
    this.stopTimer();
  }
  
  /**
   * 隐藏游戏结果模态框
   */
  hideGameResultModal() {
    const modal = document.getElementById('game-result-modal');
    modal.classList.add('hidden');
  }
  
  /**
   * 显示无效移动提示
   */
  showInvalidMoveToast() {
    const toast = document.getElementById('invalid-move-toast');
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 2000);
  }
  
  /**
   * 开始新游戏
   */
  startNewGame() {
    // 重置棋盘
    this.board = this.initializeBoard();
    
    // 重置游戏状态
    this.currentPlayer = 'w';
    this.selectedPiece = null;
    this.selectedPosition = null;
    this.validMoves = [];
    this.gameOver = false;
    this.gameResult = null;
    this.movesList = [];
    
    // 重置游戏状态对象
    this.gameState = {
      whiteKingMoved: false,
      blackKingMoved: false,
      whiteKRookMoved: false,
      whiteQRookMoved: false,
      blackKRookMoved: false,
      blackQRookMoved: false,
      halfMoves: 0,
      fullMoves: 1,
      lastMove: null,
      positionHistory: []
    };
    
    // 更新UI
    this.createChessBoard();
    this.updateGameInfo();
    document.getElementById('move-history').innerHTML = '<p class="text-gray-500 italic text-center">暂无记录</p>';
    document.getElementById('white-captures').innerHTML = '';
    document.getElementById('black-captures').innerHTML = '';
    
    // 清除保存的游戏
    this.storage.clearSavedGame();
    
    // 开始计时器
    this.startTimer();
  }
  
  /**
   * 认输
   */
  async resignGame() {
    if (this.gameOver) return;
    
    this.gameOver = true;
    this.gameResult = 'loss';
    this.updateGameInfo();
    await this.showGameResultModal();
  }
  
  /**
   * 重新开始当前游戏
   */
  restartGame() {
    this.startNewGame();
  }
  
  /**
   * 悔棋
   */
  undoMove() {
    // 检查是否有移动可以撤销
    if (this.gameStateHistory.length <= 1 || this.gameOver) {
      return;
    }
    
    // 停止计时器
    this.stopTimer();
    
    // 从历史记录中恢复上一个状态
    const previousState = this.gameStateHistory.pop();
    
    // 恢复游戏状态
    this.board = previousState.board;
    this.currentPlayer = previousState.currentPlayer;
    this.gameState = previousState.gameState;
    this.movesList = previousState.movesList;
    
    // 更新棋盘UI
    this.createChessBoard();
    
    // 更新游戏信息
    this.updateGameInfo();
    
    // 更新移动历史UI
    this.updateMoveHistory();
    
    // 清空吃子记录并重新生成
    document.getElementById('white-captures').innerHTML = '';
    document.getElementById('black-captures').innerHTML = '';
    
    // 重新开始计时器
    this.startTimer();
  }
  
  /**
   * 保存游戏
   */
  saveGame() {
    if (this.gameOver) {
      alert('游戏已结束，无法保存');
      return;
    }
    
    this.storage.saveCurrentGame({
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameState: this.gameState,
      movesList: this.movesList,
      startTime: this.startTime,
      difficulty: this.ai.difficulty,
      aiLearning: this.ai.learningEnabled
    });
    
    alert('游戏已保存');
  }
  
  /**
   * 尝试加载保存的游戏
   */
  tryLoadSavedGame() {
    const savedGame = this.storage.getSavedGame();
    
    if (savedGame) {
      if (confirm('是否加载保存的游戏？')) {
        this.board = savedGame.board;
        this.currentPlayer = savedGame.currentPlayer;
        this.gameState = savedGame.gameState;
        this.movesList = savedGame.movesList;
        this.startTime = savedGame.startTime;
        this.ai.difficulty = savedGame.difficulty;
        this.ai.learningEnabled = savedGame.aiLearning;
        
        // 更新UI
        this.createChessBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateAISettings();
        
        // 开始计时器
        this.startTimer();
        
        // 如果当前是AI回合，让AI移动
        if (this.currentPlayer === 'b' && !this.gameOver) {
          setTimeout(() => {
            this.makeAIMove();
          }, 1000);
        }
      } else {
        // 清除保存的游戏
        this.storage.clearSavedGame();
        
        // 开始新游戏
        this.startNewGame();
      }
    } else {
      // 开始新游戏
      this.startNewGame();
    }
  }
  
  /**
   * 保存游戏记录
   */
  async saveGameRecord() {
    if (!this.gameOver) return;
    
    // 计算游戏时长（分钟）
    const duration = Math.round((Date.now() - this.startTime) / (1000 * 60));
    
    // 创建游戏记录对象
    const gameRecord = {
      duration: duration,
      moves: this.movesList.length,
      result: this.gameResult,
      difficulty: this.ai.difficulty,
      aiLearning: this.ai.learningEnabled,
      movesList: this.movesList,
      firstMove: this.movesList.length > 0 ? this.movesList[0] : null,
      timestamp: new Date().toISOString()
    };
    
    // 让AI学习
    this.ai.learnFromGameResult(this.gameResult, this.movesList, this.currentPlayer);
    
    // 检查用户是否已登录
    if (this.userSystem.isLoggedIn()) {
      // 保存游戏记录到用户数据
      try {
        await this.userSystem.saveUserGameRecord(gameRecord);
        // 保存AI学习数据到用户数据
        await this.userSystem.saveUserAILearningData(this.ai.learningData);
      } catch (error) {
        console.error('保存游戏记录失败:', error);
      }
    } else {
      // 保存游戏记录到本地存储
      this.storage.saveGameRecord(gameRecord);
    }
  }
  
  /**
   * 加载设置
   */
  async loadSettings() {
    let settings;
    
    // 检查用户是否已登录
    if (this.userSystem.isLoggedIn()) {
      // 从用户数据加载设置
      const user = this.userSystem.getCurrentUser();
      settings = user.settings || {
        difficulty: 'medium',
        aiLearning: true
      };
      // 从用户数据加载AI学习数据
      try {
        const userLearningData = await this.userSystem.getUserAILearningData();
        if (userLearningData) {
          this.ai.learningData = userLearningData;
        }
      } catch (error) {
        console.error('加载AI学习数据失败:', error);
      }
    } else {
      // 从本地存储加载设置
      settings = this.storage.getSettings();
    }
    
    // 更新普通AI设置
    this.ai.difficulty = settings.difficulty;
    this.ai.learningEnabled = settings.aiLearning;
    
    // 更新Stockfish AI设置（如果存在）
    if (this.stockfishAI) {
      this.stockfishAI.setDifficulty(settings.difficulty);
    }
  }
  
  /**
   * 保存设置
   */
  async saveSettings() {
    const settings = {
      difficulty: this.ai.difficulty,
      aiLearning: this.ai.learningEnabled
    };
    
    // 检查用户是否已登录
    if (this.userSystem.isLoggedIn()) {
      // 保存设置到用户数据
      try {
        await this.userSystem.updateUserSettings(settings);
      } catch (error) {
        console.error('保存设置失败:', error);
      }
    } else {
      // 保存设置到本地存储
      this.storage.saveSettings(settings);
    }
  }
  
  /**
   * 开始计时器
   */
  startTimer() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
    }, 1000);
  }
  
  /**
   * 停止计时器
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

// 当DOM加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
  const game = new ChessGame();
});