/**
 * 国际象棋复盘分析模块
 * 负责处理复盘页面的功能，包括棋盘展示、走棋历史和分析结果
 */

class AnalysisBoard {
  constructor() {
    this.board = this.initializeBoard();
    this.currentPlayer = 'w';
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
    this.movesList = [];
    this.currentMoveIndex = 0;
    this.isFlipped = false;
    this.rules = new ChessRules();
    
    // 模拟的分析数据
    this.analysisData = {
      evaluation: '+0.1',
      bestMoves: [
        { move: '8... d5', evaluation: '+0.1', isBest: true },
        { move: '8... Nc6', evaluation: '+0.2' },
        { move: '8... Be6', evaluation: '+0.3' }
      ]
    };
    
    // 初始化应用
    this.initApp();
  }
  
  /**
   * 初始化应用
   */
  initApp() {
    this.initializeUI();
    this.setupEventListeners();
    this.generateSampleMoves();
    this.updateMoveHistory();
    this.updateAnalysis();
  }
  
  /**
   * 初始化棋盘
   */
  initializeBoard() {
    // 创建初始棋盘布局
    const board = Array(8).fill().map(() => Array(8).fill(''));
    
    // 黑方后排
    board[0][0] = 'br';
    board[0][1] = 'bn';
    board[0][2] = 'bb';
    board[0][3] = 'bq';
    board[0][4] = 'bk';
    board[0][5] = 'bb';
    board[0][6] = 'bn';
    board[0][7] = 'br';
    
    // 黑方兵
    for (let i = 0; i < 8; i++) {
      board[1][i] = 'bp';
    }
    
    // 白方兵
    for (let i = 0; i < 8; i++) {
      board[6][i] = 'wp';
    }
    
    // 白方后排
    board[7][0] = 'wr';
    board[7][1] = 'wn';
    board[7][2] = 'wb';
    board[7][3] = 'wq';
    board[7][4] = 'wk';
    board[7][5] = 'wb';
    board[7][6] = 'wn';
    board[7][7] = 'wr';
    
    return board;
  }
  
  /**
   * 初始化用户界面
   */
  initializeUI() {
    this.createChessBoard();
    this.updateGameInfo();
  }
  
  /**
   * 创建棋盘UI
   */
  createChessBoard() {
    const chessBoard = document.getElementById('chess-board');
    chessBoard.innerHTML = '';
    
    // 根据是否翻转棋盘决定遍历顺序
    const yRange = this.isFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
    const xRange = this.isFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
    
    for (const y of yRange) {
      for (const x of xRange) {
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
    
    // 使用lichess的棋子图片
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
    
    square.appendChild(pieceElement);
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 上一步按钮
    document.getElementById('prev-move').addEventListener('click', async () => {
      await this.goToPreviousMove();
    });
    
    // 下一步按钮
    document.getElementById('next-move').addEventListener('click', async () => {
      await this.goToNextMove();
    });
    
    // 翻转棋盘按钮
    document.getElementById('flip-board').addEventListener('click', () => {
      this.flipBoard();
    });
    
    // 重置分析按钮
    document.getElementById('reset-analysis').addEventListener('click', () => {
      this.resetAnalysis();
    });
    
    // 自动播放按钮
    document.getElementById('auto-play').addEventListener('click', () => {
      this.toggleAutoPlay();
    });
    
    // 保存分析按钮
    document.getElementById('save-analysis').addEventListener('click', () => {
      this.saveAnalysis();
    });
    
    // 导出PGN按钮
    document.getElementById('export-pgn').addEventListener('click', () => {
      this.exportPGN();
    });
  }
  
  /**
   * 生成示例走棋记录
   */
  generateSampleMoves() {
    // 使用起始位置+目标位置的格式
    this.movesList = [
      'c2c4', 'e7e5',
      'g2g3', 'e5e6',
      'f1g2', 'e6e5',
      'd2d3', 'd7d5',
      'c4d5', 'e5d5',
      'b1c3', 'g8f6',
      'e1g1', 'e8g8',
      'd1b3', 'b8d7',
      'b3d2', 'a8e8',
      'a1e1', 'd8e7',
      'c3d5', 'f6d5',
      'g2d5', 'c8d6'
    ];
    
    document.getElementById('total-moves').textContent = this.movesList.length;
  }
  
  /**
   * 更新走棋历史
   */
  updateMoveHistory() {
    const moveHistory = document.getElementById('move-history');
    moveHistory.innerHTML = '';
    
    // 单步显示走棋历史
    for (let i = 0; i < this.movesList.length; i++) {
      const moveRow = document.createElement('div');
      moveRow.classList.add('flex', 'justify-start', 'items-center', 'py-1', 'px-2', 'rounded', 'move-item');
      
      // 移动编号
      const moveNumber = document.createElement('span');
      moveNumber.classList.add('w-10', 'text-gray-500');
      moveNumber.textContent = `${i + 1}.`;
      moveRow.appendChild(moveNumber);
      
      // 移动内容
      const moveContent = document.createElement('span');
      moveContent.classList.add('w-20', 'ml-2', 'text-left');
      moveContent.textContent = this.movesList[i];
      moveRow.appendChild(moveContent);
      
      // 玩家标记
      const playerMarker = document.createElement('span');
      playerMarker.classList.add('ml-2', 'text-xs', 'px-2', 'py-0.5', 'rounded');
      if (i % 2 === 0) {
        playerMarker.classList.add('bg-blue-100', 'text-blue-800');
        playerMarker.textContent = '白方';
      } else {
        playerMarker.classList.add('bg-red-100', 'text-red-800');
        playerMarker.textContent = '黑方';
      }
      moveRow.appendChild(playerMarker);
      
      // 添加点击事件
      const moveIndex = i;
      moveRow.addEventListener('click', async () => {
        await this.goToMove(moveIndex);
      });
      
      // 高亮当前移动
      if (i === this.currentMoveIndex) {
        moveRow.classList.add('active');
      }
      
      moveHistory.appendChild(moveRow);
    }
    
    // 滚动到当前移动
    this.scrollToCurrentMove();
  }
  
  /**
   * 滚动到当前移动
   */
  scrollToCurrentMove() {
    const moveHistory = document.getElementById('move-history');
    const activeMove = moveHistory.querySelector('.move-item.active');
    if (activeMove) {
      // 只在走棋历史容器内部滚动，不影响整个页面
      const moveHistoryRect = moveHistory.getBoundingClientRect();
      const activeMoveRect = activeMove.getBoundingClientRect();
      const scrollTop = moveHistory.scrollTop;
      const scrollPosition = scrollTop + activeMoveRect.top - moveHistoryRect.top - (moveHistoryRect.height / 2) + (activeMoveRect.height / 2);
      
      moveHistory.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }
  
  /**
   * 更新分析结果
   */
  updateAnalysis() {
    // 更新评估值
    document.getElementById('evaluation').textContent = this.analysisData.evaluation;
    
    // 更新评估条
    const evaluationValue = parseFloat(this.analysisData.evaluation);
    const maxEval = 3.0;
    const percentage = Math.min(100, Math.max(0, 50 + (evaluationValue / maxEval) * 50));
    const evaluationBar = document.getElementById('evaluation-bar');
    evaluationBar.style.width = `${percentage}%`;
    
    // 根据评估值设置颜色
    if (evaluationValue > 0) {
      evaluationBar.style.backgroundColor = '#10B981';
    } else if (evaluationValue < 0) {
      evaluationBar.style.backgroundColor = '#EF4444';
    } else {
      evaluationBar.style.backgroundColor = '#F59E0B';
    }
    
    // 更新最佳走法
    this.updateBestMoves();
  }
  
  /**
   * 更新最佳走法
   */
  updateBestMoves() {
    // 查找最佳走法容器
    const bestMovesContainer = document.querySelector('.space-y-4 > div:nth-child(2) > div.space-y-2');
    if (bestMovesContainer) {
      bestMovesContainer.innerHTML = '';
      
      this.analysisData.bestMoves.forEach(move => {
        const moveElement = document.createElement('div');
        moveElement.classList.add('flex', 'items-center', 'gap-2', 'p-2', 'bg-light', 'rounded', 'cursor-pointer', 'hover:bg-gray-100');
        
        if (move.isBest) {
          const bestBadge = document.createElement('span');
          bestBadge.classList.add('text-xs', 'bg-green-100', 'text-green-800', 'px-2', 'py-0.5', 'rounded');
          bestBadge.textContent = '最佳';
          moveElement.appendChild(bestBadge);
        }
        
        const moveText = document.createElement('span');
        moveText.textContent = move.move;
        moveElement.appendChild(moveText);
        
        const evalText = document.createElement('span');
        evalText.classList.add('ml-auto', 'text-sm', 'font-medium');
        evalText.textContent = move.evaluation;
        moveElement.appendChild(evalText);
        
        bestMovesContainer.appendChild(moveElement);
      });
    }
  }
  
  /**
   * 更新游戏信息
   */
  updateGameInfo() {
    // 更新当前移动计数（显示单步移动数）
    document.getElementById('current-move').textContent = this.currentMoveIndex + 1;
    
    // 更新当前局面描述
    const currentPosition = this.movesList.slice(0, this.currentMoveIndex + 1).join(' ');
    document.getElementById('current-position').textContent = currentPosition;
  }
  
  /**
   * 上一步
   */
  async goToPreviousMove() {
    if (this.currentMoveIndex > 0) {
      this.currentMoveIndex--;
      await this.updateGameFromMoveIndex();
    }
  }
  
  /**
   * 下一步
   */
  async goToNextMove() {
    if (this.currentMoveIndex < this.movesList.length - 1) {
      this.currentMoveIndex++;
      await this.updateGameFromMoveIndex();
    }
  }
  
  /**
   * 跳转到指定移动
   * @param {Number} moveIndex 移动索引
   */
  async goToMove(moveIndex) {
    this.currentMoveIndex = moveIndex;
    await this.updateGameFromMoveIndex();
  }
  
  /**
   * 从当前移动索引更新游戏状态
   */
  async updateGameFromMoveIndex() {
    // 重置棋盘到初始状态
    this.board = this.initializeBoard();
    
    // 重置游戏状态
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
    
    // 重置当前玩家
    this.currentPlayer = 'w';
    
    // 重新应用所有移动直到当前索引
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const move = this.movesList[i];
      if (move) {
        this.applySimplifiedMove(move);
      }
    }
    
    // 为棋盘添加简单的过渡动画
    this.animateBoardTransition();
    
    // 更新UI
    this.createChessBoard();
    this.updateMoveHistory();
    this.updateGameInfo();
    this.updateAnalysis();
    
    // 播放棋子移动的音效
    this.playChessSound();
  }
  
  /**
   * 播放棋子移动的音效
   */
  playChessSound() {
    try {
      // 创建音频元素并播放音效
      const audio = new Audio('chess.mp3');
      audio.volume = 0.5; // 设置音量为50%
      audio.play().catch(error => {
        console.error('无法播放音效:', error);
      });
    } catch (error) {
      console.error('播放音效出错:', error);
    }
  }
  
  /**
   * 为棋盘添加简单的过渡动画
   */
  animateBoardTransition() {
    const chessBoard = document.getElementById('chess-board');
    
    // 添加淡出动画
    chessBoard.style.opacity = '0';
    chessBoard.style.transition = 'opacity 0.3s ease';
    
    // 触发重排
    void chessBoard.offsetWidth;
    
    // 添加淡入动画
    chessBoard.style.opacity = '1';
  }
  
  // 移除了setBoardState方法，现在使用updateBoardFromMove方法直接应用移动
  
  /**
   * 简化的移动应用函数
   * @param {String} move 走棋记谱法
   */
  applySimplifiedMove(move) {
    // 移除将军/将死符号
    move = move.replace(/[+#]/g, '');
    
    // 处理王车易位
    if (move === 'O-O') {
      this.handleCastling('king');
      return;
    }
    if (move === 'O-O-O') {
      this.handleCastling('queen');
      return;
    }
    
    // 处理普通移动
    // 简化实现：直接使用预设的棋盘更新
    this.updateBoardFromMove(move);
  }
  
  /**
   * 处理王车易位
   * @param {String} side 易位方向 'king' 或 'queen'
   */
  handleCastling(side) {
    if (this.currentPlayer === 'w') {
      // 白方易位
      if (side === 'king') {
        // 王翼易位
        this.board[7][4] = '';
        this.board[7][7] = '';
        this.board[7][6] = 'wk';
        this.board[7][5] = 'wr';
      } else {
        // 后翼易位
        this.board[7][4] = '';
        this.board[7][0] = '';
        this.board[7][2] = 'wk';
        this.board[7][3] = 'wr';
      }
    } else {
      // 黑方易位
      if (side === 'king') {
        // 王翼易位
        this.board[0][4] = '';
        this.board[0][7] = '';
        this.board[0][6] = 'bk';
        this.board[0][5] = 'br';
      } else {
        // 后翼易位
        this.board[0][4] = '';
        this.board[0][0] = '';
        this.board[0][2] = 'bk';
        this.board[0][3] = 'br';
      }
    }
    
    // 切换玩家
    this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
  }
  
  /**
   * 从移动更新棋盘
   * @param {String} move 走棋记谱法
   */
  updateBoardFromMove(move) {
    // 移除将军/将死符号
    move = move.replace(/[+#]/g, '');
    
    // 解析起始位置和目标位置
    const fromFile = move[0];
    const fromRank = move[1];
    const toFile = move[2];
    const toRank = move[3];
    
    // 转换为坐标
    const fromX = fromFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromY = 8 - parseInt(fromRank);
    const toX = toFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const toY = 8 - parseInt(toRank);
    
    // 检查坐标是否有效
    if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7 || 
        toX < 0 || toX > 7 || toY < 0 || toY > 7) {
      console.error('无效的移动坐标:', move);
      this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
      return;
    }
    
    // 获取起始位置的棋子
    const piece = this.board[fromY][fromX];
    if (!piece) {
      console.error('起始位置没有棋子:', move);
      this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
      return;
    }
    
    // 清除目标位置的棋子
    this.board[toY][toX] = '';
    
    // 移动棋子
    this.board[toY][toX] = piece;
    this.board[fromY][fromX] = '';
    
    // 切换玩家
    this.currentPlayer = this.currentPlayer === 'w' ? 'b' : 'w';
  }
  
  /**
   * 找到棋子的起始位置
   * @param {Object} parsedMove 解析后的移动对象
   * @return {Object|null} 起始位置坐标
   */
  findStartPosition(parsedMove) {
    if (parsedMove.type === 'castling') {
      return this.findCastlingStartPosition(parsedMove);
    }
    
    const toX = parsedMove.toFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const toY = 8 - parseInt(parsedMove.toRank);
    
    // 将棋子类型转换为内部表示
    const pieceMap = {
      'K': 'k', 'Q': 'q', 'R': 'r', 'B': 'b', 'N': 'n', 'P': 'p'
    };
    const pieceType = pieceMap[parsedMove.piece];
    const pieceColor = this.currentPlayer;
    const piece = pieceColor + pieceType;
    
    // 查找所有可能的起始位置
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const boardPiece = this.board[y][x];
        if (boardPiece === piece) {
          // 检查该棋子是否可以移动到目标位置
          const move = {
            fromX: x,
            fromY: y,
            toX: toX,
            toY: toY,
            piece: piece
          };
          
          if (this.rules.isValidMove(this.board, move, this.currentPlayer, this.gameState)) {
            return { x, y };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 找到王车易位的起始位置
   * @param {Object} parsedMove 解析后的移动对象
   * @return {Object|null} 起始位置坐标
   */
  findCastlingStartPosition(parsedMove) {
    const kingY = this.currentPlayer === 'w' ? 7 : 0;
    return { x: 4, y: kingY };
  }
  
  /**
   * 执行移动
   * @param {Object} startPos 起始位置
   * @param {Object} parsedMove 解析后的移动对象
   */
  executeMove(startPos, parsedMove) {
    const fromX = startPos.x;
    const fromY = startPos.y;
    const piece = this.board[fromY][fromX];
    
    // 处理王车易位
    if (parsedMove.type === 'castling') {
      this.executeCastling(fromX, fromY, parsedMove);
      return;
    }
    
    // 处理普通移动
    const toX = parsedMove.toFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const toY = 8 - parseInt(parsedMove.toRank);
    
    // 创建移动对象
    const move = {
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      piece: piece
    };
    
    // 检查王车易位
    if (this.rules.isCastlingMove(this.board, move, this.currentPlayer, this.gameState)) {
      this.board = this.rules.executeCastling(this.board, move);
      return;
    }
    
    // 检查吃过路兵
    if (piece[1] === 'p' && Math.abs(toX - fromX) === 1 && this.board[toY][toX] === '') {
      const direction = this.currentPlayer === 'w' ? -1 : 1;
      if (toY === fromY + direction) {
        const adjacentPiece = this.board[fromY][toX];
        if (adjacentPiece && adjacentPiece === (this.currentPlayer === 'w' ? 'bp' : 'wp')) {
          this.board = this.rules.executeEnPassant(this.board, move);
          return;
        }
      }
    }
    
    // 执行普通移动
    this.board[toY][toX] = piece;
    this.board[fromY][fromX] = '';
    
    // 处理兵升变
    if (this.rules.canPromote(this.board, move)) {
      const promotionPiece = parsedMove.promotion || 'q';
      this.board = this.rules.promotePawn(this.board, move, promotionPiece.toLowerCase());
    }
  }
  
  /**
   * 执行王车易位
   * @param {Number} fromX 王的起始X坐标
   * @param {Number} fromY 王的起始Y坐标
   * @param {Object} parsedMove 解析后的移动对象
   */
  executeCastling(fromX, fromY, parsedMove) {
    const isKingSide = parsedMove.side === 'king';
    const kingNewX = isKingSide ? 6 : 2;
    const rookX = isKingSide ? 7 : 0;
    const rookNewX = isKingSide ? 5 : 3;
    
    // 移动王
    this.board[fromY][kingNewX] = this.board[fromY][fromX];
    this.board[fromY][fromX] = '';
    
    // 移动车
    this.board[fromY][rookNewX] = this.board[fromY][rookX];
    this.board[fromY][rookX] = '';
  }
  
  /**
   * 翻转棋盘
   */
  flipBoard() {
    this.isFlipped = !this.isFlipped;
    this.createChessBoard();
  }
  
  /**
   * 重置分析
   */
  resetAnalysis() {
    this.currentMoveIndex = 0;
    this.board = this.initializeBoard();
    this.createChessBoard();
    this.updateMoveHistory();
    this.updateGameInfo();
    this.updateAnalysis();
  }
  
  /**
   * 切换自动播放
   */
  toggleAutoPlay() {
    // 实现自动播放功能
    this.showToast('自动播放功能将在后续版本中实现');
  }
  
  /**
   * 保存分析
   */
  saveAnalysis() {
    // 实现保存分析功能
    this.showToast('分析已保存');
  }
  
  /**
   * 导出PGN
   */
  exportPGN() {
    // 实现导出PGN功能
    const pgn = this.generatePGN();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis.pgn';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('PGN已导出');
  }
  
  /**
   * 生成PGN格式
   */
  generatePGN() {
    let pgn = '[Event "分析"]\n';
    pgn += '[Site "本地"]\n';
    pgn += '[Date "' + new Date().toISOString().split('T')[0] + '"]\n';
    pgn += '[Round "?"]\n';
    pgn += '[White "?"]\n';
    pgn += '[Black "?"]\n';
    pgn += '[Result "*"]\n\n';
    
    // 添加走棋记录
    for (let i = 0; i < this.movesList.length; i += 2) {
      pgn += `${Math.floor(i / 2) + 1}. ${this.movesList[i]}`;
      if (i + 1 < this.movesList.length) {
        pgn += ` ${this.movesList[i + 1]}`;
      }
      pgn += ' ';
    }
    
    pgn += '*\n';
    return pgn;
  }
  
  /**
   * 显示提示
   * @param {String} message 提示消息
   */
  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
}

// 页面加载完成后初始化分析棋盘
document.addEventListener('DOMContentLoaded', () => {
  new AnalysisBoard();
});