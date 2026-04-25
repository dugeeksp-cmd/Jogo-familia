/* script/jogo.js */
import { 
    onAuth, 
    listenToGameRoom, 
    updateGameRoom, 
    joinGameRoom,
    leaveGameRoom,
    listenToPlayers,
    listenToAllHands,
    updatePrivateHand,
    sendGuess,
    listenToGuesses,
    respondToGuess,
    listenToMeet
} from './firebase-service.js';
import { playSound } from './audio.js';
import { CARD_BANK } from './cards.js';
import { shuffleArray } from './utils.js';
import { setupChat } from './chat.js';

// Get Room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const GAME_ROOM_ID = urlParams.get('room');

if (!GAME_ROOM_ID) {
    alert("Sala não encontrada!");
    window.location.href = 'index.html';
}

let currentUser = null;
let roomState = null;
let allPlayers = [];

// DOM Elements - Header
const roomTitle = document.getElementById('roomTitle');
const userBadge = document.getElementById('userBadge');

// DOM Elements - Lobby
const lobbyArea = document.getElementById('lobbyArea');
const adminControlsLobby = document.getElementById('adminControlsLobby');
const diffSelect = document.getElementById('diffSelect');
const catSelect = document.getElementById('catSelect');
const playersInRoomList = document.getElementById('playersInRoomList');
const onlinePlayersList = document.getElementById('onlinePlayersList');
const joinButtonArea = document.getElementById('joinButtonArea');
const btnJoinRoom = document.getElementById('btnJoinRoom');
const btnExit = document.getElementById('btnExit');
const startButtonArea = document.getElementById('startButtonArea');
const btnStartGame = document.getElementById('btnStartGame');

// DOM Elements - Game
const gameArea = document.getElementById('gameArea');
const gameRound = document.getElementById('gameRound');
const timerValue = document.getElementById('timerValue');
const myCardContent = document.getElementById('myCardContent');
const myCardRevealOverlay = document.getElementById('myCardRevealOverlay');
const othersCards = document.getElementById('othersCards');
const guessInput = document.getElementById('guessInput');
const btnGuess = document.getElementById('btnGuess');
const activeGuesses = document.getElementById('activeGuesses');

// Chat UI
const chatTabs = document.querySelectorAll('.chat-tab');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');

// Admin Controls (Inside Game)
const adminControlsArea = document.getElementById('adminControlsArea');
const btnTimerToggle = document.getElementById('btnTimerToggle');
const btnTimerReset = document.getElementById('btnTimerReset');
const btnNextRound = document.getElementById('btnNextRound');
const btnEndGame = document.getElementById('btnEndGame');

// Meet
const meetNotification = document.getElementById('meetNotification');
const meetLinkBtn = document.getElementById('meetLinkBtn');

async function init() {
    onAuth(user => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = user;
        userBadge.textContent = user.displayName || user.email.split('@')[0];
        
        setupListeners();
    });
}

function setupListeners() {
    // 1. Listen to Room State
    listenToGameRoom(GAME_ROOM_ID, (room) => {
        roomState = room;
        updateUI();
    });

    // 2. Listen to All Players (to show online status/name)
    listenToPlayers((players) => {
        allPlayers = players;
        renderLobbyPlayers();
    });

    // 3. Listen to Private Hands (for others and me)
    listenToAllHands((hands) => {
        renderOthersCards(hands);
        renderMyCard(hands);
    });

    // 4. Listen to Guesses if playing
    listenToGuesses((guesses) => {
        renderGuesses(guesses);
    });

    // 5. Listen to Meet
    listenToMeet((meeting) => {
        if (meeting.enabled && meeting.link) {
            meetLinkBtn.href = meeting.link;
            meetNotification.classList.remove('hidden');
        } else {
            meetNotification.classList.add('hidden');
        }
    });

    // 6. Setup Chat
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || "Jogador";
    const lowerName = name.toLowerCase();
    const playerRole = (currentUser.email === 'papai@sabermidia.com.br' || ['miguel', 'sophia', 'papai'].includes(lowerName)) ? 'family' : 'guest';
    const senderColor = lowerName === 'miguel' ? '#3b82f6' : (lowerName === 'sophia' ? '#ec4899' : '#f59e0b');

    setupChat({
        playerId: currentUser.uid,
        playerName: name,
        playerRole: playerRole,
        senderColor: senderColor,
        initialChatId: 'group',
        tabs: chatTabs,
        messagesList: messagesList,
        input: chatInput,
        sendBtn: sendMsgBtn
    });
}

function updateUI() {
    if (!roomState) return;

    roomTitle.textContent = roomState.createdByName ? `Sala do ${roomState.createdByName}` : "Carregando...";

    const isCreator = roomState.createdBy === currentUser.uid;
    const isPapai = currentUser.email === 'papai@sabermidia.com.br';
    const isAdmin = isCreator || isPapai;

    // Toggle Lobby vs Game Area
    if (roomState.status === 'waiting') {
        lobbyArea.classList.remove('hidden');
        gameArea.classList.add('hidden');
        
        if (isAdmin) {
            adminControlsLobby.classList.remove('hidden');
            startButtonArea.classList.remove('hidden');
            diffSelect.value = roomState.difficulty || 'easy';
            catSelect.value = roomState.category || 'all';
        } else {
            adminControlsLobby.classList.add('hidden');
            startButtonArea.classList.add('hidden');
        }

        const isMember = roomState.joinedPlayers.includes(currentUser.uid);
        joinButtonArea.classList.toggle('hidden', isMember);

    } else if (roomState.status === 'playing') {
        lobbyArea.classList.add('hidden');
        gameArea.classList.remove('hidden');
        
        adminControlsArea.classList.toggle('hidden', !isAdmin);
        gameRound.textContent = roomState.roundNumber || 1;
        
        updateTimerUI();
    } else if (roomState.status === 'finished') {
        alert("O jogo terminou!");
        window.location.href = 'index.html';
    }
}

function renderLobbyPlayers() {
    if (!roomState) return;

    // 1. Render Registered Players in the Room
    playersInRoomList.innerHTML = roomState.joinedPlayers.map(uid => {
        const player = allPlayers.find(p => p.id === uid) || { name: uid, online: false };
        return `
            <div class="flex items-center justify-between bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full ${player.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}"></div>
                    <span class="font-bold text-sm text-gray-200">${player.name}</span>
                </div>
                ${uid === roomState.createdBy ? '<span class="text-[10px] bg-yellow-600/30 text-yellow-500 px-2 py-0.5 rounded border border-yellow-600/30 font-black uppercase">Criador</span>' : ''}
            </div>
        `;
    }).join('');

    // 2. Render Online Players to Invite
    const availableToInvite = allPlayers.filter(p => !roomState.joinedPlayers.includes(p.id) && p.online);
    onlinePlayersList.innerHTML = availableToInvite.length > 0 
        ? availableToInvite.map(p => `
            <div class="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg text-sm border border-gray-700/50">
                <span class="text-gray-300 font-medium">${p.name}</span>
                <button onclick="window.invite('${p.id}')" class="text-[10px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded font-bold uppercase transition-colors">Convidar</button>
            </div>
        `).join('')
        : '<p class="text-xs text-gray-600 italic">Ninguém online agora...</p>';
}

window.invite = async (playerId) => {
    playSound('click');
    await invitePlayerToGame(GAME_ROOM_ID, playerId);
    alert("Convite enviado!");
};

function renderOthersCards(hands) {
    if (!roomState || roomState.status !== 'playing') return;

    const others = hands.filter(h => h.playerId !== currentUser.uid && roomState.joinedPlayers.includes(h.playerId));
    
    othersCards.innerHTML = others.map(h => {
        const player = allPlayers.find(p => p.id === h.playerId) || { name: h.playerId };
        return `
            <div class="testa-card bg-gray-900 p-3 rounded-xl border border-gray-700 space-y-3 relative overflow-hidden group">
                <div class="flex justify-between items-start relative z-10">
                    <span class="font-black text-xs text-gray-400 truncate w-24 uppercase tracking-tighter">${player.name}</span>
                    <span class="difficulty-badge diff-${h.card?.difficulty || 'easy'}">${h.card?.difficulty || 'EASY'}</span>
                </div>
                <div class="aspect-[3/4] bg-gray-800 rounded-lg flex flex-col items-center justify-center p-3 text-center transition-all group-hover:bg-gray-750 relative z-10">
                    <p class="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1 opacity-60">${h.card?.category || '...'}</p>
                    <p class="text-sm font-bold leading-tight">${h.card?.text || 'Sorteando...'}</p>
                </div>
                <!-- Background decoration -->
                <div class="absolute -bottom-4 -right-4 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition-all"></div>
            </div>
        `;
    }).join('');
}

function renderMyCard(hands) {
    if (!roomState || roomState.status !== 'playing') return;
    const myHand = hands.find(h => h.playerId === currentUser.uid);
    
    if (myHand && myHand.card) {
        myCardContent.innerHTML = `
            <span class="difficulty-badge diff-${myHand.card.difficulty}">${myHand.card.difficulty}</span>
            <p class="text-3xl font-black text-white px-2">${myHand.card.text}</p>
            <p class="text-xs font-bold text-yellow-500 uppercase tracking-[0.2em] opacity-80">${myHand.card.category}</p>
        `;
    }
}

function updateTimerUI() {
    if (!roomState || !roomState.timer) return;
    
    if (roomState.timer.isRunning && roomState.timer.endsAtMs) {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((roomState.timer.endsAtMs - now) / 1000));
        timerValue.textContent = diff.toString().padStart(2, '0');
        timerValue.classList.toggle('low-time', diff <= 10);
    } else {
        timerValue.textContent = (roomState.timer.durationSeconds || 60).toString().padStart(2, '0');
        timerValue.classList.remove('low-time');
    }
}

function renderGuesses(guesses) {
    activeGuesses.innerHTML = guesses.map(g => `
        <div class="bg-gray-900/80 p-3 rounded-xl border border-gray-700 flex justify-between items-center animate-in fade-in slide-in-from-right-4">
            <div>
                <p class="text-[10px] font-black text-yellow-500 uppercase tracking-widest">${g.playerName}</p>
                <p class="font-bold">"${g.text}"</p>
            </div>
            ${(roomState.createdBy === currentUser.uid || currentUser.email === 'papai@sabermidia.com.br') ? `
                <div class="flex gap-2">
                    <button onclick="window.ansGuess('${g.id}', true)" class="bg-green-600 hover:bg-green-700 p-2 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <button onclick="window.ansGuess('${g.id}', false)" class="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

window.ansGuess = async (id, correct) => {
    playSound(correct ? 'correct' : 'wrong');
    await respondToGuess(id, correct);
};

// --- EVENTS ---

btnJoinRoom.addEventListener('click', async () => {
    playSound('click');
    await joinGameRoom(GAME_ROOM_ID, currentUser.uid);
});

btnExit.addEventListener('click', async () => {
    if (confirm("Deseja sair da sala? Isso o removerá do jogo.")) {
        await leaveGameRoom(GAME_ROOM_ID, currentUser.uid);
        window.location.href = 'index.html';
    }
});

btnStartGame.addEventListener('click', async () => {
    playSound('gameStart');
    
    // Sortear cartas
    const difficulty = diffSelect.value;
    const category = catSelect.value;
    
    const filteredCards = CARD_BANK.filter(c => {
        const dMatch = difficulty === 'all' || c.difficulty === difficulty;
        const cMatch = category === 'all' || c.category === category;
        return dMatch && cMatch;
    });

    const shuffled = shuffleArray(filteredCards);
    
    // Atribuir para cada jogador na sala
    for (let i = 0; i < roomState.joinedPlayers.length; i++) {
        const uid = roomState.joinedPlayers[i];
        await updatePrivateHand(uid, shuffled[i % shuffled.length]);
    }

    await updateGameRoom(GAME_ROOM_ID, {
        status: 'playing',
        gameStarted: true,
        roundNumber: 1,
        difficulty,
        category,
        'timer.isRunning': false
    });
});

btnGuess.addEventListener('click', async () => {
    const text = guessInput.value.trim();
    if (!text) return;
    
    playSound('pop');
    await sendGuess(currentUser.uid, currentUser.displayName || currentUser.email.split('@')[0], text);
    guessInput.value = '';
    alert("Palpite enviado!");
});

myCardRevealOverlay.addEventListener('click', () => {
    playSound('cardReveal');
    myCardContent.classList.remove('blur-xl', 'opacity-0');
    myCardContent.classList.add('opacity-100');
    myCardRevealOverlay.classList.add('opacity-0', 'pointer-events-none');
    
    setTimeout(() => {
        myCardContent.classList.add('blur-xl', 'opacity-0');
        myCardContent.classList.remove('opacity-100');
        myCardRevealOverlay.classList.remove('opacity-0', 'pointer-events-none');
    }, 3000);
});

// Admin Controls
btnTimerToggle.addEventListener('click', async () => {
    playSound('click');
    const isRunning = !roomState.timer?.isRunning;
    const duration = roomState.timer?.durationSeconds || 60;
    
    await updateGameRoom(GAME_ROOM_ID, {
        'timer.isRunning': isRunning,
        'timer.startedAtMs': isRunning ? Date.now() : null,
        'timer.endsAtMs': isRunning ? Date.now() + (duration * 1000) : null
    });
});

btnTimerReset.addEventListener('click', async () => {
    playSound('click');
    await updateGameRoom(GAME_ROOM_ID, {
        'timer.isRunning': false,
        'timer.startedAtMs': null,
        'timer.endsAtMs': null
    });
});

btnEndGame.addEventListener('click', async () => {
    if (confirm("Deseja mesmo finalizar o jogo para todos?")) {
        await updateGameRoom(GAME_ROOM_ID, { status: 'finished' });
    }
});

btnNextRound.addEventListener('click', async () => {
    playSound('click');
    const difficulty = roomState.difficulty || 'easy';
    const category = roomState.category || 'all';
    
    const filteredCards = CARD_BANK.filter(c => {
        const dMatch = difficulty === 'all' || c.difficulty === difficulty;
        const cMatch = category === 'all' || c.category === category;
        return dMatch && cMatch;
    });

    const shuffled = shuffleArray(filteredCards);
    
    for (let i = 0; i < roomState.joinedPlayers.length; i++) {
        const uid = roomState.joinedPlayers[i];
        await updatePrivateHand(uid, shuffled[i % shuffled.length]);
    }

    await updateGameRoom(GAME_ROOM_ID, {
        roundNumber: (roomState.roundNumber || 1) + 1,
        'timer.isRunning': false
    });
    alert("Próxima rodada iniciada!");
});

// Local timer refresh for smooth UI
setInterval(() => {
    if (roomState && roomState.timer?.isRunning) {
        updateTimerUI();
    }
}, 1000);

init();
