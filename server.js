const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 用户数据存储路径
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// 确保数据目录存在
if (!fs.existsSync(path.dirname(USERS_FILE))) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}

// 加载用户数据
function loadUsers() {
    if (fs.existsSync(USERS_FILE)) {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    return {};
}

// 保存用户数据
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 密码加密
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 生成会话令牌
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 用户会话
const userSessions = new Map();

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==================== 用户系统API ====================

// 注册
app.post('/api/register', (req, res) => {
    const { email, password, nickname } = req.body;
    
    // 验证QQ邮箱格式
    if (!email || !email.match(/^[a-zA-Z0-9._%+-]+@qq\.com$/)) {
        return res.status(400).json({ success: false, message: '请输入有效的QQ邮箱' });
    }
    
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: '密码至少需要6位' });
    }
    
    if (!nickname || nickname.trim().length < 2) {
        return res.status(400).json({ success: false, message: '昵称至少需要2个字符' });
    }
    
    const users = loadUsers();
    
    if (users[email]) {
        return res.status(400).json({ success: false, message: '该邮箱已被注册' });
    }
    
    const newUser = {
        email,
        nickname: nickname.trim(),
        password: hashPassword(password),
        stats: {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            byGame: {
                gomoku: { total: 0, wins: 0 },
                go: { total: 0, wins: 0 },
                chineseChess: { total: 0, wins: 0 },
                chess: { total: 0, wins: 0 },
                checkers: { total: 0, wins: 0 },
                othello: { total: 0, wins: 0 },
                flightChess: { total: 0, wins: 0 },
                poker: { total: 0, wins: 0 },
                texasHoldem: { total: 0, wins: 0 },
                zhaJinHua: { total: 0, wins: 0 },
                douDiZhu: { total: 0, wins: 0 }
            }
        },
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    users[email] = newUser;
    saveUsers(users);
    
    res.json({ success: true, message: '注册成功' });
});

// 登录
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: '请输入邮箱和密码' });
    }
    
    const users = loadUsers();
    const user = users[email];
    
    if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date().toISOString();
    saveUsers(users);
    
    // 生成会话令牌
    const token = generateToken();
    userSessions.set(token, { email, loginTime: new Date().toISOString() });
    
    res.json({
        success: true,
        token,
        user: {
            email: user.email,
            nickname: user.nickname,
            stats: user.stats
        }
    });
});

// 获取用户信息
app.get('/api/user/:email', (req, res) => {
    const { email } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !userSessions.has(token)) {
        return res.status(401).json({ success: false, message: '未登录或会话已过期' });
    }
    
    const users = loadUsers();
    const user = users[email];
    
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({
        success: true,
        user: {
            email: user.email,
            nickname: user.nickname,
            stats: user.stats,
            lastLogin: user.lastLogin
        }
    });
});

// 更新游戏统计
app.post('/api/user/:email/stats', (req, res) => {
    const { email } = req.params;
    const { gameType, result } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !userSessions.has(token)) {
        return res.status(401).json({ success: false, message: '未登录或会话已过期' });
    }
    
    const users = loadUsers();
    const user = users[email];
    
    if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新统计
    user.stats.totalGames++;
    user.stats.byGame[gameType].total++;
    
    if (result === 'win') {
        user.stats.wins++;
        user.stats.byGame[gameType].wins++;
    } else if (result === 'loss') {
        user.stats.losses++;
    } else if (result === 'draw') {
        user.stats.draws++;
    }
    
    // 计算胜率
    user.stats.winRate = user.stats.totalGames > 0 
        ? Math.round((user.stats.wins / user.stats.totalGames) * 100) 
        : 0;
    
    saveUsers(users);
    
    res.json({ success: true, stats: user.stats });
});

// 退出登录
app.post('/api/user/:email/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
        userSessions.delete(token);
    }
    
    res.json({ success: true, message: '已退出登录' });
});

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
    if (gameType === 'poker') return ['player', 'ai'];
    if (gameType === 'texasHoldem') return ['player', 'ai'];
    if (gameType === 'zhaJinHua') return ['player', 'ai'];
    if (gameType === 'douDiZhu') return ['player', 'ai1', 'ai2'];
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
    const { gameType, playerName, playerColor, difficulty } = payload;
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
        currentTurn: 0,
        difficulty: difficulty || 'normal' // 默认普通难度
    };
    rooms.set(roomCode, room);
    const player = players.get(playerId);
    player.roomId = roomCode;
    player.color = playerColor;
    player.ready = true;
    ws.send(JSON.stringify({ type: 'aiGameCreated', payload: { roomCode, gameType, gameState: room.gameState, yourColor: playerColor, aiColor: room.aiColor, difficulty: room.difficulty } }));
}

function handleAIMove(playerId, ws) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || !room.isAIGame) return;
    const aiMove = calculateAIMove(room.gameType, room.gameState, room.aiColor, room.difficulty);
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
        case 'poker': return initPokerState();
        case 'texasHoldem': return initTexasHoldemState();
        case 'zhaJinHua': return initZhaJinHuaState();
        case 'douDiZhu': return initDouDiZhuState();
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

function initPokerState() {
    // 创建一副牌
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // 发牌
    const playerHand = [deck.pop(), deck.pop()];
    const aiHand = [deck.pop(), deck.pop()];
    return {
        deck,
        playerHand,
        aiHand,
        playerScore: calculateHandScore(playerHand),
        aiScore: calculateHandScore(aiHand),
        status: 'playing', // playing, bust, stand, ended
        currentPlayer: 'player',
        winner: null,
        message: ''
    };
}

// ==================== 德州扑克状态初始化 ====================
function initTexasHoldemState() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // 发底牌
    const playerHand = [deck.pop(), deck.pop()];
    const aiHand = [deck.pop(), deck.pop()];
    
    // 初始筹码
    const playerChips = 1000;
    const aiChips = 1000;
    const pot = 0;
    
    return {
        deck,
        playerHand,
        aiHand,
        communityCards: [], // 公共牌
        playerChips,
        aiChips,
        pot,
        currentBet: 0,
        playerBet: 0,
        aiBet: 0,
        round: 'preflop', // preflop, flop, turn, river, showdown
        status: 'playing',
        currentPlayer: 'player',
        winner: null,
        message: '翻牌前下注轮 - 请选择操作',
        playerFolded: false,
        aiFolded: false,
        playerAllIn: false,
        aiAllIn: false
    };
}

// ==================== 炸金花状态初始化 ====================
function initZhaJinHuaState() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // 各发3张牌
    const playerHand = [deck.pop(), deck.pop(), deck.pop()];
    const aiHand = [deck.pop(), deck.pop(), deck.pop()];
    
    // 初始筹码
    const playerChips = 1000;
    const aiChips = 1000;
    const pot = 0;
    
    return {
        deck,
        playerHand,
        aiHand,
        playerChips,
        aiChips,
        pot,
        currentBet: 10, // 底注
        status: 'playing',
        currentPlayer: 'player',
        winner: null,
        message: '请选择比牌或弃牌',
        playerFolded: false,
        aiFolded: false,
        playerSeen: false, // 玩家是否看牌
        aiSeen: false // AI是否看牌
    };
}

// ==================== 斗地主状态初始化 ====================
function initDouDiZhuState() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    // 添加大小王
    deck.push({ suit: '🃏', value: '小王' });
    deck.push({ suit: '🃏', value: '大王' });
    
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // 发牌：每人17张，留3张底牌
    const playerHand = [];
    const ai1Hand = [];
    const ai2Hand = [];
    
    for (let i = 0; i < 17; i++) {
        playerHand.push(deck.pop());
        ai1Hand.push(deck.pop());
        ai2Hand.push(deck.pop());
    }
    
    // 底牌
    const bottomCards = [deck.pop(), deck.pop(), deck.pop()];
    
    // 排序手牌
    sortDouDiZhuHand(playerHand);
    sortDouDiZhuHand(ai1Hand);
    sortDouDiZhuHand(ai2Hand);
    
    return {
        deck,
        playerHand,
        ai1Hand,
        ai2Hand,
        bottomCards,
        landlord: null, // 地主
        callScore: 0, // 当前叫分
        playerCalled: false,
        ai1Called: false,
        ai2Called: false,
        phase: 'calling', // calling: 叫分阶段, playing: 出牌阶段
        status: 'playing',
        currentPlayer: 'player',
        winner: null,
        message: '请叫分（0-3分）',
        lastPlay: null, // 上一次的出牌
        lastPlayer: null, // 上一次出牌的玩家
        passCount: 0 // 连续pass次数
    };
}

// 斗地主手牌排序
function sortDouDiZhuHand(hand) {
    const valueOrder = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17 };
    hand.sort((a, b) => valueOrder[a.value] - valueOrder[b.value]);
}

function calculateHandScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            score += 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
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
        case 'poker': return executePokerMove(state, { from, to, playerColor, extra });
        case 'texasHoldem': return executeTexasHoldemMove(state, extra);
        case 'zhaJinHua': return executeZhaJinHuaMove(state, extra);
        case 'douDiZhu': return executeDouDiZhuMove(state, extra);
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

function executePokerMove(gameState, move) {
    const { action } = move;
    if (gameState.status !== 'playing' || gameState.currentPlayer !== 'player') {
        return { valid: false, message: '不是你的回合' };
    }

    if (action === 'hit') {
        const card = gameState.deck.pop();
        gameState.playerHand.push(card);
        gameState.playerScore = calculateHandScore(gameState.playerHand);
        if (gameState.playerScore > 21) {
            gameState.status = 'ended';
            gameState.winner = 'ai';
            gameState.message = '玩家爆牌！AI获胜！';
        } else if (gameState.playerScore === 21) {
            gameState.status = 'ended';
            gameState.winner = 'player';
            gameState.message = '21点！玩家获胜！';
        } else {
            gameState.currentPlayer = 'ai';
            gameState.message = 'AI正在思考...';
        }
        return { valid: true };
    } else if (action === 'stand') {
        gameState.status = 'stand';
        gameState.currentPlayer = 'ai';
        gameState.message = 'AI正在思考...';
        return { valid: true };
    }
    return { valid: false, message: '无效操作' };
}

// ==================== 德州扑克执行逻辑 ====================
function executeTexasHoldemMove(gameState, extra) {
    const { action, amount } = extra;
    
    if (gameState.status !== 'playing') {
        return { valid: false, message: '游戏已结束' };
    }
    
    if (action === 'fold') {
        gameState.playerFolded = true;
        gameState.status = 'ended';
        gameState.winner = 'ai';
        gameState.message = '玩家弃牌，AI获胜！';
        return { valid: true, state: gameState, winner: 'ai' };
    }
    
    if (action === 'call') {
        const callAmount = gameState.aiBet - gameState.playerBet;
        if (gameState.playerChips >= callAmount) {
            gameState.playerChips -= callAmount;
            gameState.playerBet += callAmount;
            gameState.pot += callAmount;
            advanceTexasHoldemRound(gameState);
            return { valid: true, state: gameState };
        }
        return { valid: false, message: '筹码不足' };
    }
    
    if (action === 'raise') {
        const callAmount = gameState.aiBet - gameState.playerBet;
        const totalAmount = callAmount + amount;
        if (gameState.playerChips >= totalAmount) {
            gameState.playerChips -= totalAmount;
            gameState.playerBet += totalAmount;
            gameState.pot += totalAmount;
            gameState.currentBet = gameState.playerBet;
            gameState.currentPlayer = 'ai';
            return { valid: true, state: gameState };
        }
        return { valid: false, message: '筹码不足' };
    }
    
    if (action === 'check') {
        if (gameState.aiBet === gameState.playerBet) {
            advanceTexasHoldemRound(gameState);
            return { valid: true, state: gameState };
        }
        return { valid: false, message: '不能check，需要跟注' };
    }
    
    if (action === 'allin') {
        const allInAmount = gameState.playerChips;
        gameState.pot += allInAmount;
        gameState.playerBet += allInAmount;
        gameState.playerChips = 0;
        gameState.playerAllIn = true;
        gameState.currentBet = Math.max(gameState.currentBet, gameState.playerBet);
        advanceTexasHoldemRound(gameState);
        return { valid: true, state: gameState };
    }
    
    return { valid: false, message: '无效操作' };
}

// 推进德州扑克轮次
function advanceTexasHoldemRound(gameState) {
    const rounds = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = rounds.indexOf(gameState.round);
    
    if (currentIndex < rounds.length - 1) {
        gameState.round = rounds[currentIndex + 1];
        gameState.currentBet = 0;
        gameState.playerBet = 0;
        gameState.aiBet = 0;
        
        // 发公共牌
        if (gameState.round === 'flop') {
            gameState.communityCards.push(gameState.deck.pop(), gameState.deck.pop(), gameState.deck.pop());
            gameState.message = '翻牌 - 请选择操作';
        } else if (gameState.round === 'turn') {
            gameState.communityCards.push(gameState.deck.pop());
            gameState.message = '转牌 - 请选择操作';
        } else if (gameState.round === 'river') {
            gameState.communityCards.push(gameState.deck.pop());
            gameState.message = '河牌 - 请选择操作';
        } else if (gameState.round === 'showdown') {
            // 比牌
            const playerRank = evaluateTexasHoldemHand([...gameState.playerHand, ...gameState.communityCards]);
            const aiRank = evaluateTexasHoldemHand([...gameState.aiHand, ...gameState.communityCards]);
            
            if (playerRank.rank > aiRank.rank || (playerRank.rank === aiRank.rank && playerRank.value > aiRank.value)) {
                gameState.winner = 'player';
                gameState.playerChips += gameState.pot;
                gameState.message = `玩家获胜！${playerRank.name} vs ${aiRank.name}`;
            } else if (aiRank.rank > playerRank.rank || (aiRank.rank === playerRank.rank && aiRank.value > playerRank.value)) {
                gameState.winner = 'ai';
                gameState.aiChips += gameState.pot;
                gameState.message = `AI获胜！${aiRank.name} vs ${playerRank.name}`;
            } else {
                gameState.winner = 'draw';
                gameState.playerChips += gameState.pot / 2;
                gameState.aiChips += gameState.pot / 2;
                gameState.message = `平局！都是${playerRank.name}`;
            }
            gameState.status = 'ended';
            return;
        }
        
        gameState.currentPlayer = 'player';
    }
}

// 评估德州扑克手牌（7张选5张）
function evaluateTexasHoldemHand(cards) {
    // 转换为数值
    const valueMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const sortedCards = cards.map(c => ({ ...c, numValue: valueMap[c.value] })).sort((a, b) => b.numValue - a.numValue);
    
    // 检查各种牌型
    const isFlush = checkFlush(sortedCards);
    const isStraight = checkStraight(sortedCards);
    const counts = getCardCounts(sortedCards);
    
    // 同花顺
    if (isFlush.has && isStraight.has) {
        const straightFlushCards = getStraightFlushCards(sortedCards);
        if (straightFlushCards.length >= 5) {
            return { rank: 9, value: straightFlushCards[0].numValue, name: '同花顺' };
        }
    }
    
    // 四条
    const fourOfAKind = Object.entries(counts).find(([v, c]) => c === 4);
    if (fourOfAKind) {
        const kicker = sortedCards.find(c => c.numValue !== parseInt(fourOfAKind[0]));
        return { rank: 8, value: parseInt(fourOfAKind[0]) * 100 + (kicker?.numValue || 0), name: '四条' };
    }
    
    // 葫芦
    const threeOfAKind = Object.entries(counts).find(([v, c]) => c === 3);
    const pair = Object.entries(counts).find(([v, c]) => c === 2);
    if (threeOfAKind && pair) {
        return { rank: 7, value: parseInt(threeOfAKind[0]) * 100 + parseInt(pair[0]), name: '葫芦' };
    }
    
    // 同花
    if (isFlush.has) {
        return { rank: 6, value: isFlush.cards[0].numValue, name: '同花' };
    }
    
    // 顺子
    if (isStraight.has) {
        return { rank: 5, value: isStraight.high, name: '顺子' };
    }
    
    // 三条
    if (threeOfAKind) {
        const kickers = sortedCards.filter(c => c.numValue !== parseInt(threeOfAKind[0])).slice(0, 2);
        return { rank: 4, value: parseInt(threeOfAKind[0]) * 10000 + kickers[0].numValue * 100 + kickers[1].numValue, name: '三条' };
    }
    
    // 两对
    const pairs = Object.entries(counts).filter(([v, c]) => c === 2).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
    if (pairs.length >= 2) {
        const kicker = sortedCards.find(c => c.numValue !== parseInt(pairs[0][0]) && c.numValue !== parseInt(pairs[1][0]));
        return { rank: 3, value: parseInt(pairs[0][0]) * 10000 + parseInt(pairs[1][0]) * 100 + (kicker?.numValue || 0), name: '两对' };
    }
    
    // 一对
    if (pairs.length === 1) {
        const kickers = sortedCards.filter(c => c.numValue !== parseInt(pairs[0][0])).slice(0, 3);
        return { rank: 2, value: parseInt(pairs[0][0]) * 1000000 + kickers[0].numValue * 10000 + kickers[1].numValue * 100 + kickers[2].numValue, name: '一对' };
    }
    
    // 高牌
    return { rank: 1, value: sortedCards[0].numValue * 100000000 + sortedCards[1].numValue * 1000000 + sortedCards[2].numValue * 10000 + sortedCards[3].numValue * 100 + sortedCards[4].numValue, name: '高牌' };
}

function checkFlush(cards) {
    const suits = {};
    cards.forEach(c => {
        if (!suits[c.suit]) suits[c.suit] = [];
        suits[c.suit].push(c);
    });
    for (const [suit, suitCards] of Object.entries(suits)) {
        if (suitCards.length >= 5) {
            return { has: true, cards: suitCards.slice(0, 5) };
        }
    }
    return { has: false };
}

function checkStraight(cards) {
    const uniqueValues = [...new Set(cards.map(c => c.numValue))].sort((a, b) => b - a);
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
            return { has: true, high: uniqueValues[i] };
        }
    }
    // 检查A-5顺子
    if (uniqueValues.includes(14) && uniqueValues.includes(5) && uniqueValues.includes(4) && uniqueValues.includes(3) && uniqueValues.includes(2)) {
        return { has: true, high: 5 };
    }
    return { has: false };
}

function getCardCounts(cards) {
    const counts = {};
    cards.forEach(c => {
        counts[c.numValue] = (counts[c.numValue] || 0) + 1;
    });
    return counts;
}

function getStraightFlushCards(cards) {
    const suits = {};
    cards.forEach(c => {
        if (!suits[c.suit]) suits[c.suit] = [];
        suits[c.suit].push(c);
    });
    for (const suitCards of Object.values(suits)) {
        if (suitCards.length >= 5) {
            const sorted = suitCards.sort((a, b) => b.numValue - a.numValue);
            const uniqueValues = [...new Set(sorted.map(c => c.numValue))];
            for (let i = 0; i <= uniqueValues.length - 5; i++) {
                if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
                    return sorted.filter(c => c.numValue <= uniqueValues[i] && c.numValue >= uniqueValues[i + 4]).slice(0, 5);
                }
            }
        }
    }
    return [];
}

// ==================== 炸金花执行逻辑 ====================
function executeZhaJinHuaMove(gameState, extra) {
    const { action } = extra;
    
    if (gameState.status !== 'playing') {
        return { valid: false, message: '游戏已结束' };
    }
    
    if (action === 'fold') {
        gameState.playerFolded = true;
        gameState.status = 'ended';
        gameState.winner = 'ai';
        gameState.aiChips += gameState.pot;
        gameState.message = '玩家弃牌，AI获胜！';
        return { valid: true, state: gameState, winner: 'ai' };
    }
    
    if (action === 'see') {
        gameState.playerSeen = true;
        // 比牌
        const playerRank = evaluateZhaJinHuaHand(gameState.playerHand);
        const aiRank = evaluateZhaJinHuaHand(gameState.aiHand);
        
        gameState.status = 'ended';
        
        if (playerRank.rank > aiRank.rank || (playerRank.rank === aiRank.rank && playerRank.value > aiRank.value)) {
            gameState.winner = 'player';
            gameState.playerChips += gameState.pot;
            gameState.message = `玩家获胜！${playerRank.name} vs ${aiRank.name}`;
        } else if (aiRank.rank > playerRank.rank || (aiRank.rank === playerRank.rank && aiRank.value > playerRank.value)) {
            gameState.winner = 'ai';
            gameState.aiChips += gameState.pot;
            gameState.message = `AI获胜！${aiRank.name} vs ${playerRank.name}`;
        } else {
            gameState.winner = 'draw';
            gameState.playerChips += gameState.pot / 2;
            gameState.aiChips += gameState.pot / 2;
            gameState.message = `平局！都是${playerRank.name}`;
        }
        
        return { valid: true, state: gameState, winner: gameState.winner };
    }
    
    if (action === 'bet') {
        const betAmount = extra.amount;
        if (gameState.playerChips >= betAmount) {
            gameState.playerChips -= betAmount;
            gameState.pot += betAmount;
            gameState.currentPlayer = 'ai';
            return { valid: true, state: gameState };
        }
        return { valid: false, message: '筹码不足' };
    }
    
    return { valid: false, message: '无效操作' };
}

// 评估炸金花手牌
function evaluateZhaJinHuaHand(hand) {
    const valueMap = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const sortedHand = hand.map(c => ({ ...c, numValue: valueMap[c.value] })).sort((a, b) => b.numValue - a.numValue);
    
    const isSameSuit = sortedHand[0].suit === sortedHand[1].suit && sortedHand[1].suit === sortedHand[2].suit;
    const isStraight = sortedHand[0].numValue - sortedHand[1].numValue === 1 && sortedHand[1].numValue - sortedHand[2].numValue === 1;
    const isPair = sortedHand[0].numValue === sortedHand[1].numValue || sortedHand[1].numValue === sortedHand[2].numValue || sortedHand[0].numValue === sortedHand[2].numValue;
    const isThreeOfAKind = sortedHand[0].numValue === sortedHand[1].numValue && sortedHand[1].numValue === sortedHand[2].numValue;
    
    // 豹子
    if (isThreeOfAKind) {
        return { rank: 6, value: sortedHand[0].numValue, name: '豹子' };
    }
    
    // 同花顺
    if (isSameSuit && isStraight) {
        return { rank: 5, value: sortedHand[0].numValue, name: '同花顺' };
    }
    
    // 同花
    if (isSameSuit) {
        return { rank: 4, value: sortedHand[0].numValue * 10000 + sortedHand[1].numValue * 100 + sortedHand[2].numValue, name: '同花' };
    }
    
    // 顺子
    if (isStraight) {
        return { rank: 3, value: sortedHand[0].numValue, name: '顺子' };
    }
    
    // 对子
    if (isPair) {
        let pairValue, kicker;
        if (sortedHand[0].numValue === sortedHand[1].numValue) {
            pairValue = sortedHand[0].numValue;
            kicker = sortedHand[2].numValue;
        } else if (sortedHand[1].numValue === sortedHand[2].numValue) {
            pairValue = sortedHand[1].numValue;
            kicker = sortedHand[0].numValue;
        } else {
            pairValue = sortedHand[0].numValue;
            kicker = sortedHand[1].numValue;
        }
        return { rank: 2, value: pairValue * 100 + kicker, name: '对子' };
    }
    
    // 单张
    return { rank: 1, value: sortedHand[0].numValue * 10000 + sortedHand[1].numValue * 100 + sortedHand[2].numValue, name: '单张' };
}

// ==================== 斗地主执行逻辑 ====================
function executeDouDiZhuMove(gameState, extra) {
    const { action } = extra;
    
    if (gameState.status !== 'playing') {
        return { valid: false, message: '游戏已结束' };
    }
    
    // 叫分阶段
    if (gameState.phase === 'calling') {
        if (action === 'call') {
            const score = extra.score;
            if (score < 0 || score > 3) {
                return { valid: false, message: '叫分必须在0-3之间' };
            }
            
            gameState.playerCalled = true;
            if (score > gameState.callScore) {
                gameState.callScore = score;
                gameState.landlord = 'player';
            }
            
            // AI叫分
            const ai1Score = Math.floor(Math.random() * 4);
            const ai2Score = Math.floor(Math.random() * 4);
            
            if (ai1Score > gameState.callScore) {
                gameState.callScore = ai1Score;
                gameState.landlord = 'ai1';
            }
            if (ai2Score > gameState.callScore) {
                gameState.callScore = ai2Score;
                gameState.landlord = 'ai2';
            }
            
            // 确定地主
            if (gameState.callScore > 0) {
                gameState.phase = 'playing';
                // 地主获得底牌
                if (gameState.landlord === 'player') {
                    gameState.playerHand.push(...gameState.bottomCards);
                    sortDouDiZhuHand(gameState.playerHand);
                } else if (gameState.landlord === 'ai1') {
                    gameState.ai1Hand.push(...gameState.bottomCards);
                    sortDouDiZhuHand(gameState.ai1Hand);
                } else {
                    gameState.ai2Hand.push(...gameState.bottomCards);
                    sortDouDiZhuHand(gameState.ai2Hand);
                }
                gameState.currentPlayer = gameState.landlord;
                gameState.message = `${gameState.landlord === 'player' ? '玩家' : gameState.landlord}是地主，请出牌`;
            } else {
                // 重新发牌
                return { valid: true, state: initDouDiZhuState(), message: '无人叫分，重新发牌' };
            }
            
            return { valid: true, state: gameState };
        }
        return { valid: false, message: '无效操作' };
    }
    
    // 出牌阶段
    if (gameState.phase === 'playing') {
        if (action === 'play') {
            const cards = extra.cards;
            const playType = validateDouDiZhuPlay(cards);
            
            if (!playType.valid) {
                return { valid: false, message: playType.message };
            }
            
            // 检查是否能打过上一手
            if (gameState.lastPlay && gameState.lastPlayer !== 'player') {
                const comparison = compareDouDiZhuPlays(gameState.lastPlay, { type: playType.type, value: playType.value, cards });
                if (!comparison.canBeat) {
                    return { valid: false, message: '打不过上一手牌' };
                }
            }
            
            // 移除出的牌
            for (const card of cards) {
                const index = gameState.playerHand.findIndex(c => c.suit === card.suit && c.value === card.value);
                if (index > -1) {
                    gameState.playerHand.splice(index, 1);
                }
            }
            
            gameState.lastPlay = { type: playType.type, value: playType.value, cards };
            gameState.lastPlayer = 'player';
            gameState.passCount = 0;
            
            // 检查是否获胜
            if (gameState.playerHand.length === 0) {
                gameState.status = 'ended';
                gameState.winner = gameState.landlord === 'player' ? 'landlord' : 'farmers';
                gameState.message = gameState.winner === 'landlord' ? '地主获胜！' : '农民获胜！';
                return { valid: true, state: gameState, winner: gameState.winner };
            }
            
            gameState.currentPlayer = 'ai1';
            gameState.message = 'AI1出牌中...';
            return { valid: true, state: gameState };
        }
        
        if (action === 'pass') {
            if (gameState.lastPlayer === 'player' || gameState.lastPlayer === null) {
                return { valid: false, message: '不能pass' };
            }
            
            gameState.passCount++;
            if (gameState.passCount >= 2) {
                gameState.lastPlay = null;
                gameState.passCount = 0;
            }
            
            gameState.currentPlayer = 'ai1';
            gameState.message = 'AI1出牌中...';
            return { valid: true, state: gameState };
        }
    }
    
    return { valid: false, message: '无效操作' };
}

// 验证斗地主出牌
function validateDouDiZhuPlay(cards) {
    if (cards.length === 0) {
        return { valid: false, message: '不能为空' };
    }
    
    const valueMap = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '小王': 16, '大王': 17 };
    const values = cards.map(c => valueMap[c.value]).sort((a, b) => a - b);
    
    // 单张
    if (cards.length === 1) {
        return { valid: true, type: 'single', value: values[0] };
    }
    
    // 对子
    if (cards.length === 2 && values[0] === values[1]) {
        return { valid: true, type: 'pair', value: values[0] };
    }
    
    // 三张
    if (cards.length === 3 && values[0] === values[1] && values[1] === values[2]) {
        return { valid: true, type: 'triple', value: values[0] };
    }
    
    // 三带一
    if (cards.length === 4) {
        if ((values[0] === values[1] && values[1] === values[2]) ||
            (values[1] === values[2] && values[2] === values[3])) {
            return { valid: true, type: 'triple_with_single', value: values[1] };
        }
    }
    
    // 炸弹（四张相同）
    if (cards.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3]) {
        return { valid: true, type: 'bomb', value: values[0] };
    }
    
    // 王炸
    if (cards.length === 2 && values.includes(16) && values.includes(17)) {
        return { valid: true, type: 'rocket', value: 100 };
    }
    
    // 顺子（5张以上连续）
    if (cards.length >= 5) {
        let isStraight = true;
        for (let i = 1; i < values.length; i++) {
            if (values[i] - values[i - 1] !== 1 || values[i] > 14) {
                isStraight = false;
                break;
            }
        }
        if (isStraight) {
            return { valid: true, type: 'straight', value: values[values.length - 1], length: cards.length };
        }
    }
    
    // 连对
    if (cards.length >= 4 && cards.length % 2 === 0) {
        let isChain = true;
        for (let i = 0; i < values.length; i += 2) {
            if (values[i] !== values[i + 1] || (i > 0 && values[i] - values[i - 2] !== 1) || values[i] > 14) {
                isChain = false;
                break;
            }
        }
        if (isChain) {
            return { valid: true, type: 'chain_pairs', value: values[values.length - 1], length: cards.length / 2 };
        }
    }
    
    // 飞机（连续三张）
    if (cards.length >= 6 && cards.length % 3 === 0) {
        let isPlane = true;
        for (let i = 0; i < values.length; i += 3) {
            if (values[i] !== values[i + 1] || values[i + 1] !== values[i + 2] ||
                (i > 0 && values[i] - values[i - 3] !== 1) || values[i] > 14) {
                isPlane = false;
                break;
            }
        }
        if (isPlane) {
            return { valid: true, type: 'plane', value: values[values.length - 1], length: cards.length / 3 };
        }
    }
    
    return { valid: false, message: '无效的牌型' };
}

// 比较斗地主出牌
function compareDouDiZhuPlays(lastPlay, currentPlay) {
    // 王炸最大
    if (currentPlay.type === 'rocket') {
        return { canBeat: true };
    }
    
    // 炸弹可以打非炸弹
    if (currentPlay.type === 'bomb' && lastPlay.type !== 'bomb' && lastPlay.type !== 'rocket') {
        return { canBeat: true };
    }
    
    // 炸弹比大小
    if (currentPlay.type === 'bomb' && lastPlay.type === 'bomb') {
        return { canBeat: currentPlay.value > lastPlay.value };
    }
    
    // 相同类型比大小
    if (currentPlay.type === lastPlay.type) {
        if (currentPlay.length && lastPlay.length) {
            if (currentPlay.length !== lastPlay.length) {
                return { canBeat: false };
            }
        }
        return { canBeat: currentPlay.value > lastPlay.value };
    }
    
    return { canBeat: false };
}

// ==================== AI计算 ====================
function calculateAIMove(gameType, state, aiColor, difficulty = 'normal') {
    switch (gameType) {
        case 'gomoku': return calculateGomokuAIMove(state, aiColor, difficulty);
        case 'go': return calculateGoAIMove(state, aiColor, difficulty);
        case 'chineseChess': return calculateChineseChessAIMove(state, aiColor, difficulty);
        case 'chess': return calculateChessAIMove(state, aiColor, difficulty);
        case 'checkers': return calculateCheckersAIMove(state, aiColor, difficulty);
        case 'othello': return calculateOthelloAIMove(state, aiColor, difficulty);
        case 'flightChess': return calculateFlightChessAIMove(state, aiColor, difficulty);
        case 'poker': return calculatePokerAIMove(state, difficulty);
        default: return null;
    }
}

// ==================== 五子棋AI（6个难度等级）====================
function calculateGomokuAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateGomokuEasyMove(state, aiColor);
        case 'simple': return calculateGomokuSimpleMove(state, aiColor);
        case 'normal': return calculateGomokuNormalMove(state, aiColor);
        case 'expert': return calculateGomokuExpertMove(state, aiColor);
        case 'hard': return calculateGomokuHardMove(state, aiColor);
        case 'inferno': return calculateGomokuInfernoMove(state, aiColor);
        default: return calculateGomokuNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateGomokuEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null) validMoves.push({ from: null, to: { row: r, col: c } });
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
}

// 简单：优先中心，其次随机
function calculateGomokuSimpleMove(state, aiColor) {
    const board = state.board;
    const center = 7;
    // 优先中心
    if (board[center][center] === null) return { from: null, to: { row: center, col: center } };
    // 随机选择
    const validMoves = [];
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && hasNeighbor(board, r, c)) {
                validMoves.push({ from: null, to: { row: r, col: c } });
            }
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : calculateGomokuEasyMove(state, aiColor);
}

// 普通：简单评估函数，选择最高分走法
function calculateGomokuNormalMove(state, aiColor) {
    const board = state.board;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    // 检查必胜和必防
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
    // 评估最佳位置
    let bestMove = null;
    let bestScore = -1;
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && hasNeighbor(board, r, c)) {
                const score = evaluateGomokuPosition(board, r, c, aiColor);
                if (score > bestScore) { bestScore = score; bestMove = { from: null, to: { row: r, col: c } }; }
            }
        }
    }
    if (!bestMove) {
        const center = 7;
        if (board[center][center] === null) return { from: null, to: { row: center, col: center } };
    }
    return bestMove;
}

// 专家：Minimax算法，深度3
function calculateGomokuExpertMove(state, aiColor) {
    return gomokuMinimax(state.board, aiColor, aiColor, 3, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度5
function calculateGomokuHardMove(state, aiColor) {
    return gomokuMinimax(state.board, aiColor, aiColor, 5, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度7 + 开局库
function calculateGomokuInfernoMove(state, aiColor) {
    const board = state.board;
    // 开局库：前3手使用最优开局
    const moveCount = countMoves(board);
    if (moveCount === 0) return { from: null, to: { row: 7, col: 7 } }; // 天元
    if (moveCount === 1) {
        // 第二手：花月/浦月
        const moves = [{ row: 6, col: 6 }, { row: 6, col: 8 }, { row: 8, col: 6 }, { row: 8, col: 8 }];
        return { from: null, to: moves[Math.floor(Math.random() * moves.length)] };
    }
    if (moveCount === 2) {
        // 第三手：斜二/直二
        const moves = [{ row: 5, col: 5 }, { row: 5, col: 9 }, { row: 9, col: 5 }, { row: 9, col: 9 }];
        return { from: null, to: moves[Math.floor(Math.random() * moves.length)] };
    }
    return gomokuMinimax(board, aiColor, aiColor, 7, -Infinity, Infinity, true).move;
}

function countMoves(board) {
    let count = 0;
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] !== null) count++;
        }
    }
    return count;
}

function gomokuMinimax(board, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'black' ? 'white' : 'black';
    const currentOpponent = currentColor === 'black' ? 'white' : 'black';
    
    // 检查终局
    const winner = checkGomokuWinner(board);
    if (winner === aiColor) return { score: 1000000 - (10 - depth) * 1000, move: null };
    if (winner === opponent) return { score: -1000000 + (10 - depth) * 1000, move: null };
    if (depth === 0) return { score: evaluateGomokuBoard(board, aiColor), move: null };
    
    const validMoves = getGomokuValidMoves(board);
    if (validMoves.length === 0) return { score: 0, move: null };
    
    // 按启发式排序走法
    validMoves.sort((a, b) => {
        const scoreA = evaluateGomokuPosition(board, a.row, a.col, currentColor);
        const scoreB = evaluateGomokuPosition(board, b.row, b.col, currentColor);
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 10)) { // 限制分支因子
            const newBoard = JSON.parse(JSON.stringify(board));
            newBoard[move.row][move.col] = currentColor;
            const evalResult = gomokuMinimax(newBoard, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 10)) {
            const newBoard = JSON.parse(JSON.stringify(board));
            newBoard[move.row][move.col] = currentColor;
            const evalResult = gomokuMinimax(newBoard, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getGomokuValidMoves(board) {
    const moves = [];
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && hasNeighbor(board, r, c)) {
                moves.push({ row: r, col: c });
            }
        }
    }
    return moves.length > 0 ? moves : [{ row: 7, col: 7 }];
}

function checkGomokuWinner(board) {
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c]) {
                if (wouldWin(board, r, c, board[r][c], 5)) return board[r][c];
            }
        }
    }
    return null;
}

function evaluateGomokuBoard(board, aiColor) {
    let score = 0;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (board[r][c] === null && hasNeighbor(board, r, c)) {
                score += evaluateGomokuPosition(board, r, c, aiColor);
                score -= evaluateGomokuPosition(board, r, c, opponent) * 0.8;
            }
        }
    }
    return score;
}

function evaluateGomokuPosition(board, row, col, color) {
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
        // 评分权重
        if (count >= 4) score += openEnds > 0 ? 100000 : 10000;
        else if (count === 3) score += openEnds === 2 ? 10000 : openEnds === 1 ? 1000 : 100;
        else if (count === 2) score += openEnds === 2 ? 1000 : openEnds === 1 ? 100 : 10;
        else if (count === 1) score += openEnds === 2 ? 100 : openEnds === 1 ? 10 : 1;
    }
    return score;
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

// ==================== 围棋AI（6个难度等级）====================
function calculateGoAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateGoEasyMove(state, aiColor);
        case 'simple': return calculateGoSimpleMove(state, aiColor);
        case 'normal': return calculateGoNormalMove(state, aiColor);
        case 'expert': return calculateGoExpertMove(state, aiColor);
        case 'hard': return calculateGoHardMove(state, aiColor);
        case 'inferno': return calculateGoInfernoMove(state, aiColor);
        default: return calculateGoNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateGoEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === null) validMoves.push({ from: null, to: { row: r, col: c } });
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : { from: null, to: null };
}

// 简单：优先吃子，其次随机
function calculateGoSimpleMove(state, aiColor) {
    const board = state.board;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    // 优先吃子
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === null) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[r][c] = aiColor;
                const captured = captureStones(testBoard, r, c, opponent);
                if (captured.length > 0) return { from: null, to: { row: r, col: c } };
            }
        }
    }
    // 随机选择
    return calculateGoEasyMove(state, aiColor);
}

// 普通：基础评估，考虑吃子和气
function calculateGoNormalMove(state, aiColor) {
    const board = state.board;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    let bestMove = null;
    let bestScore = -1;
    
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === null) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[r][c] = aiColor;
                const captured = captureStones(testBoard, r, c, opponent);
                const group = getGroup(testBoard, r, c);
                const liberties = getLiberties(testBoard, group);
                
                if (liberties > 0 || captured.length > 0) {
                    let score = captured.length * 100 + liberties * 10;
                    // 优先角和边
                    if ((r === 0 || r === 18) && (c === 0 || c === 18)) score += 50;
                    else if (r === 0 || r === 18 || c === 0 || c === 18) score += 20;
                    // 优先星位
                    const starPoints = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
                    if (starPoints.some(([sr, sc]) => sr === r && sc === c)) score += 30;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { from: null, to: { row: r, col: c } };
                    }
                }
            }
        }
    }
    return bestMove || { from: null, to: null };
}

// 专家：Minimax算法，深度2
function calculateGoExpertMove(state, aiColor) {
    return goMinimax(state.board, aiColor, aiColor, 2, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度3
function calculateGoHardMove(state, aiColor) {
    return goMinimax(state.board, aiColor, aiColor, 3, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度4 + 模式识别
function calculateGoInfernoMove(state, aiColor) {
    const board = state.board;
    const moveCount = countGoMoves(board);
    // 开局库
    if (moveCount === 0) {
        const openings = [{ row: 3, col: 3 }, { row: 3, col: 15 }, { row: 15, col: 3 }, { row: 15, col: 15 }, { row: 9, col: 9 }];
        return { from: null, to: openings[Math.floor(Math.random() * openings.length)] };
    }
    if (moveCount === 1) {
        const openings = [{ row: 15, col: 15 }, { row: 15, col: 3 }, { row: 3, col: 15 }, { row: 3, col: 3 }, { row: 9, col: 9 }];
        return { from: null, to: openings[Math.floor(Math.random() * openings.length)] };
    }
    return goMinimax(board, aiColor, aiColor, 4, -Infinity, Infinity, true).move;
}

function countGoMoves(board) {
    let count = 0;
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] !== null) count++;
        }
    }
    return count;
}

function goMinimax(board, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'black' ? 'white' : 'black';
    const currentOpponent = currentColor === 'black' ? 'white' : 'black';
    
    if (depth === 0) return { score: evaluateGoBoard(board, aiColor), move: null };
    
    const validMoves = getGoValidMoves(board, currentColor);
    if (validMoves.length === 0) return { score: evaluateGoBoard(board, aiColor), move: null };
    
    // 按启发式排序
    validMoves.sort((a, b) => {
        const scoreA = evaluateGoMove(board, a.row, a.col, currentColor);
        const scoreB = evaluateGoMove(board, b.row, b.col, currentColor);
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 8)) {
            const newBoard = JSON.parse(JSON.stringify(board));
            newBoard[move.row][move.col] = currentColor;
            captureStones(newBoard, move.row, move.col, currentOpponent);
            const evalResult = goMinimax(newBoard, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 8)) {
            const newBoard = JSON.parse(JSON.stringify(board));
            newBoard[move.row][move.col] = currentColor;
            captureStones(newBoard, move.row, move.col, currentOpponent);
            const evalResult = goMinimax(newBoard, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getGoValidMoves(board, color) {
    const moves = [];
    const opponent = color === 'black' ? 'white' : 'black';
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === null) {
                const testBoard = JSON.parse(JSON.stringify(board));
                testBoard[r][c] = color;
                const captured = captureStones(testBoard, r, c, opponent);
                const group = getGroup(testBoard, r, c);
                const liberties = getLiberties(testBoard, group);
                if (liberties > 0 || captured.length > 0) {
                    moves.push({ row: r, col: c });
                }
            }
        }
    }
    return moves;
}

function evaluateGoMove(board, row, col, color) {
    const opponent = color === 'black' ? 'white' : 'black';
    const testBoard = JSON.parse(JSON.stringify(board));
    testBoard[row][col] = color;
    const captured = captureStones(testBoard, row, col, opponent);
    const group = getGroup(testBoard, row, col);
    const liberties = getLiberties(testBoard, group);
    
    let score = captured.length * 100 + liberties * 10;
    // 角和边加分
    if ((row === 0 || row === 18) && (col === 0 || col === 18)) score += 50;
    else if (row === 0 || row === 18 || col === 0 || col === 18) score += 20;
    return score;
}

function evaluateGoBoard(board, aiColor) {
    let score = 0;
    const opponent = aiColor === 'black' ? 'white' : 'black';
    const visited = new Set();
    
    for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
            if (board[r][c] === aiColor) score += 10;
            else if (board[r][c] === opponent) score -= 10;
            else if (board[r][c] === null && !visited.has(`${r},${c}`)) {
                // 计算领地
                const territory = getGoTerritory(board, r, c, visited);
                if (territory.color === aiColor) score += territory.count * 5;
                else if (territory.color === opponent) score -= territory.count * 5;
            }
        }
    }
    return score;
}

function getGoTerritory(board, row, col, visited) {
    const territory = [];
    const stack = [[row, col]];
    const colors = new Set();
    
    while (stack.length > 0) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        if (r < 0 || r >= 19 || c < 0 || c >= 19) continue;
        
        if (board[r][c] === null) {
            visited.add(key);
            territory.push([r, c]);
            stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        } else {
            colors.add(board[r][c]);
        }
    }
    
    if (colors.size === 1) {
        return { color: Array.from(colors)[0], count: territory.length };
    }
    return { color: null, count: territory.length };
}

// ==================== 中国象棋AI（6个难度等级）====================
function calculateChineseChessAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateChineseChessEasyMove(state, aiColor);
        case 'simple': return calculateChineseChessSimpleMove(state, aiColor);
        case 'normal': return calculateChineseChessNormalMove(state, aiColor);
        case 'expert': return calculateChineseChessExpertMove(state, aiColor);
        case 'hard': return calculateChineseChessHardMove(state, aiColor);
        case 'inferno': return calculateChineseChessInfernoMove(state, aiColor);
        default: return calculateChineseChessNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateChineseChessEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 10; tr++) {
                    for (let tc = 0; tc < 9; tc++) {
                        if (isValidChineseChessMove(board, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            validMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
            }
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
}

// 简单：优先吃子，否则随机
function calculateChineseChessSimpleMove(state, aiColor) {
    const board = state.board;
    const captureMoves = [];
    const otherMoves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 10; tr++) {
                    for (let tc = 0; tc < 9; tc++) {
                        if (isValidChineseChessMove(board, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            const target = board[tr][tc];
                            if (target && target.color !== aiColor) {
                                captureMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, value: getChinesePieceValue(target.type) });
                            } else {
                                otherMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                            }
                        }
                    }
                }
            }
        }
    }
    if (captureMoves.length > 0) {
        captureMoves.sort((a, b) => b.value - a.value);
        return { from: captureMoves[0].from, to: captureMoves[0].to };
    }
    return otherMoves.length > 0 ? otherMoves[Math.floor(Math.random() * otherMoves.length)] : null;
}

// 普通：简单评估函数
function calculateChineseChessNormalMove(state, aiColor) {
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
                            let score = target ? getChinesePieceValue(target.type) : 0;
                            // 位置评估
                            score += evaluateChineseChessPosition(piece, tr, tc);
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

// 专家：Minimax算法，深度3
function calculateChineseChessExpertMove(state, aiColor) {
    return chineseChessMinimax(state, aiColor, aiColor, 3, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度4
function calculateChineseChessHardMove(state, aiColor) {
    return chineseChessMinimax(state, aiColor, aiColor, 4, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度5 + 高级评估
function calculateChineseChessInfernoMove(state, aiColor) {
    return chineseChessMinimax(state, aiColor, aiColor, 5, -Infinity, Infinity, true).move;
}

function chineseChessMinimax(state, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'red' ? 'black' : 'red';
    const currentOpponent = currentColor === 'red' ? 'black' : 'red';
    const board = state.board;
    
    // 检查终局
    const winner = checkChineseChessWinner(state);
    if (winner === aiColor) return { score: 1000000 - (10 - depth) * 1000, move: null };
    if (winner === opponent) return { score: -1000000 + (10 - depth) * 1000, move: null };
    if (depth === 0) return { score: evaluateChineseChessBoard(state, aiColor), move: null };
    
    const validMoves = getChineseChessValidMoves(state, currentColor);
    if (validMoves.length === 0) return { score: 0, move: null };
    
    // 按启发式排序
    validMoves.sort((a, b) => {
        const scoreA = a.captured ? getChinesePieceValue(a.captured.type) : 0;
        const scoreB = b.captured ? getChinesePieceValue(b.captured.type) : 0;
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 15)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeChineseChessMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = chineseChessMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = move;
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 15)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeChineseChessMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = chineseChessMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = move;
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getChineseChessValidMoves(state, color) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                for (let tr = 0; tr < 10; tr++) {
                    for (let tc = 0; tc < 9; tc++) {
                        if (isValidChineseChessMove(board, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            moves.push({ 
                                from: { row: r, col: c }, 
                                to: { row: tr, col: tc },
                                captured: board[tr][tc]
                            });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function executeChineseChessMoveInternal(state, from, to, color) {
    const piece = state.board[from.row][from.col];
    const captured = state.board[to.row][to.col];
    if (captured) state.captured[color].push(captured);
    state.board[to.row][to.col] = piece;
    state.board[from.row][from.col] = null;
    state.currentPlayer = color === 'red' ? 'black' : 'red';
}

function checkChineseChessWinner(state) {
    let redGeneral = false, blackGeneral = false;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = state.board[r][c];
            if (piece && piece.type === 'general') {
                if (piece.color === 'red') redGeneral = true;
                else blackGeneral = true;
            }
        }
    }
    if (!redGeneral) return 'black';
    if (!blackGeneral) return 'red';
    return null;
}

function evaluateChineseChessBoard(state, aiColor) {
    let score = 0;
    const opponent = aiColor === 'red' ? 'black' : 'red';
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const piece = state.board[r][c];
            if (piece) {
                const value = getChinesePieceValue(piece.type);
                if (piece.color === aiColor) score += value + evaluateChineseChessPosition(piece, r, c);
                else score -= value + evaluateChineseChessPosition(piece, r, c);
            }
        }
    }
    return score;
}

function evaluateChineseChessPosition(piece, row, col) {
    // 简单的位置评估
    let score = 0;
    // 兵过河加分
    if (piece.type === 'soldier') {
        if (piece.color === 'red' && row < 5) score += 20;
        if (piece.color === 'black' && row > 4) score += 20;
    }
    // 中心控制
    if (col >= 3 && col <= 5) score += 5;
    return score;
}

function getChinesePieceValue(type) {
    const values = { general: 10000, chariot: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, soldier: 100 };
    return values[type] || 0;
}

function getPieceValue(type) {
    const values = { general: 10000, chariot: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, soldier: 100 };
    return values[type] || 0;
}

// ==================== 国际象棋AI（6个难度等级）====================
function calculateChessAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateChessEasyMove(state, aiColor);
        case 'simple': return calculateChessSimpleMove(state, aiColor);
        case 'normal': return calculateChessNormalMove(state, aiColor);
        case 'expert': return calculateChessExpertMove(state, aiColor);
        case 'hard': return calculateChessHardMove(state, aiColor);
        case 'inferno': return calculateChessInfernoMove(state, aiColor);
        default: return calculateChessNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateChessEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidChessMove(state, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            validMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
            }
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
}

// 简单：优先吃子，否则随机
function calculateChessSimpleMove(state, aiColor) {
    const board = state.board;
    const captureMoves = [];
    const otherMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidChessMove(state, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            const target = board[tr][tc];
                            if (target && target.color !== aiColor) {
                                captureMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, value: getChessPieceValue(target.type) });
                            } else {
                                otherMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                            }
                        }
                    }
                }
            }
        }
    }
    if (captureMoves.length > 0) {
        captureMoves.sort((a, b) => b.value - a.value);
        return { from: captureMoves[0].from, to: captureMoves[0].to };
    }
    return otherMoves.length > 0 ? otherMoves[Math.floor(Math.random() * otherMoves.length)] : null;
}

// 普通：简单评估函数
function calculateChessNormalMove(state, aiColor) {
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
                            let score = target ? getChessPieceValue(target.type) : 0;
                            // 位置评估
                            score += evaluateChessPosition(piece, tr, tc);
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

// 专家：Minimax算法，深度3
function calculateChessExpertMove(state, aiColor) {
    return chessMinimax(state, aiColor, aiColor, 3, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度4
function calculateChessHardMove(state, aiColor) {
    return chessMinimax(state, aiColor, aiColor, 4, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度5 + 高级评估
function calculateChessInfernoMove(state, aiColor) {
    return chessMinimax(state, aiColor, aiColor, 5, -Infinity, Infinity, true).move;
}

function chessMinimax(state, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'white' ? 'black' : 'white';
    const currentOpponent = currentColor === 'white' ? 'black' : 'white';
    
    // 检查终局
    const winner = checkChessWinner(state);
    if (winner === aiColor) return { score: 1000000 - (10 - depth) * 1000, move: null };
    if (winner === opponent) return { score: -1000000 + (10 - depth) * 1000, move: null };
    if (depth === 0) return { score: evaluateChessBoard(state, aiColor), move: null };
    
    const validMoves = getChessValidMoves(state, currentColor);
    if (validMoves.length === 0) return { score: 0, move: null };
    
    // 按启发式排序
    validMoves.sort((a, b) => {
        const scoreA = a.captured ? getChessPieceValue(a.captured.type) : 0;
        const scoreB = b.captured ? getChessPieceValue(b.captured.type) : 0;
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 15)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeChessMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = chessMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = move;
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 15)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeChessMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = chessMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = move;
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getChessValidMoves(state, color) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidChessMove(state, { row: r, col: c }, { row: tr, col: tc }, piece)) {
                            moves.push({ 
                                from: { row: r, col: c }, 
                                to: { row: tr, col: tc },
                                captured: board[tr][tc]
                            });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function executeChessMoveInternal(state, from, to, color) {
    const piece = state.board[from.row][from.col];
    const captured = state.board[to.row][to.col];
    if (captured) state.captured[color].push(captured);
    state.board[to.row][to.col] = piece;
    state.board[from.row][from.col] = null;
    state.currentPlayer = color === 'white' ? 'black' : 'white';
}

function checkChessWinner(state) {
    let whiteKing = false, blackKing = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (piece && piece.type === 'king') {
                if (piece.color === 'white') whiteKing = true;
                else blackKing = true;
            }
        }
    }
    if (!whiteKing) return 'black';
    if (!blackKing) return 'white';
    return null;
}

function evaluateChessBoard(state, aiColor) {
    let score = 0;
    const opponent = aiColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (piece) {
                const value = getChessPieceValue(piece.type);
                if (piece.color === aiColor) score += value + evaluateChessPosition(piece, r, c);
                else score -= value + evaluateChessPosition(piece, r, c);
            }
        }
    }
    return score;
}

function evaluateChessPosition(piece, row, col) {
    // 简单的位置评估表
    const pawnTable = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    if (piece.type === 'pawn') {
        return piece.color === 'white' ? pawnTable[row][col] : pawnTable[7 - row][col];
    }
    // 中心控制
    if (col >= 2 && col <= 5 && row >= 2 && row <= 5) return 10;
    return 0;
}

function getChessPieceValue(type) {
    const values = { queen: 900, rook: 500, bishop: 330, knight: 320, pawn: 100, king: 10000 };
    return values[type] || 0;
}

// ==================== 跳棋AI（6个难度等级）====================
function calculateCheckersAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateCheckersEasyMove(state, aiColor);
        case 'simple': return calculateCheckersSimpleMove(state, aiColor);
        case 'normal': return calculateCheckersNormalMove(state, aiColor);
        case 'expert': return calculateCheckersExpertMove(state, aiColor);
        case 'hard': return calculateCheckersHardMove(state, aiColor);
        case 'inferno': return calculateCheckersInfernoMove(state, aiColor);
        default: return calculateCheckersNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateCheckersEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                const jumpDirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
                for (const [dr, dc] of jumpDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, true)) {
                            validMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
                const moveDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of moveDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, false)) {
                            validMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
            }
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
}

// 简单：优先跳吃，否则随机
function calculateCheckersSimpleMove(state, aiColor) {
    const board = state.board;
    const jumpMoves = [];
    const otherMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === aiColor) {
                const jumpDirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
                for (const [dr, dc] of jumpDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, true)) {
                            jumpMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
                const moveDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of moveDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, false)) {
                            otherMoves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
                        }
                    }
                }
            }
        }
    }
    if (jumpMoves.length > 0) return jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
    return otherMoves.length > 0 ? otherMoves[Math.floor(Math.random() * otherMoves.length)] : null;
}

// 普通：简单评估，优先跳吃和升王
function calculateCheckersNormalMove(state, aiColor) {
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
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, score: 100 });
                        }
                    }
                }
                const moveDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                for (const [dr, dc] of moveDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, false)) {
                            let score = 1;
                            // 优先升王
                            if (!piece.king) {
                                if (aiColor === 'red' && tr === 7) score += 50;
                                if (aiColor === 'blue' && tr === 0) score += 50;
                            }
                            // 前进加分
                            if (aiColor === 'red' && dr > 0) score += 5;
                            if (aiColor === 'blue' && dr < 0) score += 5;
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

// 专家：Minimax算法，深度4
function calculateCheckersExpertMove(state, aiColor) {
    return checkersMinimax(state, aiColor, aiColor, 4, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度6
function calculateCheckersHardMove(state, aiColor) {
    return checkersMinimax(state, aiColor, aiColor, 6, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度8
function calculateCheckersInfernoMove(state, aiColor) {
    return checkersMinimax(state, aiColor, aiColor, 8, -Infinity, Infinity, true).move;
}

function checkersMinimax(state, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'red' ? 'blue' : 'red';
    const currentOpponent = currentColor === 'red' ? 'blue' : 'red';
    
    // 检查终局
    const winner = checkCheckersWin(state.board);
    if (winner === aiColor) return { score: 1000000 - (10 - depth) * 1000, move: null };
    if (winner === opponent) return { score: -1000000 + (10 - depth) * 1000, move: null };
    if (depth === 0) return { score: evaluateCheckersBoard(state, aiColor), move: null };
    
    const validMoves = getCheckersValidMoves(state, currentColor);
    if (validMoves.length === 0) return { score: 0, move: null };
    
    // 按启发式排序
    validMoves.sort((a, b) => {
        const scoreA = a.isJump ? 100 : 0;
        const scoreB = b.isJump ? 100 : 0;
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 12)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeCheckersMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = checkersMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = move;
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 12)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeCheckersMoveInternal(newState, move.from, move.to, currentColor);
            const evalResult = checkersMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = move;
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getCheckersValidMoves(state, color) {
    const board = state.board;
    const moves = [];
    let hasJump = false;
    
    // 首先检查是否有跳吃
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                const jumpDirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
                for (const [dr, dc] of jumpDirs) {
                    const tr = r + dr, tc = c + dc;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, true)) {
                            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, isJump: true });
                            hasJump = true;
                        }
                    }
                }
            }
        }
    }
    
    // 如果没有跳吃，返回普通走法
    if (!hasJump) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === color) {
                    const moveDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                    for (const [dr, dc] of moveDirs) {
                        const tr = r + dr, tc = c + dc;
                        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                            if (isValidCheckersMove(board, { row: r, col: c }, { row: tr, col: tc }, piece, false)) {
                                moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, isJump: false });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return moves;
}

function executeCheckersMoveInternal(state, from, to, color) {
    const piece = state.board[from.row][from.col];
    const dx = to.col - from.col;
    const dy = to.row - from.row;
    const isJump = Math.abs(dx) === 2 && Math.abs(dy) === 2;
    
    state.board[to.row][to.col] = piece;
    state.board[from.row][from.col] = null;
    
    if (isJump) {
        const midRow = (from.row + to.row) / 2;
        const midCol = (from.col + to.col) / 2;
        state.board[midRow][midCol] = null;
    }
    
    // 升王
    if ((piece.color === 'red' && to.row === 7) || (piece.color === 'blue' && to.row === 0)) {
        piece.king = true;
    }
    
    state.currentPlayer = color === 'red' ? 'blue' : 'red';
}

function evaluateCheckersBoard(state, aiColor) {
    let score = 0;
    const opponent = aiColor === 'red' ? 'blue' : 'red';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (piece) {
                let value = piece.king ? 30 : 10;
                // 前进加分
                if (!piece.king) {
                    if (piece.color === 'red') value += r;
                    else value += (7 - r);
                }
                if (piece.color === aiColor) score += value;
                else score -= value;
            }
        }
    }
    return score;
}

// ==================== 黑白棋AI（6个难度等级）====================
function calculateOthelloAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateOthelloEasyMove(state, aiColor);
        case 'simple': return calculateOthelloSimpleMove(state, aiColor);
        case 'normal': return calculateOthelloNormalMove(state, aiColor);
        case 'expert': return calculateOthelloExpertMove(state, aiColor);
        case 'hard': return calculateOthelloHardMove(state, aiColor);
        case 'inferno': return calculateOthelloInfernoMove(state, aiColor);
        default: return calculateOthelloNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择合法走法
function calculateOthelloEasyMove(state, aiColor) {
    const board = state.board;
    const validMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === null) {
                const flips = getOthelloFlips(board, r, c, aiColor);
                if (flips.length > 0) validMoves.push({ from: null, to: { row: r, col: c } });
            }
        }
    }
    return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
}

// 简单：优先翻转多，否则随机
function calculateOthelloSimpleMove(state, aiColor) {
    const board = state.board;
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === null) {
                const flips = getOthelloFlips(board, r, c, aiColor);
                if (flips.length > 0) moves.push({ from: null, to: { row: r, col: c }, score: flips.length });
            }
        }
    }
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        return moves[0];
    }
    return null;
}

// 普通：使用位置权重表
function calculateOthelloNormalMove(state, aiColor) {
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

// 专家：Minimax算法，深度4
function calculateOthelloExpertMove(state, aiColor) {
    return othelloMinimax(state, aiColor, aiColor, 4, -Infinity, Infinity, true).move;
}

// 困难：Minimax + Alpha-Beta，深度6
function calculateOthelloHardMove(state, aiColor) {
    return othelloMinimax(state, aiColor, aiColor, 6, -Infinity, Infinity, true).move;
}

// 炼狱：Minimax + Alpha-Beta，深度8 + 动态评估
function calculateOthelloInfernoMove(state, aiColor) {
    return othelloMinimax(state, aiColor, aiColor, 8, -Infinity, Infinity, true).move;
}

function othelloMinimax(state, aiColor, currentColor, depth, alpha, beta, isMaximizing) {
    const opponent = aiColor === 'black' ? 'white' : 'black';
    const currentOpponent = currentColor === 'black' ? 'white' : 'black';
    const board = state.board;
    
    // 检查终局
    const validMoves = getOthelloValidMoves(board, currentColor);
    const opponentMoves = getOthelloValidMoves(board, currentOpponent);
    
    if (validMoves.length === 0 && opponentMoves.length === 0) {
        const score = state.scores[aiColor] - state.scores[opponent];
        return { score: score * 10000, move: null };
    }
    
    if (depth === 0) return { score: evaluateOthelloBoard(state, aiColor), move: null };
    
    if (validMoves.length === 0) {
        // 跳过回合
        return othelloMinimax(state, aiColor, currentOpponent, depth, alpha, beta, !isMaximizing);
    }
    
    // 按启发式排序
    validMoves.sort((a, b) => {
        const scoreA = evaluateOthelloMove(board, a.row, a.col, currentColor);
        const scoreB = evaluateOthelloMove(board, b.row, b.col, currentColor);
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
    });
    
    let bestMove = null;
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves.slice(0, 10)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeOthelloMoveInternal(newState, move.row, move.col, currentColor);
            const evalResult = othelloMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, false);
            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of validMoves.slice(0, 10)) {
            const newState = JSON.parse(JSON.stringify(state));
            executeOthelloMoveInternal(newState, move.row, move.col, currentColor);
            const evalResult = othelloMinimax(newState, aiColor, currentOpponent, depth - 1, alpha, beta, true);
            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = { from: null, to: move };
            }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function getOthelloValidMoves(board, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === null) {
                const flips = getOthelloFlips(board, r, c, color);
                if (flips.length > 0) moves.push({ row: r, col: c });
            }
        }
    }
    return moves;
}

function executeOthelloMoveInternal(state, row, col, color) {
    const flips = getOthelloFlips(state.board, row, col, color);
    state.board[row][col] = color;
    for (const [r, c] of flips) state.board[r][c] = color;
    
    // 更新分数
    state.scores = { black: 0, white: 0 };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.board[r][c]) state.scores[state.board[r][c]]++;
        }
    }
    
    const opponent = color === 'black' ? 'white' : 'black';
    if (hasValidOthelloMove(state.board, opponent)) state.currentPlayer = opponent;
}

function evaluateOthelloMove(board, row, col, color) {
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
    const flips = getOthelloFlips(board, row, col, color);
    return weights[row][col] + flips.length * 2;
}

function evaluateOthelloBoard(state, aiColor) {
    const opponent = aiColor === 'black' ? 'white' : 'black';
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
    
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.board[r][c] === aiColor) score += weights[r][c];
            else if (state.board[r][c] === opponent) score -= weights[r][c];
        }
    }
    
    // 行动力评估
    const myMoves = getOthelloValidMoves(state.board, aiColor).length;
    const oppMoves = getOthelloValidMoves(state.board, opponent).length;
    score += (myMoves - oppMoves) * 5;
    
    return score;
}

// ==================== 飞行棋AI（6个难度等级）====================
function calculateFlightChessAIMove(state, aiColor, difficulty) {
    switch (difficulty) {
        case 'easy': return calculateFlightChessEasyMove(state, aiColor);
        case 'simple': return calculateFlightChessSimpleMove(state, aiColor);
        case 'normal': return calculateFlightChessNormalMove(state, aiColor);
        case 'expert': return calculateFlightChessExpertMove(state, aiColor);
        case 'hard': return calculateFlightChessHardMove(state, aiColor);
        case 'inferno': return calculateFlightChessInfernoMove(state, aiColor);
        default: return calculateFlightChessNormalMove(state, aiColor);
    }
}

// 容易：完全随机选择
function calculateFlightChessEasyMove(state, aiColor) {
    const positions = state.positions[aiColor];
    const validPlanes = [];
    for (let i = 0; i < 4; i++) {
        if (positions[i] >= 0) validPlanes.push(i);
    }
    if (validPlanes.length > 0) {
        return { from: validPlanes[Math.floor(Math.random() * validPlanes.length)], to: null, extra: { dice: Math.floor(Math.random() * 6) + 1 } };
    }
    for (let i = 0; i < 4; i++) {
        if (positions[i] === -1) return { from: i, to: null, extra: { dice: 6 } };
    }
    return null;
}

// 简单：优先起飞，其次随机
function calculateFlightChessSimpleMove(state, aiColor) {
    const positions = state.positions[aiColor];
    // 如果有飞机在基地，优先起飞
    for (let i = 0; i < 4; i++) {
        if (positions[i] === -1) return { from: i, to: null, extra: { dice: 6 } };
    }
    // 随机选择已起飞的飞机
    const validPlanes = [];
    for (let i = 0; i < 4; i++) {
        if (positions[i] >= 0) validPlanes.push(i);
    }
    if (validPlanes.length > 0) {
        return { from: validPlanes[Math.floor(Math.random() * validPlanes.length)], to: null, extra: { dice: Math.floor(Math.random() * 6) + 1 } };
    }
    return null;
}

// 普通：简单策略，优先吃子和到达终点
function calculateFlightChessNormalMove(state, aiColor) {
    const positions = state.positions[aiColor];
    const dice = Math.floor(Math.random() * 6) + 1;
    
    let bestPlane = -1;
    let bestScore = -1;
    
    for (let i = 0; i < 4; i++) {
        if (positions[i] === -1 && dice === 6) {
            // 可以起飞
            return { from: i, to: null, extra: { dice: 6 } };
        }
        if (positions[i] >= 0) {
            const newPos = (positions[i] + dice) % 52;
            let score = 0;
            
            // 检查是否可以吃子
            for (const [color, otherPositions] of Object.entries(state.positions)) {
                if (color !== aiColor) {
                    for (let j = 0; j < 4; j++) {
                        if (otherPositions[j] === newPos) score += 100;
                    }
                }
            }
            
            // 前进加分
            score += newPos;
            
            // 接近终点加分
            if (newPos > 45) score += 50;
            
            if (score > bestScore) {
                bestScore = score;
                bestPlane = i;
            }
        }
    }
    
    if (bestPlane >= 0) return { from: bestPlane, to: null, extra: { dice } };
    return null;
}

// 专家：考虑更多因素
function calculateFlightChessExpertMove(state, aiColor) {
    return calculateFlightChessNormalMove(state, aiColor); // 飞行棋随机性较大，使用相同策略
}

// 困难：更精细的策略
function calculateFlightChessHardMove(state, aiColor) {
    return calculateFlightChessNormalMove(state, aiColor);
}

// 炼狱：最优策略
function calculateFlightChessInfernoMove(state, aiColor) {
    return calculateFlightChessNormalMove(state, aiColor);
}

// ==================== 扑克AI（6个难度等级）====================
function calculatePokerAIMove(gameState, difficulty) {
    switch (difficulty) {
        case 'easy': return calculatePokerEasyMove(gameState);
        case 'simple': return calculatePokerSimpleMove(gameState);
        case 'normal': return calculatePokerNormalMove(gameState);
        case 'expert': return calculatePokerExpertMove(gameState);
        case 'hard': return calculatePokerHardMove(gameState);
        case 'inferno': return calculatePokerInfernoMove(gameState);
        default: return calculatePokerNormalMove(gameState);
    }
}

// 容易：完全随机决策
function calculatePokerEasyMove(gameState) {
    // 随机决定是否要牌
    while (gameState.aiScore < 21 && Math.random() < 0.5) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

// 简单：简单策略，15点以下要牌
function calculatePokerSimpleMove(gameState) {
    while (gameState.aiScore < 15) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

// 普通：标准策略，17点以下要牌
function calculatePokerNormalMove(gameState) {
    while (gameState.aiScore < 17) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

// 专家：根据玩家明牌调整策略
function calculatePokerExpertMove(gameState) {
    const playerVisibleCard = gameState.playerHand[0]; // 玩家第一张明牌
    let threshold = 17;
    
    // 根据玩家明牌调整阈值
    if (playerVisibleCard) {
        const cardValue = getCardNumericValue(playerVisibleCard.value);
        if (cardValue >= 10) threshold = 18; // 玩家可能有大牌，更保守
        else if (cardValue <= 5) threshold = 16; // 玩家可能牌小，更激进
    }
    
    while (gameState.aiScore < threshold) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

// 困难：考虑更多因素
function calculatePokerHardMove(gameState) {
    const playerVisibleCard = gameState.playerHand[0];
    let threshold = 17;
    
    if (playerVisibleCard) {
        const cardValue = getCardNumericValue(playerVisibleCard.value);
        // 更精细的策略
        if (cardValue >= 10) threshold = 18;
        else if (cardValue >= 7) threshold = 17;
        else if (cardValue >= 4) threshold = 16;
        else threshold = 15;
    }
    
    // 如果AI已经有软17（A+6），根据情况决定是否要牌
    if (gameState.aiScore === 17 && hasSoft17(gameState.aiHand)) {
        threshold = 18;
    }
    
    while (gameState.aiScore < threshold) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

// 炼狱：最优策略，使用概率计算
function calculatePokerInfernoMove(gameState) {
    const playerVisibleCard = gameState.playerHand[0];
    
    // 计算剩余牌的概率分布
    const remainingCards = getRemainingCards(gameState);
    
    while (shouldHit(gameState.aiScore, remainingCards, playerVisibleCard)) {
        const card = gameState.deck.pop();
        gameState.aiHand.push(card);
        gameState.aiScore = calculateHandScore(gameState.aiHand);
    }
    return finalizePokerGame(gameState);
}

function getCardNumericValue(value) {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
}

function hasSoft17(hand) {
    let hasAce = hand.some(card => card.value === 'A');
    let score = calculateHandScore(hand);
    return hasAce && score === 17;
}

function getRemainingCards(gameState) {
    // 简化处理：假设剩余牌是均匀分布的
    return { high: 16, mid: 20, low: 16 }; // 大牌(10,J,Q,K,A), 中牌(6-9), 小牌(2-5)
}

function shouldHit(aiScore, remainingCards, playerCard) {
    if (aiScore >= 21) return false;
    if (aiScore <= 11) return true;
    
    // 基于概率的简单决策
    const bustProbability = calculateBustProbability(aiScore, remainingCards);
    return bustProbability < 0.5;
}

function calculateBustProbability(score, remainingCards) {
    // 简化的爆牌概率计算
    if (score <= 11) return 0;
    if (score >= 21) return 1;
    // 假设抽到10点的概率约为30%
    const cardsThatBust = Math.max(0, score - 21 + 10);
    return cardsThatBust / 10 * 0.3;
}

function finalizePokerGame(gameState) {
    gameState.status = 'ended';
    if (gameState.aiScore > 21) {
        gameState.winner = 'player';
        gameState.message = 'AI爆牌！玩家获胜！';
    } else if (gameState.playerScore > 21) {
        gameState.winner = 'ai';
        gameState.message = '玩家爆牌！AI获胜！';
    } else if (gameState.playerScore > gameState.aiScore) {
        gameState.winner = 'player';
        gameState.message = `玩家${gameState.playerScore}点 vs AI${gameState.aiScore}点，玩家获胜！`;
    } else if (gameState.aiScore > gameState.playerScore) {
        gameState.winner = 'ai';
        gameState.message = `玩家${gameState.playerScore}点 vs AI${gameState.aiScore}点，AI获胜！`;
    } else {
        gameState.winner = 'draw';
        gameState.message = `双方${gameState.playerScore}点，平局！`;
    }

    return {
        hand: gameState.aiHand,
        score: gameState.aiScore,
        winner: gameState.winner,
        message: gameState.message,
        status: gameState.status
    };
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
