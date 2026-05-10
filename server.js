const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const players = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastToRoom(roomCode, message, excludePlayer = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.players.forEach(playerId => {
        if (playerId !== excludePlayer) {
            const player = players.get(playerId);
            if (player && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        }
    });
}

function sendToPlayer(playerId, message) {
    const player = players.get(playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
    }
}

function getRoomState(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    return {
        roomCode: room.roomCode,
        gameType: room.gameType,
        players: room.players.map(id => {
            const p = players.get(id);
            return { id: p.id, name: p.name, color: p.color, ready: p.ready };
        }),
        gameState: room.gameState,
        maxPlayers: room.maxPlayers,
        status: room.status
    };
}

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(playerId, ws, message);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });
    ws.on('close', () => {
        handleDisconnect(playerId);
    });
});

function handleMessage(playerId, ws, message) {
    const { type, payload } = message;
    switch (type) {
        case 'join': handleJoin(playerId, ws, payload); break;
        case 'createRoom': handleCreateRoom(playerId, ws, payload); break;
        case 'joinRoom': handleJoinRoom(playerId, ws, payload); break;
        case 'leaveRoom': handleLeaveRoom(playerId, ws); break;
        case 'ready': handleReady(playerId, ws); break;
        case 'move': handleMove(playerId, ws, payload); break;
        case 'restart': handleRestart(playerId, ws); break;
        case 'chat': handleChat(playerId, ws, payload); break;
        case 'playWithAI': handlePlayWithAI(playerId, ws, payload); break;
        case 'aiMove': handleAIMove(playerId, ws); break;
    }
}

function handleJoin(playerId, ws, payload) {
    const { name } = payload;
    players.set(playerId, {
        id: playerId,
        name: name || `玩家${playerId.substring(0, 4)}`,
        ws: ws,
        roomId: null,
        color: null,
        ready: false
    });
    ws.send(JSON.stringify({ type: 'joined', payload: { playerId, name: players.get(playerId).name } }));
}

function handleCreateRoom(playerId, ws, payload) {
    const { gameType, playerName } = payload;
    const roomCode = generateRoomCode();
    const maxPlayers = gameType === 'flightChess' ? 4 : 2;
    const room = {
        roomCode: roomCode,
        gameType: gameType,
        players: [],
        gameState: initGameState(gameType),
        maxPlayers: maxPlayers,
        status: 'waiting',
        currentTurn: 0
    };
    rooms.set(roomCode, room);
    joinRoom(playerId, roomCode, playerName);
    ws.send(JSON.stringify({ type: 'roomCreated', payload: { roomCode, gameType } }));
}

function handleJoinRoom(playerId, ws, payload) {
    const { roomCode, playerName } = payload;
    joinRoom(playerId, roomCode, playerName);
}

function joinRoom(playerId, roomCode, playerName) {
    const room = rooms.get(roomCode);
    const player = players.get(playerId);
    if (!room) {
        sendToPlayer(playerId, { type: 'error', payload: { message: '房间不存在' } });
        return;
    }
    if (room.players.length >= room.maxPlayers) {
        sendToPlayer(playerId, { type: 'error', payload: { message: '房间已满' } });
        return;
    }
    const colors = getPlayerColors(room.gameType);
    player.color = colors[room.players.length];
    player.roomId = roomCode;
    player.name = playerName || player.name;
    player.ready = false;
    room.players.push(playerId);
    broadcastToRoom(roomCode, { type: 'playerJoined', payload: getRoomState(roomCode) });
    sendToPlayer(playerId, { type: 'joinedRoom', payload: { roomState: getRoomState(roomCode), yourColor: player.color } });
}

function getPlayerColors(gameType) {
    if (gameType === 'flightChess') return ['red', 'blue', 'green', 'yellow'];
    if (gameType === 'checkers') return ['red', 'blue'];
    return ['black', 'white'];
}

function handleLeaveRoom(playerId, ws) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.players = room.players.filter(id => id !== playerId);
    player.roomId = null;
    player.color = null;
    player.ready = false;
    if (room.players.length === 0) {
        rooms.delete(room.roomCode);
    } else {
        broadcastToRoom(room.roomCode, { type: 'playerLeft', payload: { playerId, roomState: getRoomState(room.roomCode) } });
    }
}

function handleReady(playerId, ws) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    player.ready = !player.ready;
    const room = rooms.get(player.roomId);
    broadcastToRoom(room.roomId, { type: 'playerReady', payload: { playerId, ready: player.ready, roomState: getRoomState(room.roomId) } });
    if (room.players.length >= 2) {
        const allReady = room.players.every(id => players.get(id).ready);
        if (allReady) {
            room.status = 'playing';
            broadcastToRoom(room.roomCode, { type: 'gameStart', payload: { gameState: room.gameState } });
        }
    }
}

function handleMove(playerId, ws, payload) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.status !== 'playing') return;
    const { from, to, extra } = payload;
    const result = executeMove(room.gameType, room.gameState, from, to, player.color, extra);
    if (result.valid) {
        room.gameState = result.state;
        if (result.winner) room.status = 'ended';
        broadcastToRoom(room.roomCode, { type: 'moveMade', payload: { from, to, extra, gameState: room.gameState, nextTurn: result.nextTurn, winner: result.winner } });
    } else {
        sendToPlayer(playerId, { type: 'invalidMove', payload: { message: result.message } });
    }
}

function handleRestart(playerId, ws) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.gameState = initGameState(room.gameType);
    room.status = 'waiting';
    room.players.forEach(id => { players.get(id).ready = false; });
    broadcastToRoom(room.roomCode, { type: 'gameRestart', payload: { roomState: getRoomState(room.roomCode) } });
}

function handleChat(playerId, ws, payload) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    broadcastToRoom(player.roomId, { type: 'chat', payload: { playerId, playerName: player.name, message: payload.message } });
}

function handlePlayWithAI(playerId, ws, payload) {
    const { gameType, playerName, playerColor } = payload;
    const roomCode = generateRoomCode();
    const room = {
        roomCode: roomCode,
        gameType: gameType,
        players: [playerId],
        isAIGame: true,
        aiColor: playerColor === 'black' ? 'white' : 'black',
        gameState: initGameState(gameType),
        maxPlayers: 2,
        status: 'playing',
        currentTurn: 0
    };
    rooms.set(roomCode, room);
    const player = players.get(playerId);
    player.roomId = roomCode;
    player.color = playerColor;
    player.ready = true;
    ws.send(JSON.stringify({ type: 'aiGameCreated', payload: { roomCode, gameType, gameState: room.gameState, yourColor: playerColor, aiColor: room.aiColor } }));
}

function handleAIMove(playerId, ws) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || !room.isAIGame) return;
    const aiMove = calculateAIMove(room.gameType, room.gameState, room.aiColor);
    if (aiMove) {
        const result = executeMove(room.gameType, room.gameState, aiMove.from, aiMove.to, room.aiColor, aiMove.extra);
        if (result.valid) {
            room.gameState = result.state;
            sendToPlayer(playerId, { type: 'aiMoveMade', payload: { from: aiMove.from, to: aiMove.to, extra: aiMove.extra, gameState: room.gameState, winner: result.winner } });
        }
    }
}

function handleDisconnect(playerId) {
    const player = players.get(playerId);
    if (player) {
        handleLeaveRoom(playerId, null);
        players.delete(playerId);
    }
}

// ==================== 游戏状态初始化 ====================
function initGameState(gameType) {
    switch (gameType) {
        case 'gomoku': return initGomokuState();
        case 'go': return initGoState();
        case 'chineseChess': return initChineseChessState();
        case 'chess': return initChessState();
        case 'checkers': return initCheckersState();
        case 'othello': return initOthelloState();
        case 'flightChess': return initFlightChessState();
        default: return {};
    }
}

function initGomokuState() {
    return { board: Array(15).fill(null).map(() => Array(15).fill(null)), currentPlayer: 'black', lastMove: null, moves: [] };
}

function initGoState() {
    return { board: Array(19).fill(null).map(() => Array(19).fill(null)), currentPlayer: 'black', captures: { black: 0, white: 0 }, lastMove: null, ko: null, passes: 0, moves: [] };
}

function initChineseChessState() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));
    board[9] = [{ type: 'chariot', color: 'red' }, { type: 'horse', color: 'red' }, { type: 'elephant', color: 'red' }, { type: 'advisor', color: 'red' }, { type: 'general', color: 'red' }, { type: 'advisor', color: 'red' }, { type: 'elephant', color: 'red' }, { type: 'horse', color: 'red' }, { type: 'chariot', color: 'red' }];
    board[7][1] = { type: 'cannon', color: 'red' }; board[7][7] = { type: 'cannon', color: 'red' };
    for (let i = 0; i < 9; i += 2) board[6][i] = { type: 'soldier', color: 'red' };
    board[0] = [{ type: 'chariot', color: 'black' }, { type: 'horse', color: 'black' }, { type: 'elephant', color: 'black' }, { type: 'advisor', color: 'black' }, { type: 'general', color: 'black' }, { type: 'advisor', color: 'black' }, { type: 'elephant', color: 'black' }, { type: 'horse', color: 'black' }, { type: 'chariot', color: 'black' }];
    board[2][1] = { type: 'cannon', color: 'black' }; board[2][7] = { type: 'cannon', color: 'black' };
    for (let i = 0; i < 9; i += 2) board[3][i] = { type: 'soldier', color: 'black' };
    return { board, currentPlayer: 'red', moves: [], captured: { red: [], black: [] } };
}

function initChessState() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    board[7] = [{ type: 'rook', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' }, { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }];
    for (let i = 0; i < 8; i++) board[6][i] = { type: 'pawn', color: 'white' };
    board[0] = [{ type: 'rook', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' }, { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }];
    for (let i = 0; i < 8; i++) board[1][i] = { type: 'pawn', color: 'black' };
    return { board, currentPlayer: 'white', castling: { whiteKing: true, whiteQueen: true, blackKing: true, blackQueen: true }, enPassant: null, moves: [], captured: { white: [], black: [] } };
}

function initCheckersState() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) board[row][col] = { color: 'red', king: false };
        }
    }
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) board[row][col] = { color: 'blue', king: false };
        }
    }
    return { board, currentPlayer: 'red', mustCapture: null, moves: [] };
}

function initOthelloState() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    board[3][3] = 'white'; board[3][4] = 'black'; board[4][3] = 'black'; board[4][4] = 'white';
    return { board, currentPlayer: 'black', scores: { black: 2, white: 2 }, moves: [] };
}

function initFlightChessState() {
    return { positions: { red: [-1, -1, -1, -1], blue: [-1, -1, -1, -1], green: [-1, -1, -1, -1], yellow: [-1, -1, -1, -1] }, finished: { red: 0, blue: 0, green: 0, yellow: 0 }, currentPlayer: 'red', dice: 0, moves: [] };
}

// ==================== 游戏移动执行 ====================
function executeMove(gameType, state, from, to, playerColor, extra) {
    switch (gameType) {
        case 'gomoku': return executeGomokuMove(state, to, playerColor);
        case 'go': return executeGoMove(state, to, playerColor);
        case 'chineseChess': return executeChineseChessMove(state, from, to, playerColor);
        case 'chess': return executeChessMove(state, from, to, playerColor, extra);
        case 'checkers': return executeCheckersMove(state, from, to, playerColor);
        case 'othello': return executeOthelloMove(state, to, playerColor);
        case 'flightChess': return executeFlightChessMove(state, from, to, playerColor, extra);
        default: return { valid: false, message: '未知游戏类型' };
    }
}

function executeGomokuMove(state, to, playerColor) {
    const { row, col } = to;
    if (state.board[row][col] !== null) return { valid: false, message: '该位置已有棋子' };
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    const newState = JSON.parse(JSON.stringify(state));
    newState.board[row][col] = playerColor;
    newState.lastMove = { row, col };
    newState.moves.push({ row, col, player: playerColor });
    newState.currentPlayer = playerColor === 'black' ? 'white' : 'black';
    const winner = checkGomokuWin(newState.board, row, col, playerColor);
    return { valid: true, state: newState, nextTurn: newState.currentPlayer, winner };
}

function checkGomokuWin(board, row, col, color) {
    const directions = [[[0, 1], [0, -1]], [[1, 0], [-1, 0]], [[1, 1], [-1, -1]], [[1, -1], [-1, 1]]];
    for (const [dir1, dir2] of directions) {
        let count = 1;
        for (const [dr, dc] of [dir1, dir2]) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === color) { count++; r += dr; c += dc; }
        }
        if (count >= 5) return color;
    }
    return null;
}

function executeGoMove(state, to, playerColor) {
    if (to === null) {
        const newState = JSON.parse(JSON.stringify(state));
        newState.passes++;
        newState.currentPlayer = playerColor === 'black' ? 'white' : 'black';
        newState.moves.push({ pass: true, player: playerColor });
        if (newState.passes >= 2) return { valid: true, state: newState, nextTurn: null, winner: 'draw' };
        return { valid: true, state: newState, nextTurn: newState.currentPlayer };
    }
    const { row, col } = to;
    if (state.board[row][col] !== null) return { valid: false, message: '该位置已有棋子' };
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    const newState = JSON.parse(JSON.stringify(state));
    newState.board[row][col] = playerColor;
    const opponent = playerColor === 'black' ? 'white' : 'black';
    const captured = captureStones(newState.board, row, col, opponent);
    newState.captures[playerColor] += captured.length;
    const group = getGroup(newState.board, row, col);
    const liberties = getLiberties(newState.board, group);
    if (liberties === 0) return { valid: false, message: '不能自杀' };
    if (newState.ko && newState.ko.row === row && newState.ko.col === col) return { valid: false, message: '打劫禁着' };
    newState.lastMove = { row, col };
    newState.passes = 0;
    newState.moves.push({ row, col, player: playerColor });
    newState.currentPlayer = opponent;
    return { valid: true, state: newState, nextTurn: newState.currentPlayer };
}

function getGroup(board, row, col) {
    const color = board[row][col];
    if (!color) return [];
    const group = [];
    const visited = new Set();
    const stack = [[row, col]];
    while (stack.length > 0) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        if (r < 0 || r >= 19 || c < 0 || c >= 19) continue;
        if (board[r][c] !== color) continue;
        visited.add(key);
        group.push([r, c]);
        stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    return group;
}

function getLiberties(board, group) {
    const checked = new Set();
    let liberties = 0;
    for (const [row, col] of group) {
        const neighbors = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
        for (const [r, c] of neighbors) {
            const key = `${r},${c}`;
            if (checked.has(key)) continue;
            if (r < 0 || r >= 19 || c < 0 || c >= 19) continue;
            checked.add(key);
            if (board[r][c] === null) liberties++;
        }
    }
    return liberties;
}

function captureStones(board, row, col, opponent) {
    const captured = [];
    const neighbors = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    for (const [r, c] of neighbors) {
        if (r < 0 || r >= 19 || c < 0 || c >= 19) continue;
        if (board[r][c] !== opponent) continue;
        const group = getGroup(board, r, c);
        const liberties = getLiberties(board, group);
        if (liberties === 0) {
            for (const [gr, gc] of group) {
                board[gr][gc] = null;
                captured.push([gr, gc]);
            }
        }
    }
    return captured;
}

function executeChineseChessMove(state, from, to, playerColor) {
    const piece = state.board[from.row][from.col];
    if (!piece) return { valid: false, message: '该位置没有棋子' };
    if (piece.color !== playerColor) return { valid: false, message: '不是你的棋子' };
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    if (!isValidChineseChessMove(state.board, from, to, piece)) return { valid: false, message: '非法移动' };
    const newState = JSON.parse(JSON.stringify(state));
    const captured = newState.board[to.row][to.col];
    if (captured) newState.captured[piece.color].push(captured);
    newState.board[to.row][to.col] = piece;
    newState.board[from.row][from.col] = null;
    newState.moves.push({ from, to, piece, captured });
    newState.currentPlayer = playerColor === 'red' ? 'black' : 'red';
    let winner = null;
    if (captured && captured.type === 'general') winner = playerColor;
    return { valid: true, state: newState, nextTurn: newState.currentPlayer, winner };
}

function isValidChineseChessMove(board, from, to, piece) {
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const target = board[to.row][to.col];
    if (target && target.color === piece.color) return false;
    switch (piece.type) {
        case 'general':
            if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
            if (to.col < 3 || to.col > 5) return false;
            if (piece.color === 'red') { if (to.row < 7) return false; } else { if (to.row > 2) return false; }
            return true;
        case 'advisor':
            if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return false;
            if (to.col < 3 || to.col > 5) return false;
            if (piece.color === 'red') { if (to.row < 7) return false; } else { if (to.row > 2) return false; }
            return true;
        case 'elephant':
            if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) return false;
            const eyeRow = from.row + dy / 2, eyeCol = from.col + dx / 2;
            if (board[eyeRow][eyeCol]) return false;
            if (piece.color === 'red') { if (to.row < 5) return false; } else { if (to.row > 4) return false; }
            return true;
        case 'horse':
            if (Math.abs(dx) * Math.abs(dy) !== 2) return false;
            let legRow, legCol;
            if (Math.abs(dx) === 2) { legRow = from.row; legCol = from.col + dx / 2; } else { legRow = from.row + dy / 2; legCol = from.col; }
            if (board[legRow][legCol]) return false;
            return true;
        case 'chariot':
            if (dx !== 0 && dy !== 0) return false;
            const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
            const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
            let x = from.col + stepX, y = from.row + stepY;
            while (x !== to.col || y !== to.row) {
                if (board[y][x]) return false;
                x += stepX;
                y += stepY;
            }
            return true;
        case 'cannon':
            if (dx !== 0 && dy !== 0) return false;
            const cStepX = dx === 0 ? 0 : dx / Math.abs(dx);
            const cStepY = dy === 0 ? 0 : dy / Math.abs(dy);
            let cx = from.col + cStepX, cy = from.row + cStepY;
            let jumped = false;
            while (cx !== to.col || cy !== to.row) {
                if (board[cy][cx]) {
                    if (jumped) return false;
                    jumped = true;
                }
                cx += cStepX;
                cy += cStepY;
            }
            if (target) return jumped;
            return !jumped;
        case 'soldier':
            if (piece.color === 'red') {
                if (from.row > 4) return dy === -1 && dx === 0;
                return (dy === -1 && dx === 0) || (dy === 0 && Math.abs(dx) === 1);
            } else {
                if (from.row < 5) return dy === 1 && dx === 0;
                return (dy === 1 && dx === 0) || (dy === 0 && Math.abs(dx) === 1);
            }
    }
    return false;
}

function executeChessMove(state, from, to, playerColor, extra) {
    const piece = state.board[from.row][from.col];
    if (!piece) return { valid: false, message: '该位置没有棋子' };
    if (piece.color !== playerColor) return { valid: false, message: '不是你的棋子' };
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    if (!isValidChessMove(state, from, to, piece)) return { valid: false, message: '非法移动' };
    const newState = JSON.parse(JSON.stringify(state));
    const captured = newState.board[to.row][to.col];
    if (captured) newState.captured[piece.color].push(captured);
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
        if (to.col > from.col) {
            newState.board[from.row][5] = newState.board[from.row][7];
            newState.board[from.row][7] = null;
        } else {
            newState.board[from.row][3] = newState.board[from.row][0];
            newState.board[from.row][0] = null;
        }
    }
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) piece.type = extra?.promotion || 'queen';
    if (piece.type === 'pawn' && state.enPassant && to.row === state.enPassant.row && to.col === state.enPassant.col) {
        const capturedPawnRow = from.row;
        const capturedPawn = newState.board[capturedPawnRow][to.col];
        newState.captured[piece.color].push(capturedPawn);
        newState.board[capturedPawnRow][to.col] = null;
    }
    newState.board[to.row][to.col] = piece;
    newState.board[from.row][from.col] = null;
    if (piece.type === 'king') {
        if (piece.color === 'white') { newState.castling.whiteKing = false; newState.castling.whiteQueen = false; }
        else { newState.castling.blackKing = false; newState.castling.blackQueen = false; }
    }
    if (piece.type === 'rook') {
        if (from.col === 0) { if (piece.color === 'white') newState.castling.whiteQueen = false; else newState.castling.blackQueen = false; }
        else if (from.col === 7) { if (piece.color === 'white') newState.castling.whiteKing = false; else newState.castling.blackKing = false; }
    }
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) newState.enPassant = { row: (from.row + to.row) / 2, col: to.col };
    else newState.enPassant = null;
    newState.moves.push({ from, to, piece, captured });
    newState.currentPlayer = playerColor === 'white' ? 'black' : 'white';
    let winner = null;
    if (captured && captured.type === 'king') winner = playerColor;
    return { valid: true, state: newState, nextTurn: newState.currentPlayer, winner };
}

function isValidChessMove(state, from, to, piece) {
    const board = state.board;
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const target = board[to.row][to.col];
    if (target && target.color === piece.color) return false;
    switch (piece.type) {
        case 'pawn':
            const direction = piece.color === 'white' ? -1 : 1;
            const startRow = piece.color === 'white' ? 6 : 1;
            if (dx === 0 && dy === direction && !target) return true;
            if (dx === 0 && dy === 2 * direction && from.row === startRow && !target && !board[from.row + direction][from.col]) return true;
            if (Math.abs(dx) === 1 && dy === direction && target) return true;
            if (Math.abs(dx) === 1 && dy === direction && state.enPassant && to.row === state.enPassant.row && to.col === state.enPassant.col) return true;
            return false;
        case 'rook':
            if (dx !== 0 && dy !== 0) return false;
            return isPathClear(board, from, to);
        case 'knight':
            return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
        case 'bishop':
            if (Math.abs(dx) !== Math.abs(dy)) return false;
            return isPathClear(board, from, to);
        case 'queen':
            if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return false;
            return isPathClear(board, from, to);
        case 'king':
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
            if (dy === 0 && Math.abs(dx) === 2) {
                if (piece.color === 'white') {
                    if (to.col === 6 && state.castling.whiteKing && !board[7][5] && !board[7][6]) return true;
                    if (to.col === 2 && state.castling.whiteQueen && !board[7][1] && !board[7][2] && !board[7][3]) return true;
                } else {
                    if (to.col === 6 && state.castling.blackKing && !board[0][5] && !board[0][6]) return true;
                    if (to.col === 2 && state.castling.blackQueen && !board[0][1] && !board[0][2] && !board[0][3]) return true;
                }
            }
            return false;
    }
    return false;
}

function isPathClear(board, from, to) {
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    let x = from.col + stepX, y = from.row + stepY;
    while (x !== to.col || y !== to.row) {
        if (board[y][x]) return false;
        x += stepX;
        y += stepY;
    }
    return true;
}

function executeCheckersMove(state, from, to, playerColor) {
    const piece = state.board[from.row][from.col];
    if (!piece) return { valid: false, message: '该位置没有棋子' };
    if (piece.color !== playerColor) return { valid: false, message: '不是你的棋子' };
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const isJump = Math.abs(dx) === 2 && Math.abs(dy) === 2;
    if (!isValidCheckersMove(state.board, from, to, piece, isJump)) return { valid: false, message: '非法移动' };
    const newState = JSON.parse(JSON.stringify(state));
    newState.board[to.row][to.col] = piece;
    newState.board[from.row][from.col] = null;
    if (isJump) {
        const midRow = (from.row + to.row) / 2;
        const midCol = (from.col + to.col) / 2;
        newState.board[midRow][midCol] = null;
        if (canContinueJump(newState.board, to, piece)) {
            newState.mustCapture = to;
            return { valid: true, state: newState, nextTurn: playerColor };
        }
    }
    if ((piece.color === 'red' && to.row === 7) || (piece.color === 'blue' && to.row === 0)) piece.king = true;
    newState.mustCapture = null;
    newState.moves.push({ from, to, isJump });
    newState.currentPlayer = playerColor === 'red' ? 'blue' : 'red';
    const winner = checkCheckersWin(newState.board);
    return { valid: true, state: newState, nextTurn: newState.currentPlayer, winner };
}

function isValidCheckersMove(board, from, to, piece, isJump) {
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    if (board[to.row][to.col]) return false;
    if ((from.row + from.col) % 2 === 0 || (to.row + to.col) % 2 === 0) return false;
    if (!isJump && Math.abs(dx) === 1) {
        if (piece.king) return Math.abs(dy) === 1;
        if (piece.color === 'red') return dy === 1;
        else return dy === -1;
    }
    if (isJump) {
        const midRow = (from.row + to.row) / 2;
        const midCol = (from.col + to.col) / 2;
        const midPiece = board[midRow][midCol];
        if (!midPiece || midPiece.color === piece.color) return false;
        if (piece.king) return true;
        if (piece.color === 'red') return dy === 2;
        else return dy === -2;
    }
    return false;
}

function canContinueJump(board, pos, piece) {
    const directions = piece.king ? [[-2, -2], [-2, 2], [2, -2], [2, 2]] : (piece.color === 'red' ? [[2, -2], [2, 2]] : [[-2, -2], [-2, 2]]);
    for (const [dr, dc] of directions) {
        const newRow = pos.row + dr;
        const newCol = pos.col + dc;
        const midRow = pos.row + dr / 2;
        const midCol = pos.col + dc / 2;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            if (!board[newRow][newCol]) {
                const midPiece = board[midRow][midCol];
                if (midPiece && midPiece.color !== piece.color) return true;
            }
        }
    }
    return false;
}

function checkCheckersWin(board) {
    let red = 0, blue = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                if (piece.color === 'red') red++;
                else blue++;
            }
        }
    }
    if (red === 0) return 'blue';
    if (blue === 0) return 'red';
    return null;
}

function executeOthelloMove(state, to, playerColor) {
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    const { row, col } = to;
    if (state.board[row][col] !== null) return { valid: false, message: '该位置已有棋子' };
    const flips = getOthelloFlips(state.board, row, col, playerColor);
    if (flips.length === 0) return { valid: false, message: '无效位置' };
    const newState = JSON.parse(JSON.stringify(state));
    newState.board[row][col] = playerColor;
    for (const [r, c] of flips) newState.board[r][c] = playerColor;
    newState.scores = { black: 0, white: 0 };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (newState.board[r][c]) newState.scores[newState.board[r][c]]++;
        }
    }
    newState.moves.push({ row, col, player: playerColor, flips });
    const opponent = playerColor === 'black' ? 'white' : 'black';
    if (hasValidOthelloMove(newState.board, opponent)) newState.currentPlayer = opponent;
    else if (!hasValidOthelloMove(newState.board, playerColor)) {
        const winner = newState.scores.black > newState.scores.white ? 'black' : newState.scores.white > newState.scores.black ? 'white' : 'draw';
        return { valid: true, state: newState, nextTurn: null, winner };
    }
    return { valid: true, state: newState, nextTurn: newState.currentPlayer };
}

function getOthelloFlips(board, row, col, color) {
    const opponent = color === 'black' ? 'white' : 'black';
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const allFlips = [];
    for (const [dr, dc] of directions) {
        const flips = [];
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
            flips.push([r, c]);
            r += dr;
            c += dc;
        }
        if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === color && flips.length > 0) allFlips.push(...flips);
    }
    return allFlips;
}

function hasValidOthelloMove(board, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === null && getOthelloFlips(board, r, c, color).length > 0) return true;
        }
    }
    return false;
}

function executeFlightChessMove(state, from, to, playerColor, extra) {
    if (state.currentPlayer !== playerColor) return { valid: false, message: '不是你的回合' };
    const dice = extra?.dice || state.dice;
    const planeIndex = from;
    if (planeIndex < 0 || planeIndex > 3) return { valid: false, message: '无效的飞机' };
    const newState = JSON.parse(JSON.stringify(state));
    const currentPos = newState.positions[playerColor][planeIndex];
    if (currentPos === -1) {
        if (dice !== 6) return { valid: false, message: '需要掷6才能起飞' };
        newState.positions[playerColor][planeIndex] = 0;
    } else {
        const newPos = (currentPos + dice) % 52;
        newState.positions[playerColor][planeIndex] = newPos;
        for (const [color, positions] of Object.entries(newState.positions)) {
            if (color !== playerColor) {
                for (let i = 0; i < 4; i++) {
                    if (positions[i] === newPos) positions[i] = -1;
                }
            }
        }
    }
    newState.moves.push({ player: playerColor, plane: planeIndex, dice, from: currentPos, to: newState.positions[playerColor][planeIndex] });
    if (dice !== 6) {
        const playerOrder = ['red', 'blue', 'green', 'yellow'];
        const currentIndex = playerOrder.indexOf(playerColor);
        let nextIndex = (currentIndex + 1) % 4;
        while (nextIndex !== currentIndex && !newState.positions[playerOrder[nextIndex]]) nextIndex = (nextIndex + 1) % 4;
        newState.currentPlayer = playerOrder[nextIndex];
    }
    let winner = null;
    for (const [color, finished] of Object.entries(newState.finished)) {
        if (finished === 4) { winner = color; break; }
    }
    return { valid: true, state: newState, nextTurn: newState.currentPlayer, winner };
}

// ==================== AI计算 ====================
function calculateAIMove(gameType, state, aiColor) {
    switch (gameType) {
        case 'gomoku': return calculateGomokuAIMove(state, aiColor);
        case 'go': return calculateGoAIMove(state, aiColor);
        case 'chineseChess': return calculateChineseChessAIMove(state, aiColor);
        case 'chess': return calculateChessAIMove(state, aiColor);
        case 'checkers': return calculateCheckersAIMove(state, aiColor);
        case 'othello': return calculateOthelloAIMove(state, aiColor);
        case 'flightChess': return calculateFlightChessAIMove(state, aiColor);
        default: return null;
    }
}

function calculateGomokuAIMove(state, aiColor) {
    const board = state.board;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && wouldWin(board, r, c, aiColor, 5)) return { from: null, to: { row: r, col: c } };
        }
    }
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && wouldWin(board, r, c, opponent, 5)) return { from: null, to: { row: r, col: c } };
        }
    }
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && wouldWin(board, r, c, aiColor, 4)) return { from: null, to: { row: r, col: c } };
        }
    }
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && wouldWin(board, r, c, opponent, 4)) return { from: null, to: { row: r, col: c } };
        }
    }
    let bestMove = null;
    let bestScore = -1;
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && hasNeighbor(board, r, c)) {
                const score = evaluatePosition(board, r, c, aiColor);
                if (score > bestScore) { bestScore = score; bestMove = { from: null, to: { row: r, col: c } }; }
            }
        }
    }
    if (!bestMove) {
        const center = 7;
        if (board[center][center] === null) return { from: null, to: { row: center, col: center } };
        for (let d = 1; d < 7; d++) {
            for (let dr = -d; dr <= d; dr++) {
                for (let dc = -d; dc <= d; dc++) {
                    const r = center + dr, c = center + dc;
                    if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === null) return { from: null, to: { row: r, col: c } };
                }
            }
        }
    }
    return bestMove;
}

function wouldWin(board, row, col, color, target) {
    const directions = [[[0, 1], [0, -1]], [[1, 0], [-1, 0]], [[1, 1], [-1, -1]], [[1, -1], [-1, 1]]];
    for (const [dir1, dir2] of directions) {
        let count = 1;
        for (const [dr, dc] of [dir1, dir2]) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === color) { count++; r += dr; c += dc; }
        }
        if (count >= target) return true;
    }
    return false;
}

function hasNeighbor(board, row, col) {
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] !== null) return true;
        }
    }
    return false;
}

function evaluatePosition(board, row, col, color) {
    let score = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
        let count = 0, openEnds = 0;
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === color) { count++; r += dr; c += dc; }
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === null) openEnds++;
        r = row - dr; c = col - dc;
        while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === color) { count++; r -= dr; c -= dc; }
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === null) openEnds++;
        score += count * count * (openEnds + 1);
    }
    return score;
}

function calculateGoAIMove(state, aiColor) {
    const board = state.board;
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === null) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[r][c] = aiColor;
                const opponent = aiColor === 'black' ? 'white' : 'black';
                const captured = captureStones(testBoard, r, c, opponent);
                const group = getGroup(testBoard, r, c);
                const liberties = getLiberties(testBoard, group);
                if (liberties > 0 || captured.length > 0) return { from: null, to: { row: r, col: c } };
            }
        }
    }
    return { from: null, to: null };
}

function calculateChineseChessAIMove(state, aiColor) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 10; tr++) {
                    for (let tc = 0; tc < 9; tc++) {
                        if (isValidChineseChessMove(board, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            const target = board[tr][tc];
                            const score = target ? getPieceValue(target.type) : 0;
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, score });
                        }
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        return moves[0];
    }
    return null;
}

function getPieceValue(type) {
    const values = { general: 10000, chariot: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, soldier: 100 };
    return values[type] || 0;
}

function calculateChessAIMove(state, aiColor) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidChessMove(state, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            const target = board[tr][tc];
                            const score = target ? getChessPieceValue(target.type) : 0;
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, score });
                        }
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        return moves[0];
    }
    return null;
}

function getChessPieceValue(type) {
    const values = { queen: 900, rook: 500, bishop: 330, knight: 320, pawn: 100, king: 10000 };
    return values[type] || 0;
}

function calculateCheckersAIMove(state, aiColor) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                const jumpDirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
                for (const [dr, dc] of jumpDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, true)) {
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, score: 10 });
                        }
                    }
                }
                const moveDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of moveDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, false)) {
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, score: 1 });
                        }
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        return moves[0];
    }
    return null;
}

function calculateOthelloAIMove(state, aiColor) {
    const board = state.board;
    const moves = [];
    const weights = [
        [100, -20, 10, 5, 5, 10, -20, 100],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [10, -2, 1, 1, 1, 1, -2, 10],
        [5, -2, 1, 1, 1, 1, -2, 5],
        [5, -2, 1, 1, 1, 1, -2, 5],
        [10, -2, 1, 1, 1, 1, -2, 10],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [100, -20, 10, 5, 5, 10, -20, 100]
    ];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === null) {
                const flips = getOthelloFlips(board, r, c, aiColor);
                if (flips.length > 0) moves.push({ from: null, to: { row: r, col: c }, score: weights[r][c] + flips.length });
            }
        }
    }
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        return moves[0];
    }
    return null;
}

function calculateFlightChessAIMove(state, aiColor) {
    const positions = state.positions[aiColor];
    for (let i = 0; i < 4; i++) {
        if (positions[i] >= 0) return { from: i, to: null, extra: { dice: Math.floor(Math.random() * 6) + 1 } };
    }
    for (let i = 0; i < 4; i++) {
        if (positions[i] === -1) return { from: i, to: null, extra: { dice: 6 } };
    }
    return null;
}

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
    });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`棋类游戏平台已启动: http://localhost:${PORT}`);
});
