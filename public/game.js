// 游戏客户端
let ws = null;
let playerId = null;
let playerName = '';
let currentRoom = null;
let gameState = null;
let myColor = null;
let selectedCell = null;
let validMoves = [];
let isAIGame = false;
let aiColor = null;

// 游戏类型配置
const gameConfigs = {
    gomoku: { name: '五子棋', rows: 15, cols: 15 },
    go: { name: '围棋', rows: 19, cols: 19 },
    chineseChess: { name: '中国象棋', rows: 10, cols: 9 },
    chess: { name: '国际象棋', rows: 8, cols: 8 },
    checkers: { name: '跳棋', rows: 8, cols: 8 },
    othello: { name: '黑白棋', rows: 8, cols: 8 },
    flightChess: { name: '飞行棋', rows: 1, cols: 1 },
    poker: { name: '21点', rows: 1, cols: 1 },
    texasHoldem: { name: '德州扑克', rows: 1, cols: 1 },
    zhaJinHua: { name: '炸金花', rows: 1, cols: 1 },
    douDiZhu: { name: '斗地主', rows: 1, cols: 1 }
};

// 棋子显示
const pieceSymbols = {
    chineseChess: {
        general: { red: '帅', black: '将' },
        advisor: { red: '仕', black: '士' },
        elephant: { red: '相', black: '象' },
        horse: { red: '马', black: '馬' },
        chariot: { red: '车', black: '車' },
        cannon: { red: '炮', black: '砲' },
        soldier: { red: '兵', black: '卒' }
    },
    chess: {
        king: { white: '♔', black: '♚' },
        queen: { white: '♕', black: '♛' },
        rook: { white: '♖', black: '♜' },
        bishop: { white: '♗', black: '♝' },
        knight: { white: '♘', black: '♞' },
        pawn: { white: '♙', black: '♟' }
    }
};

// 连接WebSocket
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('已连接到服务器');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
    
    ws.onclose = () => {
        console.log('连接已断开');
        setTimeout(() => {
            if (playerId) {
                connect();
            }
        }, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
    };
}

// 处理服务器消息
function handleMessage(message) {
    const { type, payload } = message;
    
    switch (type) {
        case 'joined':
            playerId = payload.playerId;
            playerName = payload.name;
            break;
            
        case 'roomCreated':
            showRoomScreen();
            currentRoom = payload.roomCode;
            document.getElementById('room-code-display').textContent = payload.roomCode;
            document.getElementById('ai-options').style.display = 'block';
            break;
            
        case 'joinedRoom':
            showRoomScreen();
            currentRoom = payload.roomState.roomCode;
            myColor = payload.yourColor;
            document.getElementById('room-code-display').textContent = payload.roomState.roomCode;
            updateRoomState(payload.roomState);
            renderBoard();
            break;
            
        case 'playerJoined':
        case 'playerLeft':
        case 'playerReady':
            updateRoomState(payload.roomState);
            break;
            
        case 'gameStart':
            gameState = payload.gameState;
            document.getElementById('ready-btn').style.display = 'none';
            updateGameStatus();
            renderBoard();
            break;
            
        case 'moveMade':
            gameState = payload.gameState;
            selectedCell = null;
            validMoves = [];
            updateGameStatus();
            renderBoard();
            
            if (payload.winner) {
                showWinner(payload.winner);
            } else if (isAIGame && gameState.currentPlayer === aiColor) {
                // AI回合
                setTimeout(() => requestAIMove(), 500);
            }
            break;
            
        case 'aiGameCreated':
            isAIGame = true;
            currentRoom = payload.roomCode;
            myColor = payload.yourColor;
            aiColor = payload.aiColor;
            gameState = payload.gameState;
            showRoomScreen();
            document.getElementById('room-code-display').textContent = 'AI对战';
            document.getElementById('ready-btn').style.display = 'none';
            updateGameStatus();
            renderBoard();
            
            if (myColor === 'white') {
                setTimeout(() => requestAIMove(), 500);
            }
            break;
            
        case 'aiMoveMade':
            gameState = payload.gameState;
            updateGameStatus();
            renderBoard();
            
            if (payload.winner) {
                showWinner(payload.winner);
            }
            break;
            
        case 'invalidMove':
            alert(payload.message);
            break;
            
        case 'error':
            alert(payload.message);
            break;
            
        case 'chat':
            addChatMessage(payload.playerName, payload.message);
            break;
            
        case 'gameRestart':
            gameState = null;
            document.getElementById('ready-btn').style.display = 'inline-block';
            document.getElementById('ready-btn').textContent = '准备';
            updateRoomState(payload.roomState);
            renderBoard();
            break;
    }
}

// 发送消息
function send(type, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
}

// 加入游戏
function joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || `玩家${Math.floor(Math.random() * 10000)}`;
    playerName = name;
    
    connect();
    
    setTimeout(() => {
        send('join', { name });
        showLobby();
        document.getElementById('welcome-text').textContent = `欢迎, ${name}!`;
    }, 500);
}

// 直接加入房间
function joinRoomDirect() {
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (code.length !== 6) {
        alert('请输入6位房间码');
        return;
    }
    
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || `玩家${Math.floor(Math.random() * 10000)}`;
    playerName = name;
    
    connect();
    
    setTimeout(() => {
        send('join', { name });
        setTimeout(() => {
            send('joinRoom', { roomCode: code, playerName: name });
        }, 200);
    }, 500);
}

// 创建房间
function createRoom(gameType) {
    send('createRoom', { gameType, playerName });
}

// 显示加入房间模态框
function showJoinModal() {
    document.getElementById('join-modal').classList.add('active');
}

// 关闭加入房间模态框
function closeJoinModal() {
    document.getElementById('join-modal').classList.remove('active');
}

// 从模态框加入房间
function joinRoomFromModal() {
    const code = document.getElementById('modal-room-code').value.trim().toUpperCase();
    if (code.length !== 6) {
        alert('请输入6位房间码');
        return;
    }
    
    send('joinRoom', { roomCode: code, playerName });
    closeJoinModal();
}

// 离开房间
function leaveRoom() {
    send('leaveRoom');
    currentRoom = null;
    gameState = null;
    myColor = null;
    isAIGame = false;
    showLobby();
}

// 准备/取消准备
function toggleReady() {
    send('ready');
}

// 更新房间状态
function updateRoomState(roomState) {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';
    
    roomState.players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        
        const colorDot = document.createElement('div');
        colorDot.className = 'color-dot';
        colorDot.style.background = getColorValue(player.color);
        
        const name = document.createElement('span');
        name.textContent = player.name + (player.id === playerId ? ' (你)' : '');
        
        const badge = document.createElement('span');
        badge.className = 'ready-badge ' + (player.ready ? 'ready' : 'not-ready');
        badge.textContent = player.ready ? '已准备' : '未准备';
        
        div.appendChild(colorDot);
        div.appendChild(name);
        div.appendChild(badge);
        playerList.appendChild(div);
    });
    
    // 更新准备按钮状态
    const me = roomState.players.find(p => p.id === playerId);
    if (me) {
        document.getElementById('ready-btn').textContent = me.ready ? '取消准备' : '准备';
    }
}

// 获取颜色值
function getColorValue(color) {
    const colors = {
        black: '#333',
        white: '#fff',
        red: '#e74c3c',
        blue: '#3498db',
        green: '#27ae60',
        yellow: '#f1c40f'
    };
    return colors[color] || '#888';
}

// 更新游戏状态显示
function updateGameStatus() {
    const turnDiv = document.getElementById('game-turn');
    
    if (!gameState) {
        turnDiv.textContent = '等待玩家加入...';
        return;
    }
    
    const currentColor = gameState.currentPlayer;
    const colorName = {
        black: '黑方',
        white: '白方',
        red: '红方',
        blue: '蓝方',
        green: '绿方',
        yellow: '黄方'
    };
    
    if (myColor === currentColor) {
        turnDiv.textContent = '轮到你了！';
        turnDiv.style.color = '#27ae60';
    } else {
        turnDiv.textContent = `等待${colorName[currentColor] || currentColor}...`;
        turnDiv.style.color = '#f39c12';
    }
}

// 渲染棋盘
function renderBoard() {
    const container = document.getElementById('board-container');
    
    if (!currentRoom || !gameConfigs[currentRoom.gameType]) {
        container.innerHTML = '<p style="color: #888;">等待游戏开始...</p>';
        return;
    }
    
    const config = gameConfigs[currentRoom.gameType];
    
    switch (currentRoom.gameType) {
        case 'gomoku':
            renderGomokuBoard(container, config);
            break;
        case 'go':
            renderGoBoard(container, config);
            break;
        case 'chineseChess':
            renderChineseChessBoard(container, config);
            break;
        case 'chess':
            renderChessBoard(container, config);
            break;
        case 'checkers':
            renderCheckersBoard(container, config);
            break;
        case 'othello':
            renderOthelloBoard(container, config);
            break;
        case 'flightChess':
            renderFlightChessBoard(container);
            break;
        case 'poker': renderPokerBoard(container); break;
        case 'texasHoldem': renderTexasHoldemBoard(container); break;
        case 'zhaJinHua': renderZhaJinHuaBoard(container); break;
        case 'douDiZhu': renderDouDiZhuBoard(container); break;
    }
}

// 渲染五子棋棋盘
function renderGomokuBoard(container, config) {
    const cellSize = 35;
    const boardSize = cellSize * (config.cols - 1) + 40;
    
    let html = `<div class="board" style="width: ${boardSize}px; height: ${boardSize}px; padding: 20px;">`;
    
    // 绘制网格线
    html += '<svg style="position: absolute; top: 20px; left: 20px;" width="' + (boardSize - 40) + '" height="' + (boardSize - 40) + '">';
    for (let i = 0; i < config.rows; i++) {
        html += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${(config.rows - 1) * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
        html += `<line x1="0" y1="${i * cellSize}" x2="${(config.cols - 1) * cellSize}" y2="${i * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
    }
    // 星位
    const starPoints = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
    starPoints.forEach(([r, c]) => {
        html += `<circle cx="${c * cellSize}" cy="${r * cellSize}" r="4" fill="#8b4513"/>`;
    });
    html += '</svg>';
    
    // 棋子
    if (gameState && gameState.board) {
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const piece = gameState.board[r][c];
                if (piece) {
                    html += `<div class="piece ${piece}" style="position: absolute; left: ${c * cellSize + 20 - cellSize/2 + 2}px; top: ${r * cellSize + 20 - cellSize/2 + 2}px; width: ${cellSize - 4}px; height: ${cellSize - 4}px;"></div>`;
                }
            }
        }
    }
    
    // 点击区域
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
            html += `<div class="board-cell ${isSelected ? 'selected' : ''}" style="left: ${c * cellSize + 20 - cellSize/2}px; top: ${r * cellSize + 20 - cellSize/2}px; width: ${cellSize}px; height: ${cellSize}px;" onclick="handleGomokuClick(${r}, ${c})"></div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 处理五子棋点击
function handleGomokuClick(row, col) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    if (gameState.board[row][col]) return;
    
    send('move', { to: { row, col } });
}

// 渲染围棋棋盘
function renderGoBoard(container, config) {
    const cellSize = 28;
    const boardSize = cellSize * (config.cols - 1) + 40;
    
    let html = `<div class="board" style="width: ${boardSize}px; height: ${boardSize}px; padding: 20px; background: #dcb35c;">`;
    
    // 绘制网格线
    html += '<svg style="position: absolute; top: 20px; left: 20px;" width="' + (boardSize - 40) + '" height="' + (boardSize - 40) + '">';
    for (let i = 0; i < config.rows; i++) {
        html += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${(config.rows - 1) * cellSize}" stroke="#000" stroke-width="1"/>`;
        html += `<line x1="0" y1="${i * cellSize}" x2="${(config.cols - 1) * cellSize}" y2="${i * cellSize}" stroke="#000" stroke-width="1"/>`;
    }
    // 星位
    const starPoints = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
    starPoints.forEach(([r, c]) => {
        html += `<circle cx="${c * cellSize}" cy="${r * cellSize}" r="3" fill="#000"/>`;
    });
    html += '</svg>';
    
    // 棋子
    if (gameState && gameState.board) {
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const piece = gameState.board[r][c];
                if (piece) {
                    html += `<div class="piece ${piece}" style="position: absolute; left: ${c * cellSize + 20 - cellSize/2 + 2}px; top: ${r * cellSize + 20 - cellSize/2 + 2}px; width: ${cellSize - 4}px; height: ${cellSize - 4}px;"></div>`;
                }
            }
        }
    }
    
    // 点击区域
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            html += `<div class="board-cell" style="left: ${c * cellSize + 20 - cellSize/2}px; top: ${r * cellSize + 20 - cellSize/2}px; width: ${cellSize}px; height: ${cellSize}px;" onclick="handleGoClick(${r}, ${c})"></div>`;
        }
    }
    
    // 跳过按钮
    html += `<button class="btn btn-secondary" style="position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%);" onclick="handleGoPass()">跳过 (Pass)</button>`;
    
    html += '</div>';
    container.innerHTML = html;
}

// 处理围棋点击
function handleGoClick(row, col) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    if (gameState.board[row][col]) return;
    
    send('move', { to: { row, col } });
}

// 围棋跳过
function handleGoPass() {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    send('move', { to: null });
}

// 渲染中国象棋棋盘
function renderChineseChessBoard(container, config) {
    const cellSize = 50;
    const boardWidth = cellSize * (config.cols - 1) + 40;
    const boardHeight = cellSize * (config.rows - 1) + 40;
    
    let html = `<div class="board chinese-chess-board" style="width: ${boardWidth}px; height: ${boardHeight}px; padding: 20px; position: relative;">`;
    
    // 绘制网格线
    html += '<svg style="position: absolute; top: 20px; left: 20px;" width="' + (boardWidth - 40) + '" height="' + (boardHeight - 40) + '">';
    
    // 横线
    for (let i = 0; i < config.rows; i++) {
        html += `<line x1="0" y1="${i * cellSize}" x2="${(config.cols - 1) * cellSize}" y2="${i * cellSize}" stroke="#8b4513" stroke-width="2"/>`;
    }
    
    // 竖线
    for (let i = 0; i < config.cols; i++) {
        if (i === 0 || i === config.cols - 1) {
            html += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${(config.rows - 1) * cellSize}" stroke="#8b4513" stroke-width="2"/>`;
        } else {
            html += `<line x1="${i * cellSize}" y1="0" x2="${i * cellSize}" y2="${4 * cellSize}" stroke="#8b4513" stroke-width="2"/>`;
            html += `<line x1="${i * cellSize}" y1="${5 * cellSize}" x2="${i * cellSize}" y2="${(config.rows - 1) * cellSize}" stroke="#8b4513" stroke-width="2"/>`;
        }
    }
    
    // 九宫格斜线
    html += `<line x1="${3 * cellSize}" y1="0" x2="${5 * cellSize}" y2="${2 * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
    html += `<line x1="${5 * cellSize}" y1="0" x2="${3 * cellSize}" y2="${2 * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
    html += `<line x1="${3 * cellSize}" y1="${7 * cellSize}" x2="${5 * cellSize}" y2="${9 * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
    html += `<line x1="${5 * cellSize}" y1="${7 * cellSize}" x2="${3 * cellSize}" y2="${9 * cellSize}" stroke="#8b4513" stroke-width="1"/>`;
    
    // 楚河汉界
    html += `<text x="${(boardWidth - 40) / 2}" y="${4.5 * cellSize + 5}" text-anchor="middle" font-size="20" fill="#8b4513">楚河          汉界</text>`;
    
    html += '</svg>';
    
    // 棋子
    if (gameState && gameState.board) {
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                const piece = gameState.board[r][c];
                if (piece) {
                    const symbol = pieceSymbols.chineseChess[piece.type][piece.color];
                    const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
                    html += `<div class="piece ${piece.color} ${isSelected ? 'selected' : ''}" style="position: absolute; left: ${c * cellSize + 20 - cellSize/2 + 3}px; top: ${r * cellSize + 20 - cellSize/2 + 3}px; width: ${cellSize - 6}px; height: ${cellSize - 6}px; font-size: 20px;" onclick="handleChessPieceClick(${r}, ${c})">${symbol}</div>`;
                }
            }
        }
    }
    
    // 有效移动位置
    validMoves.forEach(move => {
        html += `<div class="board-cell valid-move" style="left: ${move.col * cellSize + 20 - cellSize/2}px; top: ${move.row * cellSize + 20 - cellSize/2}px; width: ${cellSize}px; height: ${cellSize}px;" onclick="handleChessMove(${move.row}, ${move.col})"></div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// 渲染国际象棋棋盘
function renderChessBoard(container, config) {
    const cellSize = 60;
    
    let html = `<div class="board chess-board" style="width: ${cellSize * 8}px; height: ${cellSize * 8}px;">`;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const isLight = (r + c) % 2 === 0;
            const piece = gameState && gameState.board[r] && gameState.board[r][c];
            const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
            const isValidMove = validMoves.some(m => m.row === r && m.col === c);
            
            let cellClass = `cell ${isLight ? 'light' : 'dark'}`;
            if (isSelected) cellClass += ' selected';
            if (isValidMove) cellClass += ' valid-move';
            
            let content = '';
            if (piece) {
                content = pieceSymbols.chess[piece.type][piece.color];
            }
            
            html += `<div class="${cellClass}" style="width: ${cellSize}px; height: ${cellSize}px; font-size: ${cellSize * 0.7}px;" onclick="handleChessPieceClick(${r}, ${c})">${content}</div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 处理象棋/国际象棋棋子点击
function handleChessPieceClick(row, col) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    
    const piece = gameState.board[row][col];
    
    // 如果点击的是自己的棋子，选中它
    if (piece && piece.color === myColor) {
        selectedCell = { row, col };
        validMoves = calculateValidMoves(row, col, piece);
        renderBoard();
        return;
    }
    
    // 如果已选中棋子且点击的是有效移动位置
    if (selectedCell && validMoves.some(m => m.row === row && m.col === col)) {
        send('move', { from: selectedCell, to: { row, col } });
        selectedCell = null;
        validMoves = [];
    }
}

// 处理移动
function handleChessMove(row, col) {
    if (selectedCell) {
        send('move', { from: selectedCell, to: { row, col } });
        selectedCell = null;
        validMoves = [];
    }
}

// 计算有效移动（简化版，实际应该在后端验证）
function calculateValidMoves(row, col, piece) {
    const moves = [];
    const board = gameState.board;
    
    if (currentRoom.gameType === 'chineseChess') {
        // 中国象棋移动规则
        switch (piece.type) {
            case 'general':
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    const nr = row + dr, nc = col + dc;
                    if (nc >= 3 && nc <= 5) {
                        if (piece.color === 'red' && nr >= 7 && nr <= 9) moves.push({ row: nr, col: nc });
                        if (piece.color === 'black' && nr >= 0 && nr <= 2) moves.push({ row: nr, col: nc });
                    }
                });
                break;
            case 'chariot':
                // 车：直线移动
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    for (let i = 1; i < 10; i++) {
                        const nr = row + dr * i, nc = col + dc * i;
                        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) break;
                        if (board[nr][nc]) {
                            if (board[nr][nc].color !== piece.color) moves.push({ row: nr, col: nc });
                            break;
                        }
                        moves.push({ row: nr, col: nc });
                    }
                });
                break;
            case 'horse':
                [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]].forEach(([dr, dc]) => {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        // 检查蹩马腿
                        let legR, legC;
                        if (Math.abs(dr) === 2) { legR = row + dr / 2; legC = col; }
                        else { legR = row; legC = col + dc / 2; }
                        if (!board[legR][legC]) {
                            if (!board[nr][nc] || board[nr][nc].color !== piece.color) {
                                moves.push({ row: nr, col: nc });
                            }
                        }
                    }
                });
                break;
            case 'cannon':
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    let jumped = false;
                    for (let i = 1; i < 10; i++) {
                        const nr = row + dr * i, nc = col + dc * i;
                        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 9) break;
                        if (board[nr][nc]) {
                            if (jumped) {
                                if (board[nr][nc].color !== piece.color) moves.push({ row: nr, col: nc });
                                break;
                            }
                            jumped = true;
                        } else if (!jumped) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                });
                break;
            default:
                // 其他棋子简化处理
                [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
                        if (!board[nr][nc] || board[nr][nc].color !== piece.color) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                });
        }
    } else if (currentRoom.gameType === 'chess') {
        // 国际象棋移动规则
        switch (piece.type) {
            case 'pawn':
                const dir = piece.color === 'white' ? -1 : 1;
                const startRow = piece.color === 'white' ? 6 : 1;
                // 前进
                if (!board[row + dir]?.[col]) {
                    moves.push({ row: row + dir, col });
                    if (row === startRow && !board[row + 2 * dir]?.[col]) {
                        moves.push({ row: row + 2 * dir, col });
                    }
                }
                // 斜吃
                [-1, 1].forEach(dc => {
                    const nr = row + dir, nc = col + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (board[nr][nc]?.color && board[nr][nc].color !== piece.color) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                });
                break;
            case 'rook':
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const nr = row + dr * i, nc = col + dc * i;
                        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                        if (board[nr][nc]) {
                            if (board[nr][nc].color !== piece.color) moves.push({ row: nr, col: nc });
                            break;
                        }
                        moves.push({ row: nr, col: nc });
                    }
                });
                break;
            case 'knight':
                [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]].forEach(([dr, dc]) => {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (!board[nr][nc] || board[nr][nc].color !== piece.color) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                });
                break;
            case 'bishop':
                [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const nr = row + dr * i, nc = col + dc * i;
                        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                        if (board[nr][nc]) {
                            if (board[nr][nc].color !== piece.color) moves.push({ row: nr, col: nc });
                            break;
                        }
                        moves.push({ row: nr, col: nc });
                    }
                });
                break;
            case 'queen':
                [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const nr = row + dr * i, nc = col + dc * i;
                        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                        if (board[nr][nc]) {
                            if (board[nr][nc].color !== piece.color) moves.push({ row: nr, col: nc });
                            break;
                        }
                        moves.push({ row: nr, col: nc });
                    }
                });
                break;
            case 'king':
                [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        if (!board[nr][nc] || board[nr][nc].color !== piece.color) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                });
                break;
        }
    }
    
    return moves;
}

// 渲染跳棋棋盘
function renderCheckersBoard(container, config) {
    const cellSize = 60;
    
    let html = `<div class="board checkers-board" style="width: ${cellSize * 8}px; height: ${cellSize * 8}px;">`;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const isLight = (r + c) % 2 === 0;
            const piece = gameState && gameState.board[r] && gameState.board[r][c];
            const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
            
            let cellClass = `cell ${isLight ? 'light' : 'dark'}`;
            if (isSelected) cellClass += ' selected';
            
            let content = '';
            if (piece) {
                content = `<div class="piece ${piece.color}" style="width: ${cellSize - 10}px; height: ${cellSize - 10}px;">${piece.king ? '👑' : ''}</div>`;
            }
            
            html += `<div class="${cellClass}" style="width: ${cellSize}px; height: ${cellSize}px;" onclick="handleCheckersClick(${r}, ${c})">${content}</div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 处理跳棋点击
function handleCheckersClick(row, col) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    
    const piece = gameState.board[row][col];
    
    if (piece && piece.color === myColor) {
        selectedCell = { row, col };
        renderBoard();
        return;
    }
    
    if (selectedCell) {
        const dx = col - selectedCell.col;
        const dy = row - selectedCell.row;
        
        if ((Math.abs(dx) === 1 && Math.abs(dy) === 1) || (Math.abs(dx) === 2 && Math.abs(dy) === 2)) {
            send('move', { from: selectedCell, to: { row, col } });
            selectedCell = null;
        }
    }
}

// 渲染黑白棋棋盘
function renderOthelloBoard(container, config) {
    const cellSize = 60;
    
    let html = `<div class="board othello-board" style="width: ${cellSize * 8}px; height: ${cellSize * 8}px; display: grid; grid-template-columns: repeat(8, 1fr);">`;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = gameState && gameState.board[r] && gameState.board[r][c];
            
            let content = '';
            if (piece) {
                content = `<div class="piece ${piece}" style="width: ${cellSize - 10}px; height: ${cellSize - 10}px;"></div>`;
            }
            
            html += `<div class="cell" style="width: ${cellSize}px; height: ${cellSize}px; display: flex; align-items: center; justify-content: center;" onclick="handleOthelloClick(${r}, ${c})">${content}</div>`;
        }
    }
    
    html += '</div>';
    
    // 显示分数
    if (gameState && gameState.scores) {
        html += `<div style="text-align: center; margin-top: 20px; font-size: 1.2em;">
            <span style="color: #333;">⚫ 黑: ${gameState.scores.black}</span>
            <span style="margin: 0 20px;">|</span>
            <span style="color: #fff;">⚪ 白: ${gameState.scores.white}</span>
        </div>`;
    }
    
    container.innerHTML = html;
}

// 处理黑白棋点击
function handleOthelloClick(row, col) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    if (gameState.board[row][col]) return;
    
    send('move', { to: { row, col } });
}

// 渲染飞行棋棋盘
function renderFlightChessBoard(container) {
    let html = '<div class="flight-chess-board">';
    
    // 四个颜色的区域
    const colors = ['red', 'blue', 'yellow', 'green'];
    const positions = ['top: 0; left: 0;', 'top: 0; right: 0;', 'bottom: 0; left: 0;', 'bottom: 0; right: 0;'];
    
    colors.forEach((color, i) => {
        html += `<div class="flight-zone ${color}" style="${positions[i]}">`;
        for (let j = 0; j < 4; j++) {
            const pos = gameState?.positions?.[color]?.[j];
            const isHome = pos === -1;
            html += `<div class="flight-plane ${color}" onclick="handleFlightClick('${color}', ${j})" style="opacity: ${isHome ? 0.5 : 1};">${j + 1}</div>`;
        }
        html += '</div>';
    });
    
    // 中间跑道
    html += '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center;">';
    html += '<div style="text-align: center;">';
    
    // 骰子
    const diceValue = gameState?.dice || 1;
    html += `<div class="dice" onclick="rollDice()">${diceValue}</div>`;
    html += '<p style="margin-top: 10px; color: #333;">点击掷骰子</p>';
    
    html += '</div></div>';
    
    html += '</div>';
    container.innerHTML = html;
}

// 掷骰子
function rollDice() {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    
    const dice = Math.floor(Math.random() * 6) + 1;
    // 这里简化处理，实际应该发送到服务器
    alert(`你掷出了 ${dice}`);
}

// 处理飞行棋点击
function handleFlightClick(color, planeIndex) {
    if (!gameState || gameState.currentPlayer !== myColor) return;
    if (color !== myColor) return;
    
    send('move', { from: planeIndex, to: null, extra: { dice: Math.floor(Math.random() * 6) + 1 } });
}

// 显示胜利
function showWinner(winner) {
    const overlay = document.getElementById('winner-overlay');
    const text = document.getElementById('winner-text');
    
    const colorNames = {
        black: typeof t === 'function' ? t('color_black') : '黑方',
        white: typeof t === 'function' ? t('color_white') : '白方',
        red: typeof t === 'function' ? t('color_red') : '红方',
        blue: typeof t === 'function' ? t('color_blue') : '蓝方',
        green: typeof t === 'function' ? t('color_green') : '绿方',
        yellow: typeof t === 'function' ? t('color_yellow') : '黄方'
    };
    
    if (winner === myColor) {
        text.textContent = typeof t === 'function' ? t('win_congrats') : '🎉 恭喜你获胜！';
    } else if (winner === 'draw') {
        text.textContent = typeof t === 'function' ? t('win_draw') : '🤝 平局！';
    } else {
        const colorName = colorNames[winner] || winner;
        text.textContent = (typeof t === 'function' ? t('win_opponent', { color: colorName }) : `😢 ${colorName}获胜`);
    }
    
    overlay.classList.add('active');
}

// 重新开始
function restartGame() {
    document.getElementById('winner-overlay').classList.remove('active');
    send('restart');
}

// 返回大厅
function backToLobby() {
    document.getElementById('winner-overlay').classList.remove('active');
    leaveRoom();
}

// 聊天功能
function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (message) {
        send('chat', { message });
        input.value = '';
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChat();
    }
}

function addChatMessage(name, message) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `<span class="name">${name}:</span> ${escapeHtml(message)}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// HTML转义防止XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// AI对战
function selectAIColor(color) {
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.color-option.${color}`).classList.add('selected');
}

function startAIGame() {
    const selectedColor = document.querySelector('.color-option.selected');
    const color = selectedColor?.classList.contains('white') ? 'white' : 'black';
    const difficulty = document.getElementById('ai-difficulty')?.value || 'normal';
    send('playWithAI', { gameType: currentRoom.gameType, playerName, playerColor: color, difficulty });
}

function requestAIMove() {
    send('aiMove');
}

// 界面切换
function showLobby() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('room-screen').style.display = 'none';
    document.getElementById('lang-switch-bar').style.display = 'block';
    
    // 更新欢迎文本
    const welcomeText = document.getElementById('welcome-text');
    if (typeof t === 'function') {
        welcomeText.textContent = t('lobby_welcome') + ', ' + playerName + '!';
    } else {
        welcomeText.textContent = `欢迎, ${playerName}!`;
    }
}

function showRoomScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('room-screen').style.display = 'block';
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 自动以游客身份进入游戏，无需登录
    const savedLang = localStorage.getItem('selectedLanguage') || 'zh-CN';
    if (typeof applyLanguage === 'function') {
        applyLanguage(savedLang);
    }
    // 隐藏语言选择和登录界面，直接进入大厅
    const langScreen = document.getElementById('lang-screen');
    const loginScreen = document.getElementById('login-screen');
    if (langScreen) langScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    
    // 自动生成游客昵称并连接
    const guestName = '玩家' + Math.floor(Math.random() * 9000 + 1000);
    playerName = guestName;
    const nameInput = document.getElementById('player-name');
    if (nameInput) nameInput.value = guestName;
    connect();
    // 发送join消息
    setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'join', name: guestName }));
            showLobby();
        }
    }, 500);
});

function renderPokerBoard(container) {
    if (!gameState) return;
    
    const isPlayerTurn = gameState.currentPlayer === 'player' && gameState.status === 'playing';
    const gameEnded = gameState.status === 'ended';
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12; margin-bottom: 20px;">🃏 21点 Blackjack</h2>
            
            <!-- AI手牌 -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #aaa; margin-bottom: 10px;">🤖 AI ${gameEnded ? '(' + gameState.aiScore + '点)' : ''}</h3>
                <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    ${gameState.aiHand.map((card, i) => {
                        if (!gameEnded && i > 0) {
                            return '<div style="width: 70px; height: 100px; background: linear-gradient(135deg, #e94560, #c0392b); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 2px solid #fff;">🂠</div>';
                        }
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 70px; height: 100px; background: #fff; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 18px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 24px; font-weight: bold;">' + card.value + '</span><span style="font-size: 20px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
            
            <!-- 玩家手牌 -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #f39c12; margin-bottom: 10px;">👤 玩家 (${gameState.playerScore}点)</h3>
                <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    ${gameState.playerHand.map(card => {
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 70px; height: 100px; background: #fff; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 18px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 24px; font-weight: bold;">' + card.value + '</span><span style="font-size: 20px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
            
            <!-- 操作按钮 -->
            ${!gameEnded ? `
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
                    ${isPlayerTurn ? `
                        <button onclick="pokerHit()" style="padding: 15px 40px; font-size: 1.2em; background: linear-gradient(90deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold;">🃏 要牌</button>
                        <button onclick="pokerStand()" style="padding: 15px 40px; font-size: 1.2em; background: linear-gradient(90deg, #e94560, #c0392b); color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold;">✋ 停牌</button>
                    ` : '<p style="color: #aaa; font-size: 1.1em;">AI正在思考...</p>'}
                </div>
            ` : ''}
            
            <!-- 结果消息 -->
            ${gameState.message ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                    <p style="font-size: 1.3em; color: ${gameState.winner === 'player' ? '#2ecc71' : gameState.winner === 'ai' ? '#e74c3c' : '#f39c12'}; font-weight: bold;">${gameState.message}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function pokerHit() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', action: 'hit' }));
}

function pokerStand() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', action: 'stand' }));
}

// ==================== 德州扑克渲染 ====================
function renderTexasHoldemBoard(container) {
    if (!gameState) return;
    
    const isPlayerTurn = gameState.currentPlayer === 'player' && gameState.status === 'playing';
    const gameEnded = gameState.status === 'ended';
    
    // 渲染公共牌
    let communityCardsHtml = '';
    if (gameState.communityCards && gameState.communityCards.length > 0) {
        communityCardsHtml = `
            <div style="margin: 20px 0;">
                <h4 style="color: #aaa; margin-bottom: 10px;">公共牌</h4>
                <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    ${gameState.communityCards.map(card => {
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 60px; height: 85px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 20px; font-weight: bold;">' + card.value + '</span><span style="font-size: 16px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染AI手牌
    let aiHandHtml = '';
    if (gameEnded) {
        aiHandHtml = gameState.aiHand.map(card => {
            const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
            return '<div style="width: 60px; height: 85px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 20px; font-weight: bold;">' + card.value + '</span><span style="font-size: 16px;">' + card.suit + '</span></div>';
        }).join('');
    } else {
        aiHandHtml = '<div style="width: 60px; height: 85px; background: linear-gradient(135deg, #e94560, #c0392b); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #fff;">🂠</div><div style="width: 60px; height: 85px; background: linear-gradient(135deg, #e94560, #c0392b); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #fff;">🂠</div>';
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; max-width: 700px; margin: 0 auto;">
            <h2 style="color: #f39c12; margin-bottom: 15px;">🃏 德州扑克 Texas Hold'em</h2>
            
            <!-- 游戏信息 -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                <span style="color: #f39c12;">底池: ${gameState.pot}</span>
                <span style="color: #aaa;">轮次: ${getRoundName(gameState.round)}</span>
            </div>
            
            <!-- AI区域 -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #aaa; margin-bottom: 10px;">🤖 AI (筹码: ${gameState.aiChips})</h3>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    ${aiHandHtml}
                </div>
            </div>
            
            <!-- 公共牌 -->
            ${communityCardsHtml}
            
            <!-- 玩家区域 -->
            <div style="margin: 20px 0;">
                <h3 style="color: #f39c12; margin-bottom: 10px;">👤 玩家 (筹码: ${gameState.playerChips})</h3>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    ${gameState.playerHand.map(card => {
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 60px; height: 85px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 20px; font-weight: bold;">' + card.value + '</span><span style="font-size: 16px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
            
            <!-- 操作按钮 -->
            ${!gameEnded && isPlayerTurn ? `
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="texasHoldemFold()" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #e74c3c, #c0392b); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">弃牌</button>
                    <button onclick="texasHoldemCheck()" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #3498db, #2980b9); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">过牌</button>
                    <button onclick="texasHoldemCall()" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">跟注</button>
                    <button onclick="texasHoldemRaise()" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #f39c12, #e67e22); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">加注</button>
                    <button onclick="texasHoldemAllIn()" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #9b59b6, #8e44ad); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">全押</button>
                </div>
            ` : !gameEnded ? '<p style="color: #aaa; margin-top: 20px;">AI思考中...</p>' : ''}
            
            <!-- 消息 -->
            ${gameState.message ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                    <p style="font-size: 1.2em; color: ${gameState.winner === 'player' ? '#2ecc71' : gameState.winner === 'ai' ? '#e74c3c' : '#f39c12'}; font-weight: bold;">${gameState.message}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function getRoundName(round) {
    const names = {
        'preflop': '翻牌前',
        'flop': '翻牌',
        'turn': '转牌',
        'river': '河牌',
        'showdown': '比牌'
    };
    return names[round] || round;
}

function texasHoldemFold() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'fold' } }));
}

function texasHoldemCheck() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'check' } }));
}

function texasHoldemCall() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'call' } }));
}

function texasHoldemRaise() {
    if (!ws || !currentRoom) return;
    const amount = parseInt(prompt('请输入加注金额:', '50')) || 50;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'raise', amount: amount } }));
}

function texasHoldemAllIn() {
    if (!ws || !currentRoom) return;
    if (confirm('确定要全押吗？')) {
        ws.send(JSON.stringify({ type: 'move', extra: { action: 'allin' } }));
    }
}

// ==================== 炸金花渲染 ====================
function renderZhaJinHuaBoard(container) {
    if (!gameState) return;
    
    const isPlayerTurn = gameState.currentPlayer === 'player' && gameState.status === 'playing';
    const gameEnded = gameState.status === 'ended';
    
    // 渲染AI手牌（背面）
    let aiHandHtml = '';
    if (gameEnded) {
        aiHandHtml = gameState.aiHand.map(card => {
            const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
            return '<div style="width: 60px; height: 85px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 20px; font-weight: bold;">' + card.value + '</span><span style="font-size: 16px;">' + card.suit + '</span></div>';
        }).join('');
    } else {
        aiHandHtml = Array(3).fill('<div style="width: 60px; height: 85px; background: linear-gradient(135deg, #e94560, #c0392b); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #fff;">🂠</div>').join('');
    }
    
    // 玩家手牌（如果已看牌则显示正面）
    let playerHandHtml = '';
    if (gameState.playerSeen || gameEnded) {
        playerHandHtml = gameState.playerHand.map(card => {
            const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
            return '<div style="width: 60px; height: 85px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: ' + color + '; border: 2px solid #ddd; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><span style="font-size: 20px; font-weight: bold;">' + card.value + '</span><span style="font-size: 16px;">' + card.suit + '</span></div>';
        }).join('');
    } else {
        playerHandHtml = Array(3).fill('<div style="width: 60px; height: 85px; background: linear-gradient(135deg, #e94560, #c0392b); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #fff;">🂠</div>').join('');
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12; margin-bottom: 15px;">🃏 炸金花 Zha Jin Hua</h2>
            
            <!-- 游戏信息 -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                <span style="color: #f39c12;">底池: ${gameState.pot}</span>
                <span style="color: #aaa;">底注: ${gameState.currentBet}</span>
            </div>
            
            <!-- AI区域 -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #aaa; margin-bottom: 10px;">🤖 AI (筹码: ${gameState.aiChips})</h3>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    ${aiHandHtml}
                </div>
            </div>
            
            <!-- 玩家区域 -->
            <div style="margin: 20px 0;">
                <h3 style="color: #f39c12; margin-bottom: 10px;">👤 玩家 (筹码: ${gameState.playerChips}) ${gameState.playerSeen ? '(已看牌)' : '(未看牌)'}</h3>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    ${playerHandHtml}
                </div>
            </div>
            
            <!-- 操作按钮 -->
            ${!gameEnded && isPlayerTurn ? `
                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="zhaJinHuaFold()" style="padding: 15px 30px; font-size: 1.1em; background: linear-gradient(90deg, #e74c3c, #c0392b); color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold;">弃牌</button>
                    <button onclick="zhaJinHuaSee()" style="padding: 15px 30px; font-size: 1.1em; background: linear-gradient(90deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold;">看牌比牌</button>
                    <button onclick="zhaJinHuaBet()" style="padding: 15px 30px; font-size: 1.1em; background: linear-gradient(90deg, #f39c12, #e67e22); color: #fff; border: none; border-radius: 25px; cursor: pointer; font-weight: bold;">下注</button>
                </div>
            ` : !gameEnded ? '<p style="color: #aaa; margin-top: 20px;">AI思考中...</p>' : ''}
            
            <!-- 消息 -->
            ${gameState.message ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                    <p style="font-size: 1.2em; color: ${gameState.winner === 'player' ? '#2ecc71' : gameState.winner === 'ai' ? '#e74c3c' : '#f39c12'}; font-weight: bold;">${gameState.message}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function zhaJinHuaFold() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'fold' } }));
}

function zhaJinHuaSee() {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'see' } }));
}

function zhaJinHuaBet() {
    if (!ws || !currentRoom) return;
    const amount = parseInt(prompt('请输入下注金额:', '20')) || 20;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'bet', amount: amount } }));
}

// ==================== 斗地主渲染 ====================
function renderDouDiZhuBoard(container) {
    if (!gameState) return;
    
    const isPlayerTurn = gameState.currentPlayer === 'player' && gameState.status === 'playing';
    const gameEnded = gameState.status === 'ended';
    const isCallingPhase = gameState.phase === 'calling';
    
    // 底牌显示
    let bottomCardsHtml = '';
    if (gameState.landlord) {
        bottomCardsHtml = `
            <div style="margin: 15px 0;">
                <h4 style="color: #f39c12; margin-bottom: 10px;">底牌</h4>
                <div style="display: flex; justify-content: center; gap: 8px;">
                    ${gameState.bottomCards.map(card => {
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 50px; height: 70px; background: #fff; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; color: ' + color + '; border: 2px solid #ddd;"><span style="font-size: 16px; font-weight: bold;">' + card.value + '</span><span style="font-size: 14px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // AI手牌数量
    const ai1Count = gameState.ai1Hand ? gameState.ai1Hand.length : 17;
    const ai2Count = gameState.ai2Hand ? gameState.ai2Hand.length : 17;
    
    // 上家出牌
    let lastPlayHtml = '';
    if (gameState.lastPlay && gameState.lastPlayer) {
        const playerName = gameState.lastPlayer === 'player' ? '玩家' : gameState.lastPlayer;
        lastPlayHtml = `
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <p style="color: #aaa; margin-bottom: 8px;">${playerName}出牌:</p>
                <div style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                    ${gameState.lastPlay.cards.map(card => {
                        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
                        return '<div style="width: 45px; height: 65px; background: #fff; border-radius: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; color: ' + color + '; border: 1px solid #ddd;"><span style="font-size: 14px; font-weight: bold;">' + card.value + '</span><span style="font-size: 12px;">' + card.suit + '</span></div>';
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // 玩家手牌
    const playerHandHtml = gameState.playerHand.map((card, index) => {
        const color = (card.suit === '♥' || card.suit === '♦') ? '#e74c3c' : '#2c3e50';
        return '<div class="dou-card" data-index="' + index + '" data-suit="' + card.suit + '" data-value="' + card.value + '" onclick="toggleDouDiZhuCard(' + index + ')" style="width: 55px; height: 80px; background: #fff; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 13px; color: ' + color + '; border: 2px solid #ddd; cursor: pointer; transition: transform 0.2s; user-select: none;"><span style="font-size: 18px; font-weight: bold;">' + card.value + '</span><span style="font-size: 15px;">' + card.suit + '</span></div>';
    }).join('');
    
    container.innerHTML = `
        <div style="text-align: center; padding: 15px; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #f39c12; margin-bottom: 10px;">🃏 斗地主 Dou Di Zhu</h2>
            
            <!-- 游戏信息 -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; flex-wrap: wrap; gap: 10px;">
                <span style="color: ${gameState.landlord === 'player' ? '#f39c12' : '#aaa'}">👤 玩家 ${gameState.landlord === 'player' ? '(地主)' : '(农民)'} - ${gameState.playerHand ? gameState.playerHand.length : 0}张</span>
                <span style="color: ${gameState.landlord === 'ai1' ? '#f39c12' : '#aaa'}">🤖 AI1 ${gameState.landlord === 'ai1' ? '(地主)' : '(农民)'} - ${ai1Count}张</span>
                <span style="color: ${gameState.landlord === 'ai2' ? '#f39c12' : '#aaa'}">🤖 AI2 ${gameState.landlord === 'ai2' ? '(地主)' : '(农民)'} - ${ai2Count}张</span>
            </div>
            
            <!-- 底牌 -->
            ${bottomCardsHtml}
            
            <!-- 上家出牌 -->
            ${lastPlayHtml}
            
            <!-- 玩家手牌 -->
            <div style="margin: 20px 0;">
                <h3 style="color: #f39c12; margin-bottom: 10px;">你的手牌</h3>
                <div id="dou-player-hand" style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                    ${playerHandHtml}
                </div>
            </div>
            
            <!-- 叫分按钮 -->
            ${isCallingPhase && isPlayerTurn ? `
                <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="douDiZhuCall(0)" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #7f8c8d, #95a5a6); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">不叫</button>
                    <button onclick="douDiZhuCall(1)" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #3498db, #2980b9); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">1分</button>
                    <button onclick="douDiZhuCall(2)" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">2分</button>
                    <button onclick="douDiZhuCall(3)" style="padding: 12px 25px; font-size: 1em; background: linear-gradient(90deg, #f39c12, #e67e22); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">3分</button>
                </div>
            ` : ''}
            
            <!-- 出牌按钮 -->
            ${!isCallingPhase && !gameEnded && isPlayerTurn ? `
                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                    <button onclick="douDiZhuPass()" style="padding: 12px 30px; font-size: 1em; background: linear-gradient(90deg, #7f8c8d, #95a5a6); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;" ${!gameState.lastPlay || gameState.lastPlayer === 'player' ? 'disabled style="padding: 12px 30px; font-size: 1em; background: #555; color: #888; border: none; border-radius: 20px; cursor: not-allowed; font-weight: bold;"' : ''}>不出</button>
                    <button onclick="douDiZhuPlay()" style="padding: 12px 30px; font-size: 1em; background: linear-gradient(90deg, #27ae60, #2ecc71); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">出牌</button>
                </div>
            ` : !gameEnded && !isCallingPhase ? '<p style="color: #aaa; margin-top: 20px;">' + gameState.message + '</p>' : ''}
            
            <!-- 消息 -->
            ${gameState.message && (gameEnded || isCallingPhase) ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                    <p style="font-size: 1.2em; color: ${gameState.winner === 'landlord' && gameState.landlord === 'player' ? '#2ecc71' : gameState.winner === 'farmers' && gameState.landlord !== 'player' ? '#2ecc71' : gameState.winner ? '#e74c3c' : '#f39c12'}; font-weight: bold;">${gameState.message}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// 斗地主选中的牌
let selectedDouDiZhuCards = [];

function toggleDouDiZhuCard(index) {
    const cardEl = document.querySelectorAll('#dou-player-hand .dou-card')[index];
    if (!cardEl) return;
    
    const cardIndex = selectedDouDiZhuCards.indexOf(index);
    if (cardIndex > -1) {
        selectedDouDiZhuCards.splice(cardIndex, 1);
        cardEl.style.transform = 'translateY(0)';
        cardEl.style.borderColor = '#ddd';
    } else {
        selectedDouDiZhuCards.push(index);
        cardEl.style.transform = 'translateY(-15px)';
        cardEl.style.borderColor = '#f39c12';
    }
}

function douDiZhuCall(score) {
    if (!ws || !currentRoom) return;
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'call', score: score } }));
}

function douDiZhuPass() {
    if (!ws || !currentRoom) return;
    selectedDouDiZhuCards = [];
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'pass' } }));
}

function douDiZhuPlay() {
    if (!ws || !currentRoom) return;
    if (selectedDouDiZhuCards.length === 0) {
        alert('请选择要出的牌');
        return;
    }
    
    const hand = gameState.playerHand;
    const cards = selectedDouDiZhuCards.map(index => hand[index]);
    selectedDouDiZhuCards = [];
    
    ws.send(JSON.stringify({ type: 'move', extra: { action: 'play', cards: cards } }));
}
