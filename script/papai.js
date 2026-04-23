/* script/papai.js */
import { 
    initRoom, 
    listenToRoom, 
    updateRoom, 
    updatePrivateHand,
    listenToPlayers,
    addScore,
    listenToScoreHistory
} from './firebase-service.js';
import { CARD_BANK } from './cards.js';
import { shuffleArray } from './utils.js';
import { playSound } from './audio.js';
import { setupChat } from './chat.js';

const PLAYER_ID = 'papai';
const PLAYER_NAME = 'Papai';

let roomState = null;

// DOM Elements
const btnStartGame = document.getElementById('btn-start-game');
const btnNextTurn = document.getElementById('btn-next-turn');
const btnStartTimer = document.getElementById('btn-start-timer');
const btnResetRound = document.getElementById('btn-reset-round');
const playersList = document.getElementById('players-list');
const filterDifficulty = document.getElementById('filter-difficulty');
const filterCategory = document.getElementById('filter-category');
const btnGenerateCards = document.getElementById('btn-generate-cards');
const meetLinkInput = document.getElementById('meet-link-input');
const btnSaveMeet = document.getElementById('btn-save-meet');
const btnToggleMeet = document.getElementById('btn-toggle-meet');
const chatTabs = document.getElementById('papai-chat-tabs').querySelectorAll('.chat-tab');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');
const scorePlayerSelect = document.getElementById('score-player-select');
const scorePointsInput = document.getElementById('score-points-input');
const btnAddScore = document.getElementById('btn-add-score');
const scoreHistoryList = document.getElementById('score-history-list');
const maxPlayersInput = document.getElementById('max-players-input');
const btnSaveLimit = document.getElementById('btn-save-limit');
const btnHidePublicChat = document.getElementById('btn-hide-public-chat');

async function init() {
    await initRoom();

    listenToRoom((room) => {
        roomState = room;
        updateUI();
    });

    listenToPlayers((players) => {
        renderPlayersStatus(players);
        updateScoreSelect(players);
    });

    listenToScoreHistory((history) => {
        renderScoreHistory(history);
    });

    // Initialize Chat
    chatTabs.forEach(tab => {
        const tabData = tab.dataset.chat;
        if (tabData === 'private-miguel') tab.dataset.chatMapping = 'papai-miguel';
        else if (tabData === 'private-sophia') tab.dataset.chatMapping = 'papai-sophia';
        else if (tabData === 'public') tab.dataset.chatMapping = 'public';
        else tab.dataset.chatMapping = 'group';
    });

    setupChat({
        playerId: PLAYER_ID,
        playerName: PLAYER_NAME,
        initialChatId: 'group',
        tabs: chatTabs,
        messagesList: messagesList,
        input: chatInput,
        sendBtn: sendMsgBtn
    });

    // Invite Button
    const header = document.querySelector('.player-header');
    if (header) {
        const inviteBtn = document.createElement('button');
        inviteBtn.className = 'status-badge';
        inviteBtn.textContent = '🔗 Convidar';
        inviteBtn.style.cursor = 'pointer';
        inviteBtn.addEventListener('click', () => {
            const url = window.location.origin;
            navigator.clipboard.writeText(url).then(() => alert('Link de convite copiado!'));
        });
        header.insertBefore(inviteBtn, header.querySelector('a'));
    }
}

function updateUI() {
    if (!roomState) return;

    btnToggleMeet.textContent = roomState.meeting?.enabled ? 'Desativar' : 'Ativar';
    btnToggleMeet.classList.toggle('btn-deactivate', roomState.meeting?.enabled);
    btnToggleMeet.classList.toggle('btn-activate', !roomState.meeting?.enabled);
    
    if (roomState.meeting?.link && !meetLinkInput.value) {
        meetLinkInput.value = roomState.meeting.link;
    }

    if (roomState.maxPlayers && !maxPlayersInput.dataset.manual) {
        maxPlayersInput.value = roomState.maxPlayers;
    }

    btnHidePublicChat.textContent = roomState.publicChatHiddenForGuests ? 'Mostrar Chat Público p/ Convidados' : 'Esconder Chat Público p/ Convidados';
    btnHidePublicChat.classList.toggle('btn-activate', roomState.publicChatHiddenForGuests);
    btnHidePublicChat.classList.toggle('btn-deactivate', !roomState.publicChatHiddenForGuests);
}

function updateScoreSelect(players) {
    const currentVal = scorePlayerSelect.value;
    scorePlayerSelect.innerHTML = players
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');
    if (players.some(p => p.id === currentVal)) scorePlayerSelect.value = currentVal;
}

function renderPlayersStatus(players) {
    playersList.innerHTML = players.map(p => {
        const isOnline = (Date.now() - p.joinedAtMs) < 60000; // Simples check de online de 1 min
        return `
            <div class="player-bubble ${isOnline ? 'player-online' : ''}">
                ${p.name}: ${isOnline ? 'Online' : 'Offline'} 
                <span style="opacity: 0.6; margin-left: 8px;">(${p.score || 0} pts)</span>
            </div>
        `;
    }).join('');
}

function renderScoreHistory(history) {
    if (history.length === 0) {
        scoreHistoryList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px;">Nenhum ponto registrado ainda.</p>';
        return;
    }

    scoreHistoryList.innerHTML = history.map(item => `
        <div style="background: rgba(255,255,255,0.03); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 700; color: ${item.playerId === 'miguel' ? '#10b981' : '#8b5cf6'}">${item.playerName}</span>
                <span style="font-size: 0.6rem; opacity: 0.4;">Rodada ${item.round}</span>
            </div>
            <div style="font-weight: 800; color: #f59e0b;">+${item.points}</div>
        </div>
    `).join('');
}

// Score Events
btnAddScore.addEventListener('click', async () => {
    const playerId = scorePlayerSelect.value;
    const playerName = scorePlayerSelect.options[scorePlayerSelect.selectedIndex].text;
    const points = parseInt(scorePointsInput.value);
    const round = roomState?.roundNumber || 1;

    if (isNaN(points)) return;

    await addScore(playerId, playerName, round, points);
    playSound('message'); // Usar som de mensagem como feedback
});

// Game Controls
btnStartGame.addEventListener('click', async () => {
    await updateRoom({ gameStarted: true, status: 'playing', currentTurnPlayerId: 'miguel' });
});

btnNextTurn.addEventListener('click', async () => {
    const playersArr = ['miguel', 'sophia', 'papai'];
    const currentIndex = playersArr.indexOf(roomState.currentTurnPlayerId || 'papai');
    const nextIndex = (currentIndex + 1) % playersArr.length;
    await updateRoom({ currentTurnPlayerId: playersArr[nextIndex], 'timer.isRunning': false });
});

btnStartTimer.addEventListener('click', async () => {
    const now = Date.now();
    const duration = roomState.timer?.durationSeconds || 60;
    await updateRoom({
        'timer.isRunning': true,
        'timer.startedAtMs': now,
        'timer.endsAtMs': now + (duration * 1000)
    });
});

btnResetRound.addEventListener('click', async () => {
    await updateRoom({ 
        roundNumber: (roomState.roundNumber || 0) + 1,
        'timer.isRunning': false 
    });
});

// Meeting Controls
btnSaveMeet.addEventListener('click', async () => {
    const link = meetLinkInput.value.trim();
    await updateRoom({ 'meeting.link': link, 'meeting.updatedAt': Date.now() });
    alert('Link salvo!');
});

btnToggleMeet.addEventListener('click', async () => {
    const newState = !roomState.meeting?.enabled;
    await updateRoom({ 'meeting.enabled': newState });
});

btnSaveLimit.addEventListener('click', async () => {
    const limit = parseInt(maxPlayersInput.value);
    if (isNaN(limit)) return;
    await updateRoom({ maxPlayers: limit });
    alert('Limite de jogadores atualizado!');
});

maxPlayersInput.addEventListener('input', () => {
    maxPlayersInput.dataset.manual = 'true';
});

btnHidePublicChat.addEventListener('click', async () => {
    const current = !!roomState.publicChatHiddenForGuests;
    await updateRoom({ publicChatHiddenForGuests: !current });
});

// Card Generation
btnGenerateCards.addEventListener('click', async () => {
    const difficultyArr = filterDifficulty.value;
    const categoryArr = filterCategory.value;
    
    let filtered = CARD_BANK;
    if (difficultyArr !== 'all') filtered = filtered.filter(c => c.difficulty === difficultyArr);
    if (categoryArr !== 'all') filtered = filtered.filter(c => c.category === categoryArr);
    
    const shuffled = shuffleArray(filtered);
    
    if (shuffled.length < 3) {
        alert('Poucas cartas nos filtros selecionados!');
        return;
    }

    await updatePrivateHand('miguel', shuffled[0]);
    await updatePrivateHand('sophia', shuffled[1]);
    await updatePrivateHand('papai', shuffled[2]);
    
    alert('Novas cartas geradas para todos!');
});

init();
