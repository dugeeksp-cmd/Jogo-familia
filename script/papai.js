/* script/papai.js */
import { 
    initRoom, 
    listenToRoom, 
    updateRoom, 
    updatePrivateHand,
    listenToPlayers,
    addScore,
    listenToScoreHistory,
    listenToAllHands,
    listenToPrivateHand,
    listenToGuesses,
    respondToGuess,
    updatePlayer
} from './firebase-service.js';
import { CARD_BANK } from './cards.js';
import { shuffleArray } from './utils.js';
import { playSound } from './audio.js';
import { setupChat } from './chat.js';

const PLAYER_ID = 'papai';
const PLAYER_NAME = 'Papai';

let roomState = null;
let currentHands = [];
let lastGuesses = [];

// DOM Elements
const btnStartGame = document.getElementById('btn-start-game');
const btnNextTurn = document.getElementById('btn-next-turn');
const btnStartTimer = document.getElementById('btn-start-timer');
const btnResetRound = document.getElementById('btn-reset-round');
const btnEndGame = document.getElementById('btn-end-game');
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
const emojiMiguel = document.getElementById('emoji-miguel');
const emojiSophia = document.getElementById('emoji-sophia');
const btnSaveEmojis = document.getElementById('btn-save-emojis');
const papaiTimer = document.getElementById('papai-timer');
const allCardsDisplay = document.getElementById('all-cards-display');
const pendingGuessesList = document.getElementById('pending-guesses-list');
const toggleCardBtn = document.getElementById('toggle-card');
const gameCard = document.getElementById('game-card');
const cardCat = document.getElementById('card-cat');
const cardText = document.getElementById('card-text');
const cardDiff = document.getElementById('card-diff');
const papaiTurnStatus = document.getElementById('papai-turn-status');

// Dream Modal Elements
const btnOpenDream = document.getElementById('btn-open-dream');
const dreamModal = document.getElementById('dream-modal');
const dreamInput = document.getElementById('dream-input');
const btnCancelDream = document.getElementById('btn-cancel-dream');
const btnSaveDream = document.getElementById('btn-save-dream');

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

    listenToAllHands((hands) => {
        currentHands = hands; // Armazenar para comparar palpites
        renderAllCards(hands);
        renderGuesses(lastGuesses);
    });

    listenToGuesses((guesses) => {
        lastGuesses = guesses;
        renderGuesses(guesses);
    });

    listenToPrivateHand(PLAYER_ID, (hand) => {
        if (hand && hand.card) {
            const cat = hand.card.category.toLowerCase();
            cardCat.textContent = cat.toUpperCase();
            cardText.textContent = hand.card.text;
            cardDiff.textContent = hand.card.difficulty.toUpperCase();
            gameCard.className = `game-card card-blur card-cat-${cat}`;
        }
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
            const url = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/index.html?room=${roomState?.code || "PRINCIPAL"}`;
            navigator.clipboard.writeText(url).then(() => alert('Link de convite com código da sala copiado!'));
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

    if (roomState.status === 'finished') {
        window.location.href = 'win.html';
        return;
    }

    // Update Timer for Papai
    if (roomState.timer?.isRunning && roomState.timer?.endsAtMs) {
        const remaining = Math.max(0, Math.ceil((roomState.timer.endsAtMs - Date.now()) / 1000));
        papaiTimer.textContent = remaining + 's';
        papaiTimer.style.background = remaining <= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)';
        papaiTimer.style.color = remaining <= 10 ? '#ef4444' : '#f97316';
    } else {
        papaiTimer.textContent = (roomState.timer?.durationSeconds || 60) + 's';
        papaiTimer.style.background = 'rgba(249, 115, 22, 0.2)';
        papaiTimer.style.color = '#f97316';
    }

    // Turn status for Papai
    const adminGameSection = document.querySelector('.admin-section[style*="border: 2px"]');
    if (roomState.currentTurnPlayerId === PLAYER_ID) {
        papaiTurnStatus.innerHTML = '<span class="turn-active" style="font-size: 1.1rem; font-weight: 800;">Sua vez de jogar!</span>';
        if (adminGameSection) adminGameSection.classList.add('glow-turn');
    } else {
        const turnName = roomState.currentTurnPlayerId ? roomState.currentTurnPlayerId.charAt(0).toUpperCase() + roomState.currentTurnPlayerId.slice(1) : 'Aguardando';
        papaiTurnStatus.innerHTML = `<span style="opacity: 0.6;">Vez de: ${turnName}</span>`;
        if (adminGameSection) adminGameSection.classList.remove('glow-turn');
    }
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
        const emoji = p.emoji ? `<span style="margin-right: 4px;">${p.emoji}</span>` : '';
        return `
            <div class="player-bubble ${isOnline ? 'player-online' : ''}">
                ${emoji}${p.name}: ${isOnline ? 'Online' : 'Offline'} 
                <span style="opacity: 0.6; margin-left: 8px;">(${p.score || 0} pts)</span>
            </div>
        `;
    }).join('');

    // Pre-fill emoji inputs if they exist
    const miguel = players.find(p => p.id === 'miguel');
    const sophia = players.find(p => p.id === 'sophia');
    if (miguel && miguel.emoji && !emojiMiguel.value) emojiMiguel.value = miguel.emoji;
    if (sophia && sophia.emoji && !emojiSophia.value) emojiSophia.value = sophia.emoji;
}

function renderAllCards(hands) {
    if (!allCardsDisplay) return;
    allCardsDisplay.innerHTML = hands.map(h => `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; border-radius: 12px; font-size: 0.75rem;">
            <div style="font-weight: 800; color: #4ade80; margin-bottom: 2px;">${h.playerId === 'papai' ? 'VOCÊ' : h.playerId.toUpperCase()}</div>
            <div style="color: white; font-weight: 600;">${h.card?.text || 'Sem carta'}</div>
        </div>
    `).join('');
}

function renderGuesses(guesses) {
    if (!pendingGuessesList) return;
    if (guesses.length === 0) {
        pendingGuessesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 10px;">Nenhum palpite aguardando...</p>';
        return;
    }

    pendingGuessesList.innerHTML = guesses.map(g => {
        const playerHand = currentHands.find(h => h.playerId === g.playerId);
        const actualCard = playerHand?.card?.text || '???';
        
        return `
            <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px; background: rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; color: #f59e0b;">${g.playerName}</span>
                    <span style="font-size: 0.7rem; opacity: 0.5;">${new Date(g.createdAt?.toDate?.() || Date.now()).toLocaleTimeString()}</span>
                </div>
                <div style="font-size: 0.9rem;">Palpite: <strong style="color: white;">"${g.text}"</strong></div>
                <div style="font-size: 0.8rem; opacity: 0.7;">Carta Real: <span style="color: #4ade80;">${actualCard}</span></div>
                <div style="display: flex; gap: 8px; margin-top: 5px;">
                    <button class="btn btn-correct" data-id="${g.id}" data-player="${g.playerId}" data-name="${g.playerName}" style="flex: 1; padding: 8px; font-size: 0.8rem; background: #16a34a;">✅ Correto</button>
                    <button class="btn btn-wrong" data-id="${g.id}" style="flex: 1; padding: 8px; font-size: 0.8rem; background: #dc2626;">❌ Errado</button>
                </div>
            </div>
        `;
    }).join('');

    // Event Listeners for Buttons
    pendingGuessesList.querySelectorAll('.btn-correct').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { id, player, name } = btn.dataset;
            await respondToGuess(id, true);
            await addScore(player, name, roomState?.roundNumber || 1, 10);
            playSound('message');
            alert(`Ponto para ${name}!`);
        });
    });

    pendingGuessesList.querySelectorAll('.btn-wrong').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { id } = btn.dataset;
            await respondToGuess(id, false);
            playSound('timerEnd');
        });
    });
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

// Play as Papai Controls
toggleCardBtn.addEventListener('click', () => {
    gameCard.classList.toggle('card-blur');
    if (!gameCard.classList.contains('card-blur')) {
        playSound('cardReveal');
        toggleCardBtn.textContent = 'Esconder Minha Carta';
    } else {
        toggleCardBtn.textContent = 'Ver Minha Carta';
    }
});

// Game Controls
btnStartGame.addEventListener('click', async () => {
    await updateRoom({ gameStarted: true, status: 'playing', currentTurnPlayerId: 'miguel' });
});

btnNextTurn.addEventListener('click', async () => {
    // Get all online players for turn rotation
    const players = await new Promise(resolve => {
        const unsub = listenToPlayers(p => { unsub(); resolve(p); });
    });
    
    if (players.length === 0) return;

    // Filter online players and sort them to keep a stable rotation
    const activePlayers = players.filter(p => (Date.now() - p.joinedAtMs) < 300000).map(p => p.id);
    if (activePlayers.length === 0) return;

    const currentIndex = activePlayers.indexOf(roomState.currentTurnPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    const nextPlayerId = activePlayers[nextIndex];

    const now = Date.now();
    const duration = 60; // Reset to 60 seconds for each turn
    
    await updateRoom({ 
        currentTurnPlayerId: nextPlayerId,
        'timer.isRunning': true,
        'timer.startedAtMs': now,
        'timer.endsAtMs': now + (duration * 1000),
        'timer.durationSeconds': duration
    });
    
    playSound('cardReveal');
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
    playSound('roundStart');
    await updateRoom({ 
        roundNumber: (roomState.roundNumber || 0) + 1,
        'timer.isRunning': false 
    });
});

btnEndGame.addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja encerrar o jogo e ver o placar final?')) {
        await updateRoom({ status: 'finished', 'timer.isRunning': false });
    }
});

// Meeting Controls
btnSaveMeet.addEventListener('click', async () => {
    const link = meetLinkInput.value.trim();
    await updateRoom({ 'meeting.link': link, 'meeting.updated_at': Date.now() });
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

// Dream Modal Events
btnOpenDream.addEventListener('click', () => {
    dreamInput.value = roomState?.gameObjective || '';
    dreamModal.classList.remove('hidden');
    dreamInput.focus();
});

btnCancelDream.addEventListener('click', () => {
    dreamModal.classList.add('hidden');
});

btnSaveDream.addEventListener('click', async () => {
    const objective = dreamInput.value.trim();
    await updateRoom({ gameObjective: objective });
    dreamModal.classList.add('hidden');
    alert('Sonho de Jogo atualizado para todos!');
});

btnSaveEmojis.addEventListener('click', async () => {
    const emojiM = emojiMiguel.value.trim();
    const emojiS = emojiSophia.value.trim();
    
    if (emojiM) await updatePlayer('miguel', { emoji: emojiM });
    if (emojiS) await updatePlayer('sophia', { emoji: emojiS });
    
    alert('Emojis atualizados!');
});

// setInterval for dynamic UI updates (timer)
setInterval(() => {
    if (roomState?.timer?.isRunning) updateUI();
}, 1000);

init();
