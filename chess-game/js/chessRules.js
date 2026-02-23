/**
 * 国际象棋规则验证模块
 * 负责验证棋子移动的合法性、特殊规则处理和胜负判定
 */

class ChessRules {
  constructor() {
    // 棋子价值评估（用于AI决策）
    this.pieceValues = {
      'p': 1,   // 兵
      'n': 3,   // 马
      'b': 3,   // 象
      'r': 5,   // 车
      'q': 9,   // 后
      'k': 100  // 王
    };
    
    // 棋子位置评估表（用于AI决策）
    this.positionValues = this.initializePositionValues();
  }
  
  /**
   * 初始化棋子位置评估表
   * 这些表格用于评估不同棋子在不同位置的价值
   */
  initializePositionValues() {
    // 简化版的位置评估表，实际应用中可以使用更复杂的表格
    return {
      // 兵的位置价值（开局时中央位置更有价值，接近升变时价值增加）
      'p': [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        [0.1, 0.1, 0.2, 0.3, 0.3, 0.2, 0.1, 0.1],
        [0.05, 0.05, 0.1, 0.25, 0.25, 0.1, 0.05, 0.05],
        [0, 0, 0, 0.2, 0.2, 0, 0, 0],
        [0.05, -0.05, -0.1, 0, 0, -0.1, -0.05, 0.05],
        [0.05, 0.1, 0.1, -0.2, -0.2, 0.1, 0.1, 0.05],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ],
      // 其他棋子的位置价值可以根据需要添加
    };
  }
  
  /**
   * 检查移动是否合法
   * @param {Array} board 当前棋盘状态
   * @param {Object} move 移动信息 {fromX, fromY, toX, toY, piece}
   * @param {String} currentPlayer 当前玩家颜色 ('w' 或 'b')
   * @param {Object} gameState 游戏状态信息
   * @return {Boolean} 移动是否合法
   */
  isValidMove(board, move, currentPlayer, gameState, options = {}) {
    const { fromX, fromY, toX, toY, piece } = move;
    
    // 检查起始位置是否有棋子
    if (!piece) return false;
    
    // 检查是否是当前玩家的棋子
    if (piece[0] !== currentPlayer) return false;
    
    // 检查目标位置是否有自己的棋子
    const targetPiece = board[toY][toX];
    if (targetPiece && targetPiece[0] === currentPlayer) return false;
    
    // 检查王车易位
    if (this.isCastlingMove(board, move, currentPlayer, gameState)) {
      return this.isValidCastling(board, move, currentPlayer, gameState);
    }
    
    // 根据棋子类型检查移动是否合法
    const pieceType = piece[1];
    let isBasicMoveValid = false;
    
    switch (pieceType) {
      case 'p': // 兵
        isBasicMoveValid = this.isValidPawnMove(board, move, currentPlayer, gameState);
        break;
      case 'r': // 车
        isBasicMoveValid = this.isValidRookMove(board, move);
        break;
      case 'n': // 马
        isBasicMoveValid = this.isValidKnightMove(board, move);
        break;
      case 'b': // 象
        isBasicMoveValid = this.isValidBishopMove(board, move);
        break;
      case 'q': // 后
        isBasicMoveValid = this.isValidQueenMove(board, move);
        break;
      case 'k': // 王
        isBasicMoveValid = this.isValidKingMove(board, move, currentPlayer, options);
        break;
      default:
        isBasicMoveValid = false;
    }
    
    // 如果基本移动规则不合法，直接返回false
    if (!isBasicMoveValid) return false;
    
    // 检查是否会导致自己被将军（除非显式跳过）
    if (!options.skipCheckCheck) {
      const tempBoard = this.cloneBoard(board);
      tempBoard[toY][toX] = piece;
      tempBoard[fromY][fromX] = '';
      
      return !this.isInCheck(tempBoard, currentPlayer);
    }
    
    return true;
  }
  
  /**
   * 检查兵的移动是否合法
   */
  isValidPawnMove(board, move, currentPlayer, gameState) {
    const { fromX, fromY, toX, toY } = move;
    const direction = currentPlayer === 'w' ? -1 : 1; // 白兵向上，黑兵向下
    const startingRow = currentPlayer === 'w' ? 6 : 1; // 白兵起始行，黑兵起始行
    
    // 检查垂直移动
    if (fromX === toX) {
      // 前进一格
      if (toY === fromY + direction && board[toY][toX] === '') {
        return true;
      }
      
      // 初始位置前进两格
      if (fromY === startingRow && toY === fromY + 2 * direction && 
          board[fromY + direction][fromX] === '' && board[toY][toX] === '') {
        return true;
      }
    }
    
    // 检查斜向吃子
    if (Math.abs(toX - fromX) === 1 && toY === fromY + direction) {
      // 普通吃子
      if (board[toY][toX] !== '' && board[toY][toX][0] !== currentPlayer) {
        return true;
      }
      
      // 吃过路兵
      if (board[toY][toX] === '') {
        const adjacentPiece = board[fromY][toX];
        if (adjacentPiece && adjacentPiece === (currentPlayer === 'w' ? 'bp' : 'wp')) {
          // 检查上一步是否是对方的兵移动了两格
          const lastMove = gameState.lastMove;
          if (lastMove && 
              lastMove.piece === (currentPlayer === 'w' ? 'bp' : 'wp') && 
              Math.abs(lastMove.toY - lastMove.fromY) === 2 &&
              lastMove.toX === toX && lastMove.toY === fromY) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查车的移动是否合法
   */
  isValidRookMove(board, move) {
    const { fromX, fromY, toX, toY } = move;
    
    // 车只能横向或纵向移动
    if (fromX !== toX && fromY !== toY) {
      return false;
    }
    
    // 检查路径上是否有其他棋子
    if (fromX === toX) {
      // 纵向移动
      const minY = Math.min(fromY, toY) + 1;
      const maxY = Math.max(fromY, toY);
      for (let y = minY; y < maxY; y++) {
        if (board[y][fromX] !== '') {
          return false;
        }
      }
    } else {
      // 横向移动
      const minX = Math.min(fromX, toX) + 1;
      const maxX = Math.max(fromX, toX);
      for (let x = minX; x < maxX; x++) {
        if (board[fromY][x] !== '') {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * 检查马的移动是否合法
   */
  isValidKnightMove(board, move) {
    const { fromX, fromY, toX, toY } = move;
    
    // 马走日，即横向移动2格纵向移动1格，或横向移动1格纵向移动2格
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    
    return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
  }
  
  /**
   * 检查象的移动是否合法
   */
  isValidBishopMove(board, move) {
    const { fromX, fromY, toX, toY } = move;
    
    // 象只能斜向移动
    if (Math.abs(toX - fromX) !== Math.abs(toY - fromY)) {
      return false;
    }
    
    // 检查路径上是否有其他棋子
    const dx = toX > fromX ? 1 : -1;
    const dy = toY > fromY ? 1 : -1;
    
    let x = fromX + dx;
    let y = fromY + dy;
    
    while (x !== toX && y !== toY) {
      if (board[y][x] !== '') {
        return false;
      }
      x += dx;
      y += dy;
    }
    
    return true;
  }
  
  /**
   * 检查后的移动是否合法
   */
  isValidQueenMove(board, move) {
    // 后可以像车一样横向或纵向移动，也可以像象一样斜向移动
    return this.isValidRookMove(board, move) || this.isValidBishopMove(board, move);
  }
  
  /**
   * 检查王的移动是否合法
   */
  isValidKingMove(board, move, currentPlayer, options = {}) {
    const { fromX, fromY, toX, toY } = move;
    
    // 王只能移动一格
    if (Math.abs(toX - fromX) > 1 || Math.abs(toY - fromY) > 1) {
      return false;
    }
    
    // 检查目标位置是否有自己的棋子
    const targetPiece = board[toY][toX];
    if (targetPiece && targetPiece[0] === currentPlayer) {
      return false;
    }
    
    // 检查移动后是否会被将军（除非显式跳过）
    if (!options.skipCheckCheck) {
      const tempBoard = this.cloneBoard(board);
      tempBoard[toY][toX] = board[fromY][fromX];
      tempBoard[fromY][fromX] = '';
      
      return !this.isInCheck(tempBoard, currentPlayer);
    }
    
    return true;
  }
  
  /**
   * 检查是否是王车易位移动
   */
  isCastlingMove(board, move, currentPlayer, gameState) {
    const { fromX, fromY, toX, toY, piece } = move;
    
    // 必须是王
    if (piece[1] !== 'k') return false;
    
    // 王必须移动两格
    if (Math.abs(toX - fromX) !== 2 || toY !== fromY) return false;
    
    // 如果没有gameState，说明是在isInCheck中调用的，直接返回false
    // 避免无限递归
    if (!gameState) return false;
    
    // 检查王和车是否未移动过
    const kingHasMoved = currentPlayer === 'w' ? gameState.whiteKingMoved : gameState.blackKingMoved;
    if (kingHasMoved) return false;
    
    // 检查相关的车是否未移动过
    const rookX = toX > fromX ? 7 : 0; // 王翼易位或后翼易位
    const rookHasMoved = currentPlayer === 'w' 
      ? (rookX === 7 ? gameState.whiteKRookMoved : gameState.whiteQRookMoved)
      : (rookX === 7 ? gameState.blackKRookMoved : gameState.blackQRookMoved);
    
    return !rookHasMoved;
  }
  
  /**
   * 检查王车易位是否合法
   */
  isValidCastling(board, move, currentPlayer, gameState) {
    const { fromX, fromY, toX, toY } = move;
    
    // 检查王是否被将军
    if (this.isInCheck(board, currentPlayer)) return false;
    
    // 确定是王翼易位还是后翼易位
    const isKingside = toX > fromX;
    const rookX = isKingside ? 7 : 0;
    const direction = isKingside ? 1 : -1;
    
    // 检查王移动路径上是否有棋子
    for (let x = fromX + direction; x !== rookX; x += direction) {
      if (board[fromY][x] !== '') return false;
    }
    
    // 检查王经过的格子是否被攻击
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    for (let x = fromX; x !== toX + direction; x += direction) {
      // 检查该格子是否被对方攻击
      if (this.isSquareAttacked(board, { x, y: fromY }, opponentColor)) return false;
    }
    
    return true;
  }
  
  /**
   * 检查指定格子是否被对方攻击
   */
  isSquareAttacked(board, square, opponentColor) {
    const { x, y } = square;
    
    // 检查对方所有棋子是否可以攻击到该格子
    for (let fromY = 0; fromY < 8; fromY++) {
      for (let fromX = 0; fromX < 8; fromX++) {
        const piece = board[fromY][fromX];
        if (piece && piece[0] === opponentColor) {
          const move = {
            fromX, fromY, toX: x, toY: y, piece
          };
          
          // 检查该棋子是否可以移动到目标格子（跳过将军检查）
          if (this.isValidMove(board, move, opponentColor, {}, { skipCheckCheck: true })) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 执行王车易位
   */
  executeCastling(board, move) {
    const { fromX, fromY, toX, toY } = move;
    const tempBoard = this.cloneBoard(board);
    
    // 移动王
    tempBoard[toY][toX] = tempBoard[fromY][fromX];
    tempBoard[fromY][fromX] = '';
    
    // 移动车
    const isKingside = toX > fromX;
    const rookX = isKingside ? 7 : 0;
    const newRookX = isKingside ? toX - 1 : toX + 1;
    
    tempBoard[fromY][newRookX] = tempBoard[fromY][rookX];
    tempBoard[fromY][rookX] = '';
    
    return tempBoard;
  }
  
  /**
   * 执行吃过路兵
   */
  executeEnPassant(board, move) {
    const { fromX, fromY, toX, toY } = move;
    const tempBoard = this.cloneBoard(board);
    
    // 移动兵
    tempBoard[toY][toX] = tempBoard[fromY][fromX];
    tempBoard[fromY][fromX] = '';
    
    // 移除被吃的兵
    tempBoard[fromY][toX] = '';
    
    return tempBoard;
  }
  
  /**
   * 检查兵是否可以升变
   */
  canPromote(board, move) {
    const { toY, piece } = move;
    if (!piece || piece[1] !== 'p') return false;
    
    // 白兵到达底线（第0行），黑兵到达底线（第7行）
    return (piece[0] === 'w' && toY === 0) || (piece[0] === 'b' && toY === 7);
  }
  
  /**
   * 执行兵的升变
   */
  promotePawn(board, move, promotionPiece = 'q') {
    const { toY, toX, piece } = move;
    const tempBoard = this.cloneBoard(board);
    
    // 将兵替换为指定的棋子
    tempBoard[toY][toX] = piece[0] + promotionPiece;
    
    return tempBoard;
  }
  
  /**
   * 检查玩家是否被将军
   */
  isInCheck(board, playerColor) {
    // 找到王的位置
    let kingPosition = null;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece === playerColor + 'k') {
          kingPosition = { x, y };
          break;
        }
      }
      if (kingPosition) break;
    }
    
    if (!kingPosition) return false;
    
    // 检查对方是否有棋子可以攻击到王
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === opponentColor) {
          const move = {
            fromX: x,
            fromY: y,
            toX: kingPosition.x,
            toY: kingPosition.y,
            piece: piece
          };
          
          // 检查对方棋子是否可以移动到王的位置
          // 传递skipCheckCheck选项以避免无限递归
          if (this.isValidMove(board, move, opponentColor, {}, { skipCheckCheck: true })) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 检查玩家是否被将死
   */
  isCheckmated(board, playerColor, gameState) {
    // 如果没有被将军，肯定不是将死
    if (!this.isInCheck(board, playerColor)) return false;
    
    // 检查是否有任何合法移动可以解除将军
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === playerColor) {
          // 尝试所有可能的移动
          for (let toY = 0; toY < 8; toY++) {
            for (let toX = 0; toX < 8; toX++) {
              const move = {
                fromX: x,
                fromY: y,
                toX: toX,
                toY: toY,
                piece: piece
              };
              
              if (this.isValidMove(board, move, playerColor, gameState)) {
                // 如果有任何合法移动，就不是将死
                return false;
              }
            }
          }
        }
      }
    }
    
    // 没有任何合法移动可以解除将军，是将死
    return true;
  }
  
  /**
   * 检查是否是困毙
   */
  isStalemate(board, playerColor, gameState) {
    // 如果被将军，不是困毙
    if (this.isInCheck(board, playerColor)) return false;
    
    // 检查是否有任何合法移动
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === playerColor) {
          // 尝试所有可能的移动
          for (let toY = 0; toY < 8; toY++) {
            for (let toX = 0; toX < 8; toX++) {
              const move = {
                fromX: x,
                fromY: y,
                toX: toX,
                toY: toY,
                piece: piece
              };
              
              if (this.isValidMove(board, move, playerColor, gameState)) {
                // 如果有任何合法移动，就不是困毙
                return false;
              }
            }
          }
        }
      }
    }
    
    // 没有任何合法移动，是困毙
    return true;
  }
  
  /**
   * 检查是否是和棋
   */
  isDraw(board, currentPlayer, gameState) {
    // 困毙
    if (this.isStalemate(board, currentPlayer, gameState)) {
      return true;
    }
    
    // 无子可胜（如双方只剩国王，或一方只剩国王，另一方只剩国王和主教/骑士）
    if (this.isInsufficientMaterial(board)) {
      return true;
    }
    
    // 五十步规则（连续50步没有吃子或移动兵）
    // 注意：halfMoves 是半回合计数，100个半回合等于50个完整回合
    if (gameState.halfMoves >= 100) {
      return true;
    }
    
    // 三次重复局面
    if (this.isThreefoldRepetition(gameState)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 检查是否是无子可胜
   */
  isInsufficientMaterial(board) {
    let whitePieces = [];
    let blackPieces = [];
    
    // 收集所有棋子
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          if (piece[0] === 'w') {
            whitePieces.push(piece[1]);
          } else {
            blackPieces.push(piece[1]);
          }
        }
      }
    }
    
    // 检查是否有足够的棋子可以获胜
    // 双方都有多个棋子，不可能是无子可胜
    if (whitePieces.length > 2 || blackPieces.length > 2) {
      return false;
    }
    
    // 双方只剩国王
    if (whitePieces.length === 1 && blackPieces.length === 1 && 
        whitePieces[0] === 'k' && blackPieces[0] === 'k') {
      return true;
    }
    
    // 一方只剩国王，另一方只剩国王和主教
    if ((whitePieces.length === 1 && blackPieces.length === 2 && 
         whitePieces[0] === 'k' && blackPieces.includes('k') && blackPieces.includes('b')) ||
        (blackPieces.length === 1 && whitePieces.length === 2 && 
         blackPieces[0] === 'k' && whitePieces.includes('k') && whitePieces.includes('b'))) {
      return true;
    }
    
    // 一方只剩国王，另一方只剩国王和骑士
    if ((whitePieces.length === 1 && blackPieces.length === 2 && 
         whitePieces[0] === 'k' && blackPieces.includes('k') && blackPieces.includes('n')) ||
        (blackPieces.length === 1 && whitePieces.length === 2 && 
         blackPieces[0] === 'k' && whitePieces.includes('k') && whitePieces.includes('n'))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 检查是否是三次重复局面
   */
  isThreefoldRepetition(gameState) {
    if (!gameState.positionHistory || gameState.positionHistory.length < 4) {
      return false;
    }
    
    const currentPosition = gameState.positionHistory[gameState.positionHistory.length - 1];
    let count = 0;
    
    // 检查整个历史记录中是否有当前位置的重复
    // 注意：三次重复局面需要是在相同的玩家回合下
    for (let i = 0; i < gameState.positionHistory.length - 1; i++) {
      if (this.arePositionsEqual(gameState.positionHistory[i], currentPosition)) {
        count++;
        if (count >= 2) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 比较两个棋盘位置是否相同
   */
  arePositionsEqual(pos1, pos2) {
    // 检查pos1和pos2是否都是字符串，如果是，直接比较
    if (typeof pos1 === 'string' && typeof pos2 === 'string') {
      return pos1 === pos2;
    }
    
    // 如果是数组，逐个比较
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (pos1[y][x] !== pos2[y][x]) {
          return false;
        }
      }
    }
    return true;
  }
  
  /**
   * 获取所有合法移动
   */
  getAllValidMoves(board, playerColor, gameState) {
    const validMoves = [];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece[0] === playerColor) {
          // 尝试所有可能的移动
          for (let toY = 0; toY < 8; toY++) {
            for (let toX = 0; toX < 8; toX++) {
              const move = {
                fromX: x,
                fromY: y,
                toX: toX,
                toY: toY,
                piece: piece
              };
              
              if (this.isValidMove(board, move, playerColor, gameState)) {
                validMoves.push(move);
              }
            }
          }
        }
      }
    }
    
    return validMoves;
  }
  
  /**
   * 评估棋盘状态（用于AI决策）
   */
  evaluateBoard(board, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece) {
          const pieceType = piece[1];
          const pieceValue = this.pieceValues[pieceType];
          
          // 根据棋子颜色加减分数
          if (piece[0] === playerColor) {
            score += pieceValue;
            
            // 添加位置价值（如果有）
            if (this.positionValues[pieceType]) {
              // 对于黑方，需要翻转位置评估表
              const posY = piece[0] === 'w' ? y : 7 - y;
              score += this.positionValues[pieceType][posY][x];
            }
          } else {
            score -= pieceValue;
            
            // 减去对方棋子的位置价值
            if (this.positionValues[pieceType]) {
              const posY = piece[0] === 'w' ? y : 7 - y;
              score -= this.positionValues[pieceType][posY][x];
            }
          }
        }
      }
    }
    
    // 检查将军情况
    if (this.isInCheck(board, opponentColor)) {
      score += 1;
    }
    if (this.isInCheck(board, playerColor)) {
      score -= 1;
    }
    
    return score;
  }
  
  /**
   * 克隆棋盘
   */
  cloneBoard(board) {
    return board.map(row => [...row]);
  }
  
  /**
   * 将棋盘转换为字符串表示（用于存储和比较）
   */
  boardToString(board) {
    return board.map(row => row.join('')).join('\n');
  }
  
  /**
   * 将字符串转换为棋盘
   */
  stringToBoard(boardString) {
    return boardString.split('\n').map(row => row.split(''));
  }
}