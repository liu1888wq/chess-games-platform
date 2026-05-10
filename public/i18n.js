// ============================================================
// i18n 国际化翻译系统 - 10种语言
// ============================================================

const LANGUAGES = {
    'zh-CN': { name: '中文简体', native: '简体中文', flag: '🇨🇳', fontClass: '' },
    'zh-TW': { name: '中文繁體', native: '繁體中文', flag: '🇹🇼', fontClass: '' },
    'zh-CL': { name: '文言文',   native: '古文雅言', flag: '📜', fontClass: '' },
    'zh-XZ': { name: '中文小篆', native: '篆書體',   flag: '🖊️', fontClass: 'font-xiaozhuan' },
    'vi':    { name: '越南语',   native: 'Tiếng Việt', flag: '🇻🇳', fontClass: 'font-vietnamese' },
    'en':    { name: 'English',  native: 'English',    flag: '🇬🇧', fontClass: '' },
    'fr':    { name: 'Français', native: 'Français',   flag: '🇫🇷', fontClass: '' },
    'it':    { name: 'Italiano', native: 'Italiano',   flag: '🇮🇹', fontClass: '' },
    'haw':   { name: '夏威夷语', native: 'ʻŌlelo Hawaiʻi', flag: '🌺', fontClass: '' },
    'th':    { name: '泰国语',   native: 'ไทย',       flag: '🇹🇭', fontClass: 'font-thai' }
};

// 翻译映射表 - 用于聊天翻译的语言代码映射
const TRANSLATE_LANG_MAP = {
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-CL': 'zh-CN',   // 文言文翻译为简体中文再转换
    'zh-XZ': 'zh-CN',   // 小篆翻译为简体中文再转换
    'vi':    'vi',
    'en':    'en',
    'fr':    'fr',
    'it':    'it',
    'haw':   'en',      // 夏威夷语无API支持，翻译为英文再转换
    'th':    'th'
};

// ============================================================
// UI文本翻译
// ============================================================
const translations = {
    // 标题
    'title': {
        'zh-CN': '🎮 棋类游戏平台',
        'zh-TW': '🎮 棋類遊戲平台',
        'zh-CL': '🎮 棋藝博弈之所',
        'zh-XZ': '🎮 棋藝博弈之所',
        'vi':    '🎮 Nền tảng Cờ',
        'en':    '🎮 Board Game Platform',
        'fr':    '🎮 Plateforme de Jeux',
        'it':    '🎮 Piattaforma Giochi',
        'haw':   '🎮 Pāʻani Papa',
        'th':    '🎮 แพลตฟอร์มเกมกระดาน'
    },
    'subtitle': {
        'zh-CN': '五子棋 · 围棋 · 中国象棋 · 国际象棋 · 跳棋 · 黑白棋 · 飞行棋',
        'zh-TW': '五子棋 · 圍棋 · 中國象棋 · 國際象棋 · 跳棋 · 黑白棋 · 飛行棋',
        'zh-CL': '五子 · 弈 · 象棋 · 西洋棋 · 跳棋 · 黑白棋 · 飛棋',
        'zh-XZ': '五子 · 弈 · 象棋 · 西洋棋 · 跳棋 · 黑白棋 · 飛棋',
        'vi':    'Gomoku · Cờ Vây · Cờ Tướng · Cờ Vua · Cờ Nhảy · Othello · Cờ Bay',
        'en':    'Gomoku · Go · Chinese Chess · Chess · Checkers · Othello · Ludo',
        'fr':    'Gomoku · Go · Échecs Chinois · Échecs · Dames · Othello · Ludo',
        'it':    'Gomoku · Go · Scacchi Cinesi · Scacchi · Dama · Othello · Ludo',
        'haw':   'Gomoku · Go · Kūkulu · Haika · Pāʻani Kū · Othello · Ludo',
        'th':    'โกมoku · โกะ · หมากรุกจีน · หมากรุกสากล · เช็กเกอร์ · โอเทลโล่ · ลูโด้'
    },

    // 语言选择
    'lang_title': {
        'zh-CN': '🌐 选择语言',
        'zh-TW': '🌐 選擇語言',
        'zh-CL': '🌐 擇言',
        'zh-XZ': '🌐 擇言',
        'vi':    '🌐 Chọn Ngôn Ngữ',
        'en':    '🌐 Select Language',
        'fr':    '🌐 Choisir la Langue',
        'it':    '🌐 Seleziona Lingua',
        'haw':   '🌐 E ʻōlelo',
        'th':    '🌐 เลือกภาษา'
    },
    'lang_subtitle': {
        'zh-CN': '选择你偏好的语言',
        'zh-TW': '選擇你偏好的語言',
        'zh-CL': '擇汝所欲之言',
        'zh-XZ': '擇汝所欲之言',
        'vi':    'Chọn ngôn ngữ bạn muốn sử dụng',
        'en':    'Choose your preferred language',
        'fr':    'Choisissez votre langue préférée',
        'it':    'Scegli la lingua preferita',
        'haw':   'E ʻōlelo i kou makemake',
        'th':    'เลือกภาษาที่คุณต้องการ'
    },
    'lang_confirm': {
        'zh-CN': '确认选择',
        'zh-TW': '確認選擇',
        'zh-CL': '定',
        'zh-XZ': '定',
        'vi':    'Xác Nhận',
        'en':    'Confirm',
        'fr':    'Confirmer',
        'it':    'Conferma',
        'haw':   'Hōʻoia',
        'th':    'ยืนยัน'
    },

    // 登录
    'login_welcome': {
        'zh-CN': '欢迎来到棋类游戏平台',
        'zh-TW': '歡迎來到棋類遊戲平台',
        'zh-CL': '迎至棋藝博弈之所',
        'zh-XZ': '迎至棋藝博弈之所',
        'vi':    'Chào Mừng Đến Nền Tảng Cờ',
        'en':    'Welcome to Board Game Platform',
        'fr':    'Bienvenue sur la Plateforme de Jeux',
        'it':    'Benvenuto alla Piattaforma Giochi',
        'haw':   'Aloha e komo i ka Pāʻani Papa',
        'th':    'ยินดีต้อนรับสู่แพลตฟอร์มเกมกระดาน'
    },
    'login_nickname': {
        'zh-CN': '你的昵称',
        'zh-TW': '你的暱稱',
        'zh-CL': '汝之名',
        'zh-XZ': '汝之名',
        'vi':    'Biệt Danh Của Bạn',
        'en':    'Your Nickname',
        'fr':    'Votre Pseudonyme',
        'it':    'Il Tuo Soprannome',
        'haw':   'Kau Inoa',
        'th':    'ชื่อเล่นของคุณ'
    },
    'login_nickname_hint': {
        'zh-CN': '请输入昵称',
        'zh-TW': '請輸入暱稱',
        'zh-CL': '書汝名',
        'zh-XZ': '書汝名',
        'vi':    'Nhập biệt danh',
        'en':    'Enter nickname',
        'fr':    'Entrez un pseudonyme',
        'it':    'Inserisci soprannome',
        'haw':   'E hoʻokomo i ka inoa',
        'th':    'ใส่ชื่อเล่น'
    },
    'login_enter': {
        'zh-CN': '进入游戏大厅',
        'zh-TW': '進入遊戲大廳',
        'zh-CL': '入博弈之堂',
        'zh-XZ': '入博弈之堂',
        'vi':    'Vào Sảnh Chơi',
        'en':    'Enter Lobby',
        'fr':    'Entrer au Lobby',
        'it':    'Entra nella Lobby',
        'haw':   'E komo i ka Lobi',
        'th':    'เข้าสู่ห้องรอ'
    },
    'login_or': {
        'zh-CN': '或者',
        'zh-TW': '或者',
        'zh-CL': '抑或',
        'zh-XZ': '抑或',
        'vi':    'Hoặc',
        'en':    'Or',
        'fr':    'Ou',
        'it':    'Oppure',
        'haw':   'A i ʻole',
        'th':    'หรือ'
    },
    'login_room_code': {
        'zh-CN': '输入房间码加入游戏',
        'zh-TW': '輸入房間碼加入遊戲',
        'zh-CL': '書房號以入局',
        'zh-XZ': '書房號以入局',
        'vi':    'Nhập Mã Phòng Để Tham Gia',
        'en':    'Enter Room Code to Join',
        'fr':    'Entrez le Code pour Rejoindre',
        'it':    'Inserisci Codice per Entrare',
        'haw':   'E hoʻokomo i ka kāhili',
        'th':    'ใส่รหัสห้องเพื่อเข้าร่วม'
    },
    'login_room_code_hint': {
        'zh-CN': '6位房间码',
        'zh-TW': '6位房間碼',
        'zh-CL': '房號六位',
        'zh-XZ': '房號六位',
        'vi':    'Mã phòng 6 số',
        'en':    '6-digit room code',
        'fr':    'Code à 6 chiffres',
        'it':    'Codice a 6 cifre',
        'haw':   'Kāhili ʻāpana 6',
        'th':    'รหัสห้อง 6 หลัก'
    },
    'login_join_room': {
        'zh-CN': '加入房间',
        'zh-TW': '加入房間',
        'zh-CL': '入局',
        'zh-XZ': '入局',
        'vi':    'Tham Gia Phòng',
        'en':    'Join Room',
        'fr':    'Rejoindre',
        'it':    'Entra nella Stanza',
        'haw':   'E komo i ka lumi',
        'th':    'เข้าร่วมห้อง'
    },

    // 大厅
    'lobby_welcome': {
        'zh-CN': '欢迎',
        'zh-TW': '歡迎',
        'zh-CL': '迎',
        'zh-XZ': '迎',
        'vi':    'Xin Chào',
        'en':    'Welcome',
        'fr':    'Bienvenue',
        'it':    'Benvenuto',
        'haw':   'Aloha',
        'th':    'ยินดีต้อนรับ'
    },
    'lobby_join_room': {
        'zh-CN': '加入房间',
        'zh-TW': '加入房間',
        'zh-CL': '入局',
        'zh-XZ': '入局',
        'vi':    'Tham Gia',
        'en':    'Join Room',
        'fr':    'Rejoindre',
        'it':    'Entra',
        'haw':   'E komo',
        'th':    'เข้าร่วม'
    },
    'lobby_select_game': {
        'zh-CN': '选择游戏',
        'zh-TW': '選擇遊戲',
        'zh-CL': '擇棋',
        'zh-XZ': '擇棋',
        'vi':    'Chọn Trò Chơi',
        'en':    'Select Game',
        'fr':    'Choisir un Jeu',
        'it':    'Scegli Gioco',
        'haw':   'E ʻōlelo i ka pāʻani',
        'th':    'เลือกเกม'
    },
    'lobby_select_hint': {
        'zh-CN': '点击创建房间，邀请朋友一起玩',
        'zh-TW': '點擊創建房間，邀請朋友一起玩',
        'zh-CL': '擇棋創局，邀友對弈',
        'zh-XZ': '擇棋創局，邀友對弈',
        'vi':    'Nhấn để tạo phòng và mời bạn bè',
        'en':    'Click to create a room and invite friends',
        'fr':    'Cliquez pour créer et inviter des amis',
        'it':    'Clicca per creare una stanza',
        'haw':   'E kaomi e hana i ka lumi',
        'th':    'คลิกเพื่อสร้างห้องและเชิญเพื่อน'
    },

    // 游戏名称
    'game_gomoku': {
        'zh-CN': '五子棋', 'zh-TW': '五子棋', 'zh-CL': '五子', 'zh-XZ': '五子',
        'vi': 'Gomoku', 'en': 'Gomoku', 'fr': 'Gomoku', 'it': 'Gomoku',
        'haw': 'Gomoku', 'th': 'โกมoku'
    },
    'game_gomoku_desc': {
        'zh-CN': '经典五子连珠，先连成五子获胜',
        'zh-TW': '經典五子連珠，先連成五子獲勝',
        'zh-CL': '五子連珠，先成五者勝',
        'zh-XZ': '五子連珠，先成五者勝',
        'vi': 'Năm quân liên tiếp, ai nối năm trước thắng',
        'en': 'Connect five stones in a row to win',
        'fr': 'Alignez cinq pierres pour gagner',
        'it': 'Collega cinque pietre per vincere',
        'haw': 'E hoʻohui i nā kō i lima',
        'th': 'เชื่อมห้าเม็ดเพื่อชนะ'
    },
    'game_go': {
        'zh-CN': '围棋', 'zh-TW': '圍棋', 'zh-CL': '弈', 'zh-XZ': '弈',
        'vi': 'Cờ Vây', 'en': 'Go', 'fr': 'Go', 'it': 'Go',
        'haw': 'Go', 'th': 'โกะ'
    },
    'game_go_desc': {
        'zh-CN': '黑白对弈，围地多者胜',
        'zh-TW': '黑白對弈，圍地多者勝',
        'zh-CL': '黑白對弈，圍地廣者勝',
        'zh-XZ': '黑白對弈，圍地廣者勝',
        'vi': 'Đen trắng đối弈, ai chiếm nhiều đất hơn thắng',
        'en': 'Black and white, capture more territory to win',
        'fr': 'Noir et blanc, plus de territoire gagne',
        'it': 'Nero e bianco, più territorio vince',
        'haw': 'ʻEleʻele a keʻokeʻo, e lanakila',
        'th': 'ดำขาวต่อสู้ ครอบครองพื้นที่มากกว่าชนะ'
    },
    'game_chinese_chess': {
        'zh-CN': '中国象棋', 'zh-TW': '中國象棋', 'zh-CL': '象棋', 'zh-XZ': '象棋',
        'vi': 'Cờ Tướng', 'en': 'Chinese Chess', 'fr': 'Échecs Chinois', 'it': 'Scacchi Cinesi',
        'haw': 'Kūkulu', 'th': 'หมากรุกจีน'
    },
    'game_chinese_chess_desc': {
        'zh-CN': '楚河汉界，将死对方为胜',
        'zh-TW': '楚河漢界，將死對方為勝',
        'zh-CL': '楚河漢界，擒將者勝',
        'zh-XZ': '楚河漢界，擒將者勝',
        'vi': 'Sông Tướng, bắt tướng đối phương để thắng',
        'en': 'Checkmate the opponent\'s general to win',
        'fr': 'Échec et mat pour gagner',
        'it': 'Scacco matto per vincere',
        'haw': 'E lawe i ka luna aliʻi',
        'th': 'รุกข้าศึกจนชนะ'
    },
    'game_chess': {
        'zh-CN': '国际象棋', 'zh-TW': '國際象棋', 'zh-CL': '西洋棋', 'zh-XZ': '西洋棋',
        'vi': 'Cờ Vua', 'en': 'Chess', 'fr': 'Échecs', 'it': 'Scacchi',
        'haw': 'Haika', 'th': 'หมากรุกสากล'
    },
    'game_chess_desc': {
        'zh-CN': '经典国际象棋，将死对方国王',
        'zh-TW': '經典國際象棋，將死對方國王',
        'zh-CL': '西洋之棋，擒王者勝',
        'zh-XZ': '西洋之棋，擒王者勝',
        'vi': 'Cờ Vua cổ điển, chiếu tướng để thắng',
        'en': 'Classic chess, checkmate the king',
        'fr': 'Échecs classiques, échec et mat',
        'it': 'Scacchi classici, scacco matto',
        'haw': 'Haika kahiko, e lawe i ke kumu',
        'th': 'หมากรุกสากลคลาสสิก รุกจนชนะ'
    },
    'game_checkers': {
        'zh-CN': '跳棋', 'zh-TW': '跳棋', 'zh-CL': '跳棋', 'zh-XZ': '跳棋',
        'vi': 'Cờ Nhảy', 'en': 'Checkers', 'fr': 'Dames', 'it': 'Dama',
        'haw': 'Pāʻani Kū', 'th': 'เช็กเกอร์'
    },
    'game_checkers_desc': {
        'zh-CN': '跳吃对方棋子，消灭对手获胜',
        'zh-TW': '跳吃對方棋子，消滅對手獲勝',
        'zh-CL': '躍食敵子，盡滅者勝',
        'zh-XZ': '躍食敵子，盡滅者勝',
        'vi': 'Nhảy ăn quân đối phương, tiêu diệt hết để thắng',
        'en': 'Jump and capture, eliminate all opponents',
        'fr': 'Sauter et capturer, éliminer les adversaires',
        'it': 'Salta e cattura, elimina gli avversari',
        'haw': 'E lūlū a lawe, e hoʻōpū i nā hoaaloha',
        'th': 'กระโดดกินหมาก กินหมดชนะ'
    },
    'game_othello': {
        'zh-CN': '黑白棋', 'zh-TW': '黑白棋', 'zh-CL': '黑白棋', 'zh-XZ': '黑白棋',
        'vi': 'Othello', 'en': 'Othello', 'fr': 'Othello', 'it': 'Othello',
        'haw': 'Othello', 'th': 'โอเทลโล่'
    },
    'game_othello_desc': {
        'zh-CN': '翻转对手棋子，棋子多者胜',
        'zh-TW': '翻轉對手棋子，棋子多者勝',
        'zh-CL': '翻敵之子，多者勝',
        'zh-XZ': '翻敵之子，多者勝',
        'vi': 'Lật quân đối phương, ai nhiều hơn thắng',
        'en': 'Flip opponent pieces, most pieces wins',
        'fr': 'Retournez les pièces, le plus gagne',
        'it': 'Gira le pedine, chi ne ha più vince',
        'haw': 'E huli i nā kō, nui loa ka lanakila',
        'th': 'พลิกหมากของคู่แข่ง มีหมากมากกว่าชนะ'
    },
    'game_flight_chess': {
        'zh-CN': '飞行棋', 'zh-TW': '飛行棋', 'zh-CL': '飛棋', 'zh-XZ': '飛棋',
        'vi': 'Cờ Bay', 'en': 'Ludo', 'fr': 'Ludo', 'it': 'Ludo',
        'haw': 'Ludo', 'th': 'ลูโด้'
    },
    'game_flight_chess_desc': {
        'zh-CN': '掷骰子前进，先到终点获胜',
        'zh-TW': '擲骰子前進，先到終點獲勝',
        'zh-CL': '擲骰而行，先至者勝',
        'zh-XZ': '擲骰而行，先至者勝',
        'vi': 'Gieo xúc xắc, ai đến đích trước thắng',
        'en': 'Roll dice and race to the finish',
        'fr': 'Lancez les dés et course à l\'arrivée',
        'it': 'Tira i dadi e corri al traguardo',
        'haw': 'E pepehi i nā pōhaku a holo',
        'th': 'ทอยลูกเต๋าและวิ่งถึงเส้นชัย'
    },

    // 房间
    'room_code': {
        'zh-CN': '房间码', 'zh-TW': '房間碼', 'zh-CL': '房號', 'zh-XZ': '房號',
        'vi': 'Mã Phòng', 'en': 'Room Code', 'fr': 'Code', 'it': 'Codice',
        'haw': 'Kāhili Lumi', 'th': 'รหัสห้อง'
    },
    'room_ready': {
        'zh-CN': '准备', 'zh-TW': '準備', 'zh-CL': '備', 'zh-XZ': '備',
        'vi': 'Sẵn Sàng', 'en': 'Ready', 'fr': 'Prêt', 'it': 'Pronto',
        'haw': 'Mākaukau', 'th': 'พร้อม'
    },
    'room_not_ready': {
        'zh-CN': '未准备', 'zh-TW': '未準備', 'zh-CL': '未備', 'zh-XZ': '未備',
        'vi': 'Chưa Sẵn Sàng', 'en': 'Not Ready', 'fr': 'Pas Prêt', 'it': 'Non Pronto',
        'haw': 'ʻAʻohe Mākaukau', 'th': 'ยังไม่พร้อม'
    },
    'room_leave': {
        'zh-CN': '离开房间', 'zh-TW': '離開房間', 'zh-CL': '離局', 'zh-XZ': '離局',
        'vi': 'Rời Phòng', 'en': 'Leave Room', 'fr': 'Quitter', 'it': 'Esci',
        'haw': 'Haʻalele', 'th': 'ออกจากห้อง'
    },
    'room_cancel_ready': {
        'zh-CN': '取消准备', 'zh-TW': '取消準備', 'zh-CL': '罷備', 'zh-XZ': '罷備',
        'vi': 'Hủy Sẵn Sàng', 'en': 'Cancel', 'fr': 'Annuler', 'it': 'Annulla',
        'haw': 'Hoʻopau', 'th': 'ยกเลิก'
    },
    'room_waiting': {
        'zh-CN': '等待玩家加入...', 'zh-TW': '等待玩家加入...', 'zh-CL': '待客入局...',
        'zh-XZ': '待客入局...', 'vi': 'Đang chờ người chơi...', 'en': 'Waiting for players...',
        'fr': 'En attente de joueurs...', 'it': 'In attesa di giocatori...',
        'haw': 'E noho i nā mea pāʻani...', 'th': 'กำลังรอผู้เล่น...'
    },
    'room_your_turn': {
        'zh-CN': '轮到你了！', 'zh-TW': '輪到你了！', 'zh-CL': '汝之回合！',
        'zh-XZ': '汝之回合！', 'vi': 'Đến lượt bạn!', 'en': 'Your Turn!',
        'fr': 'Votre Tour !', 'it': 'Il Tuo Turno!', 'haw': 'Kau Hana!',
        'th': 'ตาคุณ!'
    },
    'room_waiting_turn': {
        'zh-CN': '等待{color}...', 'zh-TW': '等待{color}...', 'zh-CL': '待{color}...',
        'zh-XZ': '待{color}...', 'vi': 'Đang chờ {color}...', 'en': 'Waiting for {color}...',
        'fr': 'En attente de {color}...', 'it': 'In attesa di {color}...',
        'haw': 'E noho no {color}...', 'th': 'กำลังรอ {color}...'
    },

    // AI
    'ai_title': {
        'zh-CN': 'AI对战设置', 'zh-TW': 'AI對戰設定', 'zh-CL': '機關對弈',
        'zh-XZ': '機關對弈', 'vi': 'Cài Đặt AI', 'en': 'AI Settings',
        'fr': 'Paramètres IA', 'it': 'Impostazioni IA', 'haw': 'Hoʻonohonoho AI',
        'th': 'ตั้งค่า AI'
    },
    'ai_start': {
        'zh-CN': '开始AI对战', 'zh-TW': '開始AI對戰', 'zh-CL': '始機關對弈',
        'zh-XZ': '始機關對弈', 'vi': 'Bắt Đầu Chơi AI', 'en': 'Start AI Game',
        'fr': 'Démarrer IA', 'it': 'Inizia IA', 'haw': 'E hoʻomaka i AI',
        'th': 'เริ่มเล่นกับ AI'
    },

    // 聊天
    'chat_placeholder': {
        'zh-CN': '输入消息...', 'zh-TW': '輸入訊息...', 'zh-CL': '書信...',
        'zh-XZ': '書信...', 'vi': 'Nhập tin nhắn...', 'en': 'Type a message...',
        'fr': 'Tapez un message...', 'it': 'Scrivi un messaggio...',
        'haw': 'E hoʻokomo i ka leka...', 'th': 'พิมพ์ข้อความ...'
    },
    'chat_send': {
        'zh-CN': '发送', 'zh-TW': '發送', 'zh-CL': '發', 'zh-XZ': '發',
        'vi': 'Gửi', 'en': 'Send', 'fr': 'Envoyer', 'it': 'Invia',
        'haw': 'E hoʻouna', 'th': 'ส่ง'
    },
    'chat_long_press_hint': {
        'zh-CN': '长按消息可翻译',
        'zh-TW': '長按訊息可翻譯',
        'zh-CL': '長按可譯',
        'zh-XZ': '長按可譯',
        'vi': 'Nhấn giữ để dịch',
        'en': 'Long press to translate',
        'fr': 'Appui long pour traduire',
        'it': 'Premi a lungo per tradurre',
        'haw': 'E kaomi lōʻihi e hoʻōlelo',
        'th': 'กดค้างเพื่อแปล'
    },
    'chat_translate_btn': {
        'zh-CN': '🔄 翻译',
        'zh-TW': '🔄 翻譯',
        'zh-CL': '🔄 譯',
        'zh-XZ': '🔄 譯',
        'vi': '🔄 Dịch',
        'en': '🔄 Translate',
        'fr': '🔄 Traduire',
        'it': '🔄 Traduci',
        'haw': '🔄 Hoʻōlelo',
        'th': '🔄 แปล'
    },

    // 翻译
    'translate_title': {
        'zh-CN': '🔄 翻译消息', 'zh-TW': '🔄 翻譯訊息', 'zh-CL': '🔄 譯文',
        'zh-XZ': '🔄 譯文', 'vi': '🔄 Dịch Tin Nhắn', 'en': '🔄 Translate Message',
        'fr': '🔄 Traduire le Message', 'it': '🔄 Traduci Messaggio',
        'haw': '🔄 Hoʻōlelo Leka', 'th': '🔄 แปลข้อความ'
    },
    'translate_loading': {
        'zh-CN': '翻译中...', 'zh-TW': '翻譯中...', 'zh-CL': '譯中...',
        'zh-XZ': '譯中...', 'vi': 'Đang dịch...', 'en': 'Translating...',
        'fr': 'Traduction...', 'it': 'Traduzione...', 'haw': 'E hoʻōlelo...',
        'th': 'กำลังแปล...'
    },
    'translate_close': {
        'zh-CN': '关闭', 'zh-TW': '關閉', 'zh-CL': '閉', 'zh-XZ': '閉',
        'vi': 'Đóng', 'en': 'Close', 'fr': 'Fermer', 'it': 'Chiudi',
        'haw': 'Pani', 'th': 'ปิด'
    },
    'translate_original_label': {
        'zh-CN': '原文', 'zh-TW': '原文', 'zh-CL': '原文', 'zh-XZ': '原文',
        'vi': 'Gốc', 'en': 'Original', 'fr': 'Original', 'it': 'Originale',
        'haw': 'Kumu', 'th': 'ต้นฉบับ'
    },
    'translate_result_label': {
        'zh-CN': '翻译结果', 'zh-TW': '翻譯結果', 'zh-CL': '譯文', 'zh-XZ': '譯文',
        'vi': 'Kết Quả Dịch', 'en': 'Translation', 'fr': 'Traduction',
        'it': 'Traduzione', 'haw': 'Hoʻōlelo', 'th': 'ผลแปล'
    },

    // 胜利
    'win_congrats': {
        'zh-CN': '🎉 恭喜你获胜！', 'zh-TW': '🎉 恭喜你獲勝！', 'zh-CL': '🎉 汝勝矣！',
        'zh-XZ': '🎉 汝勝矣！', 'vi': '🎉 Chúc Mừng Bạn Thắng!', 'en': '🎉 You Won!',
        'fr': '🎉 Vous Avez Gagné!', 'it': '🎉 Hai Vinto!',
        'haw': '🎉 ʻO ʻoe ka lanakila!', 'th': '🎉 คุณชนะแล้ว!'
    },
    'win_draw': {
        'zh-CN': '🤝 平局！', 'zh-TW': '🤝 平局！', 'zh-CL': '🤝 和棋！',
        'zh-XZ': '🤝 和棋！', 'vi': '🤝 Hòa!', 'en': '🤝 Draw!',
        'fr': '🤝 Match Nul!', 'it': '🤝 Pareggio!',
        'haw': '🤝 Like!', 'th': '🤝 เสมอ!'
    },
    'win_opponent': {
        'zh-CN': '😢 {color}获胜', 'zh-TW': '😢 {color}獲勝', 'zh-CL': '😢 {color}勝矣',
        'zh-XZ': '😢 {color}勝矣', 'vi': '😢 {color} Thắng', 'en': '😢 {color} Wins',
        'fr': '😢 {color} Gagne', 'it': '😢 {color} Vince',
        'haw': '😢 Ua lanakila ʻo {color}', 'th': '😢 {color} ชนะ'
    },
    'win_restart': {
        'zh-CN': '再来一局', 'zh-TW': '再來一局', 'zh-CL': '再弈',
        'zh-XZ': '再弈', 'vi': 'Chơi Lại', 'en': 'Play Again',
        'fr': 'Rejouer', 'it': 'Gioca Ancora', 'haw': 'E pāʻani hou',
        'th': 'เล่นอีกครั้ง'
    },
    'win_back': {
        'zh-CN': '返回大厅', 'zh-TW': '返回大廳', 'zh-CL': '歸堂',
        'zh-XZ': '歸堂', 'vi': 'Về Sảnh', 'en': 'Back to Lobby',
        'fr': 'Retour au Lobby', 'it': 'Torna alla Lobby',
        'haw': 'Hoi i ka Lobi', 'th': 'กลับห้องรอ'
    },

    // 模态框
    'modal_join_title': {
        'zh-CN': '加入房间', 'zh-TW': '加入房間', 'zh-CL': '入局',
        'zh-XZ': '入局', 'vi': 'Tham Gia Phòng', 'en': 'Join Room',
        'fr': 'Rejoindre', 'it': 'Entra', 'haw': 'E komo i ka lumi',
        'th': 'เข้าร่วมห้อง'
    },
    'modal_join_confirm': {
        'zh-CN': '加入', 'zh-TW': '加入', 'zh-CL': '入', 'zh-XZ': '入',
        'vi': 'Tham Gia', 'en': 'Join', 'fr': 'Rejoindre', 'it': 'Entra',
        'haw': 'E komo', 'th': 'เข้าร่วม'
    },
    'modal_cancel': {
        'zh-CN': '取消', 'zh-TW': '取消', 'zh-CL': '罷', 'zh-XZ': '罷',
        'vi': 'Hủy', 'en': 'Cancel', 'fr': 'Annuler', 'it': 'Annulla',
        'haw': 'Hoʻopau', 'th': 'ยกเลิก'
    },

    // 围棋
    'go_pass': {
        'zh-CN': '跳过 (Pass)', 'zh-TW': '跳過 (Pass)', 'zh-CL': '虛手',
        'zh-XZ': '虛手', 'vi': 'Bỏ Lượt', 'en': 'Pass', 'fr': 'Passer',
        'it': 'Passa', 'haw': 'E hele', 'th': 'Pass'
    },

    // 颜色名
    'color_black': {
        'zh-CN': '黑方', 'zh-TW': '黑方', 'zh-CL': '黑', 'zh-XZ': '黑',
        'vi': 'Đen', 'en': 'Black', 'fr': 'Noir', 'it': 'Nero',
        'haw': 'ʻEleʻele', 'th': 'ดำ'
    },
    'color_white': {
        'zh-CN': '白方', 'zh-TW': '白方', 'zh-CL': '白', 'zh-XZ': '白',
        'vi': 'Trắng', 'en': 'White', 'fr': 'Blanc', 'it': 'Bianco',
        'haw': 'Keʻokeʻo', 'th': 'ขาว'
    },
    'color_red': {
        'zh-CN': '红方', 'zh-TW': '紅方', 'zh-CL': '紅', 'zh-XZ': '紅',
        'vi': 'Đỏ', 'en': 'Red', 'fr': 'Rouge', 'it': 'Rosso',
        'haw': 'Ula', 'th': 'แดง'
    },
    'color_blue': {
        'zh-CN': '蓝方', 'zh-TW': '藍方', 'zh-CL': '藍', 'zh-XZ': '藍',
        'vi': 'Xanh', 'en': 'Blue', 'fr': 'Bleu', 'it': 'Blu',
        'haw': 'Ululi', 'th': 'น้ำเงิน'
    },
    'color_green': {
        'zh-CN': '绿方', 'zh-TW': '綠方', 'zh-CL': '綠', 'zh-XZ': '綠',
        'vi': 'Xanh Lá', 'en': 'Green', 'fr': 'Vert', 'it': 'Verde',
        'haw': 'ʻŌmaʻomaʻo', 'th': 'เขียว'
    },
    'color_yellow': {
        'zh-CN': '黄方', 'zh-TW': '黃方', 'zh-CL': '黃', 'zh-XZ': '黃',
        'vi': 'Vàng', 'en': 'Yellow', 'fr': 'Jaune', 'it': 'Giallo',
        'haw': 'Melemele', 'th': 'เหลือง'
    }
};

// ============================================================
// 文言文转换器（简易版）
// ============================================================
const ClassicalChineseConverter = {
    // 常用词替换表
    replacements: [
        [/你好/g, '有礼'],
        [/你好吗/g, '安否'],
        [/谢谢/g, '多谢'],
        [/谢谢/g, '承蒙'],
        [/不客气/g, '何足挂齿'],
        [/对不起/g, '恕罪'],
        [/没关系/g, '无妨'],
        [/再见/g, '后会有期'],
        [/好的/g, '善'],
        [/是的/g, '然'],
        [/不是/g, '非也'],
        [/我/g, '吾'],
        [/你/g, '汝'],
        [/他/g, '彼'],
        [/她/g, '伊'],
        [/我们/g, '吾等'],
        [/你们/g, '汝等'],
        [/他们/g, '彼等'],
        [/这个/g, '此'],
        [/那个/g, '彼'],
        [/什么/g, '何'],
        [/为什么/g, '何故'],
        [/怎么/g, '如何'],
        [/哪里/g, '何处'],
        [/什么时候/g, '何时'],
        [/可以/g, '可'],
        [/不可以/g, '不可'],
        [/很好/g, '甚善'],
        [/不好/g, '不善'],
        [/厉害/g, '勇猛'],
        [/赢了/g, '胜矣'],
        [/输了/g, '败矣'],
        [/等一下/g, '稍候'],
        [/快/g, '速'],
        [/慢/g, '缓'],
        [/大/g, '巨'],
        [/小/g, '微'],
        [/多/g, '众'],
        [/少/g, '寡'],
        [/好/g, '善'],
        [/坏/g, '恶'],
        [/来/g, '至'],
        [/去/g, '往'],
        [/看/g, '观'],
        [/听/g, '闻'],
        [/说/g, '曰'],
        [/想/g, '思'],
        [/知道/g, '知'],
        [/不知道/g, '不知'],
        [/吃/g, '食'],
        [/喝/g, '饮'],
        [/走/g, '行'],
        [/跑/g, '奔'],
        [/打/g, '击'],
        [/玩/g, '戏'],
        [/高兴/g, '悦'],
        [/生气/g, '怒'],
        [/害怕/g, '惧'],
        [/喜欢/g, '喜'],
        [/讨厌/g, '恶'],
        [/今天/g, '今日'],
        [/明天/g, '明日'],
        [/昨天/g, '昨日'],
        [/现在/g, '今'],
        [/以后/g, '后'],
        [/以前/g, '昔'],
        [/朋友/g, '友'],
        [/棋/g, '棋'],
        [/下棋/g, '对弈'],
        [/游戏/g, '博弈'],
        [/开始/g, '始'],
        [/结束/g, '终'],
        [/房间/g, '室'],
        [/加入/g, '入'],
        [/退出/g, '退'],
        [/准备/g, '备'],
        [/等待/g, '候'],
        [/发送/g, '传'],
        [/消息/g, '信'],
        [/翻译/g, '译'],
        [/语言/g, '言'],
        [/选择/g, '择'],
        [/确认/g, '定'],
        [/取消/g, '罢'],
        [/返回/g, '归'],
        [/重新开始/g, '再弈'],
        [/恭喜/g, '贺'],
        [/加油/g, '勉之'],
        [/厉害啊/g, '妙哉'],
        [/太好了/g, '善哉'],
        [/不错/g, '尚可'],
        [/一般/g, '平平'],
        [/哈哈/g, '呵呵'],
        [/嗯/g, '然'],
        [/哦/g, '噢'],
        [/啊/g, '哉'],
        [/呢/g, '乎'],
        [/吧/g, '矣'],
        [/吗/g, '乎'],
        [/的/g, '之'],
        [/了/g, '矣'],
        [/在/g, '于'],
        [/和/g, '与'],
        [/也/g, '亦'],
        [/都/g, '皆'],
        [/就/g, '便'],
        [/还/g, '亦'],
        [/又/g, '复'],
        [/已经/g, '已'],
        [/正在/g, '方'],
        [/将要/g, '将'],
        [/非常/g, '甚'],
        [/很/g, '甚'],
        [/最/g, '至'],
        [/但是/g, '然'],
        [/因为/g, '因'],
        [/所以/g, '故'],
        [/如果/g, '若'],
        [/虽然/g, '虽'],
        [/但是/g, '然则'],
        [/不过/g, '然'],
        [/或者/g, '抑或'],
        [/还是/g, '抑'],
        [/只有/g, '唯'],
        [/一起/g, '共'],
        [/自己/g, '己'],
        [/别人/g, '他人'],
        [/大家/g, '众人'],
    ],

    convert(text) {
        let result = text;
        for (const [pattern, replacement] of this.replacements) {
            result = result.replace(pattern, replacement);
        }
        return result;
    }
};

// ============================================================
// 夏威夷语转换器（简易版 - 常用短语）
// ============================================================
const HawaiianConverter = {
    phrases: {
        '你好': 'Aloha',
        '谢谢': 'Mahalo',
        '再见': 'A hui hou',
        '好的': 'ʻAE',
        '是的': 'ʻAE',
        '不是': 'ʻAʻole',
        '恭喜': 'Hoʻomaikaʻi',
        '加油': 'Imua!',
        '厉害': 'Maikaʻi loa',
        '赢了': 'Ua lanakila',
        '输了': 'Ua make',
        '等一下': 'E noho',
        '开始': 'E hoʻomaka',
        '结束': 'Pau',
        '朋友': 'Hoaaloha',
        '下棋': 'Pāʻani papa',
        '游戏': 'Pāʻani',
        '哈哈': 'Haha',
        '嗯': 'Mm',
        '太好了': 'Maikaʻi loa',
        '不错': 'Maikaʻi',
        '欢迎': 'Aloha e komo',
        '准备': 'Mākaukau',
        '我': 'Au',
        '你': 'ʻOe',
        '他': 'ʻO ia',
        '我们': 'Kākou',
        '什么': 'Ahui',
        '为什么': 'No kea aha',
        '怎么': 'Pehea',
        '好的好的': 'Maikaʻi, maikaʻi',
    },

    convert(text) {
        let result = text;
        // 先尝试完整匹配
        for (const [zh, haw] of Object.entries(this.phrases)) {
            result = result.replace(new RegExp(zh, 'g'), haw);
        }
        return result;
    }
};

// ============================================================
// 小篆转换器（使用Unicode小篆字符映射）
// ============================================================
const XiaoZhuanConverter = {
    // 简易小篆风格 - 使用特殊Unicode字符或CSS字体模拟
    // 真正的小篆需要字体文件支持，这里用CSS字体类实现视觉风格
    convert(text) {
        // 小篆文本保持不变，通过CSS字体类 font-xiaozhuan 显示
        return text;
    }
};

// ============================================================
// 当前语言状态
// ============================================================
let currentLang = localStorage.getItem('selectedLang') || 'zh-CN';
let tempLang = currentLang;

// ============================================================
// 语言选择功能
// ============================================================
function selectLanguage(langCode) {
    tempLang = langCode;
    
    // 更新选中状态
    document.querySelectorAll('.lang-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.lang === langCode) {
            card.classList.add('selected');
        }
    });
}

function confirmLanguage() {
    if (!tempLang) return;
    
    currentLang = tempLang;
    localStorage.setItem('selectedLang', currentLang);
    
    // 应用语言
    applyLanguage(currentLang);
    
    // 显示登录界面
    document.getElementById('lang-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    
    // 显示语言切换按钮
    document.getElementById('lang-switch-bar').style.display = 'block';
}

function showLangScreen() {
    document.getElementById('lang-screen').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('room-screen').style.display = 'none';
    
    // 恢复选中状态
    selectLanguage(currentLang);
}

// ============================================================
// 应用语言到界面
// ============================================================
function applyLanguage(lang) {
    const langInfo = LANGUAGES[lang];
    
    // 更新语言标签
    document.getElementById('current-lang-label').textContent = langInfo.name;
    
    // 更新body字体类
    document.body.classList.remove('font-xiaozhuan', 'font-thai', 'font-vietnamese');
    if (langInfo.fontClass) {
        document.body.classList.add(langInfo.fontClass);
    }
    
    // 更新所有 data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = translations[key]?.[lang];
        if (text) {
            el.textContent = text;
        }
    });
    
    // 更新所有 data-i18n-placeholder 元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const text = translations[key]?.[lang];
        if (text) {
            el.placeholder = text;
        }
    });
    
    // 更新游戏卡片
    updateGameCards(lang);
    
    // 更新聊天提示
    updateChatHint(lang);
}

function updateGameCards(lang) {
    const gameCards = document.querySelectorAll('.game-card');
    const gameKeys = [
        { game: 'gomoku', icon: '⚫' },
        { game: 'go', icon: '⬛' },
        { game: 'chineseChess', icon: '將' },
        { game: 'chess', icon: '♔' },
        { game: 'checkers', icon: '🔴' },
        { game: 'othello', icon: '⚪' },
        { game: 'flightChess', icon: '✈️' }
    ];
    
    gameCards.forEach((card, index) => {
        if (gameKeys[index]) {
            const key = gameKeys[index];
            const nameKey = `game_${key.game}`;
            const descKey = `game_${key.game}_desc`;
            
            const h3 = card.querySelector('h3');
            const p = card.querySelector('p');
            
            if (h3 && translations[nameKey]?.[lang]) {
                h3.textContent = translations[nameKey][lang];
            }
            if (p && translations[descKey]?.[lang]) {
                p.textContent = translations[descKey][lang];
            }
        }
    });
}

function updateChatHint(lang) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        const text = translations['chat_placeholder']?.[lang];
        if (text) chatInput.placeholder = text;
    }
}

// ============================================================
// 获取翻译文本
// ============================================================
function t(key, replacements = {}) {
    let text = translations[key]?.[currentLang] || translations[key]?.['zh-CN'] || key;
    
    // 替换占位符
    for (const [key, value] of Object.entries(replacements)) {
        text = text.replace(`{${key}}`, value);
    }
    
    return text;
}

// ============================================================
// 聊天消息翻译功能
// ============================================================

// 长按检测
let longPressTimer = null;
let longPressTarget = null;

function initLongPress() {
    const chatBox = document.getElementById('chat-box');
    
    chatBox.addEventListener('touchstart', (e) => {
        const msgEl = e.target.closest('.chat-message');
        if (!msgEl) return;
        
        longPressTarget = msgEl;
        longPressTimer = setTimeout(() => {
            showTranslateOption(msgEl);
        }, 600);
    });
    
    chatBox.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });
    
    chatBox.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });
    
    // 桌面端右键
    chatBox.addEventListener('contextmenu', (e) => {
        const msgEl = e.target.closest('.chat-message');
        if (!msgEl) return;
        
        e.preventDefault();
        showTranslateOption(msgEl);
    });
}

function showTranslateOption(msgEl) {
    // 如果已有翻译按钮，不重复添加
    if (msgEl.querySelector('.translate-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'translate-btn';
    btn.textContent = t('chat_translate_btn');
    btn.onclick = (e) => {
        e.stopPropagation();
        translateMessage(msgEl);
    };
    
    msgEl.appendChild(btn);
    
    // 添加长按提示
    if (!msgEl.querySelector('.long-press-hint')) {
        const hint = document.createElement('div');
        hint.className = 'long-press-hint';
        hint.textContent = t('chat_long_press_hint');
        msgEl.appendChild(hint);
    }
}

async function translateMessage(msgEl) {
    // 获取原始消息文本
    const nameEl = msgEl.querySelector('.name');
    const fullText = msgEl.textContent;
    
    // 提取消息内容（去掉名字和按钮文字）
    let messageText = fullText;
    if (nameEl) {
        messageText = fullText.substring(nameEl.textContent.length + 2); // +2 for ": "
    }
    // 去掉翻译按钮文字
    messageText = messageText.replace(/🔄 [^\s]+/g, '').replace(/长按[^\s]+/g, '').trim();
    
    if (!messageText) return;
    
    // 显示翻译模态框
    const modal = document.getElementById('translate-modal');
    const original = document.getElementById('translate-original');
    const result = document.getElementById('translate-result');
    
    original.textContent = messageText;
    result.innerHTML = `<div class="translate-loading">${t('translate_loading')}</div>`;
    modal.classList.add('active');
    
    try {
        const translated = await performTranslation(messageText, currentLang);
        
        // 如果目标语言是文言文，再做一次文言文转换
        let finalText = translated;
        if (currentLang === 'zh-CL') {
            finalText = ClassicalChineseConverter.convert(translated);
        } else if (currentLang === 'zh-XZ') {
            finalText = translated; // 小篆通过CSS字体显示
        } else if (currentLang === 'haw') {
            finalText = HawaiianConverter.convert(translated);
        }
        
        result.innerHTML = `<div style="margin-bottom: 5px; color: #888; font-size: 0.8em;">${t('translate_result_label')} (${LANGUAGES[currentLang].name})</div>${finalText}`;
    } catch (error) {
        result.innerHTML = `<div style="color: #e74c3c;">${error.message || 'Translation failed'}</div>`;
    }
}

async function performTranslation(text, targetLang) {
    const targetCode = TRANSLATE_LANG_MAP[targetLang];
    
    // 如果原文语言和目标语言相同，直接返回
    // 先简单检测原文语言
    const detectedLang = detectLanguage(text);
    
    if (detectedLang === targetCode) {
        return text;
    }
    
    // 对于特殊语言的处理
    if (targetLang === 'zh-CL') {
        // 文言文：先翻译为中文，再转文言文
        if (detectedLang !== 'zh-CN' && detectedLang !== 'zh-TW') {
            const chinese = await callTranslateAPI(text, 'zh-CN');
            return ClassicalChineseConverter.convert(chinese);
        }
        return ClassicalChineseConverter.convert(text);
    }
    
    if (targetLang === 'haw') {
        // 夏威夷语：先翻译为英文，再转夏威夷语
        const english = await callTranslateAPI(text, 'en');
        return HawaiianConverter.convert(english);
    }
    
    if (targetLang === 'zh-XZ') {
        // 小篆：翻译为中文，通过CSS显示
        if (detectedLang !== 'zh-CN' && detectedLang !== 'zh-TW') {
            return await callTranslateAPI(text, 'zh-CN');
        }
        return text;
    }
    
    // 常规翻译
    return await callTranslateAPI(text, targetCode);
}

// 简易语言检测
function detectLanguage(text) {
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';      // 泰语
    if (/[\u00C0-\u024F]/.test(text) && /[àâéèêëîïôùûüç]/.test(text)) {
        if (/[àâéèêëîïôùûüçœæ]/.test(text)) return 'fr';  // 法语
        return 'it';  // 意大利语
    }
    if (/[\u1E00-\u1EFF]/.test(text)) return 'vi';        // 越南语
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';     // 中文
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'; // 日文
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';        // 韩文
    if (/^[a-zA-Z\s\d.,!?'"()]+$/.test(text)) return 'en'; // 英文
    return 'unknown';
}

// 调用翻译API（使用免费的 MyMemory API）
async function callTranslateAPI(text, targetLang) {
    const langPair = `|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            let translated = data.responseData.translatedText;
            
            // MyMemory 有时返回大写，做简单处理
            if (translated === translated.toUpperCase() && translated.length > 20) {
                translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
            }
            
            return translated;
        }
        
        throw new Error('Translation service unavailable');
    } catch (error) {
        // 如果API失败，使用本地简易翻译
        return localTranslate(text, targetLang);
    }
}

// 本地简易翻译（备用方案）
function localTranslate(text, targetLang) {
    switch (targetLang) {
        case 'en':
            return `[English] ${text}`;
        case 'fr':
            return `[Français] ${text}`;
        case 'it':
            return `[Italiano] ${text}`;
        case 'vi':
            return `[Tiếng Việt] ${text}`;
        case 'th':
            return `[ไทย] ${text}`;
        case 'zh-CN':
            return `[中文] ${text}`;
        case 'zh-TW':
            return `[繁體] ${text}`;
        default:
            return `[${targetLang}] ${text}`;
    }
}

function closeTranslateModal() {
    document.getElementById('translate-modal').classList.remove('active');
}

// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已选择语言
    const savedLang = localStorage.getItem('selectedLang');
    
    if (savedLang) {
        currentLang = savedLang;
        tempLang = savedLang;
        applyLanguage(currentLang);
        
        // 直接显示登录界面
        document.getElementById('lang-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('lang-switch-bar').style.display = 'block';
    } else {
        // 显示语言选择界面
        document.getElementById('lang-screen').style.display = 'flex';
        document.getElementById('login-screen').style.display = 'none';
    }
    
    // 初始化长按翻译
    setTimeout(initLongPress, 1000);
});
