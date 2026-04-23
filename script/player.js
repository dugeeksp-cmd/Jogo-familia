/* script/player.js */
import { 
    initRoom, 
    listenToRoom, 
    listenToPrivateHand, 
    updatePlayerStatus,
    listenToPlayers,
    listenToAllHands,
    sendGuess,
    onAuth,
    loginAnonymously
} from './firebase-service.js';
import { playSound } from './audio.js';
import { setupChat } from './chat.js';

const PLAYER_ID = document.body.dataset.player;
const PLAYER_NAME = PLAYER_ID.charAt(0).toUpperCase() + PLAYER_ID.slice(1);
const PRIVATE_CHAT_ID = PLAYER_ID === 'miguel' ? 'papai-miguel' : 'papai-sophia';

let roomState = null;

// DOM Elements
const meetContainer = document.getElementById('meet-container');
const meetLink = document.getElementById('meet-link');
const toggleCardBtn = document.getElementById('toggle-card');
const gameCard = document.getElementById('game-card');
const cardCat = document.getElementById('card-cat');
const cardText = document.getElementById('card-text');
const cardDiff = document.getElementById('card-diff');
const timerNumber = document.getElementById('timer-number');
const turnStatus = document.getElementById('turn-status');
const allCardsDisplay = document.getElementById('all-cards-display');
const objectiveContainer = document.getElementById('objective-container');
const objectiveText = document.getElementById('objective-text');
const chatTabs = document.querySelectorAll('.chat-tab');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');
const playerScoreHeader = document.getElementById('player-score-header');
const playerNameDisplay = document.getElementById('player-name-display');
const inviteBtn = document.getElementById('invite-btn');

// Guess Modal Elements
const btnOpenGuess = document.getElementById('btn-open-guess');
const guessModal = document.getElementById('guess-modal');
const btnCancelGuess = document.getElementById('btn-cancel-guess');
const btnConfirmGuess = document.getElementById('btn-confirm-guess');
const guessInput = document.getElementById('guess-input');

async function init() {
    onAuth(async (user) => {
        if (!user) {
            await loginAnonymously();
            return; // Wait for onAuth to trigger again with user
        }
        await finishInit();
    });
}

async function finishInit() {
    await initRoom();
    
    updatePlayerStatus(PLAYER_ID, { online: true, name: PLAYER_NAME });

    listenToRoom((room) => {
        roomState = room;
        updateUI();
    });

    listenToPlayers((players) => {
        const me = players.find(p => p.id === PLAYER_ID);
        if (me) {
            if (playerScoreHeader) {
                playerScoreHeader.textContent = `${me.score || 0} pts`;
            }
            if (playerNameDisplay) {
                const emojiStr = me.emoji ? `<span style="margin-right: 8px;">${me.emoji}</span>` : '';
                playerNameDisplay.innerHTML = `${emojiStr}${PLAYER_NAME}`;
            }
        }
    });

    listenToAllHands((hands) => {
        renderAllCards(hands);
    });

    listenToPrivateHand(PLAYER_ID, (hand) => {
        if (hand && hand.card) {
            const cat = hand.card.category.toLowerCase();
            cardCat.textContent = cat.toUpperCase();
            cardText.textContent = hand.card.text;
            cardDiff.textContent = hand.card.difficulty.toUpperCase();
            
            // Apply category class to card for background image
            gameCard.className = `game-card card-blur card-cat-${cat}`;
        }
    });

    // Initialize Chat
    chatTabs.forEach(tab => {
        if (tab.dataset.chat === 'private') tab.dataset.chatMapping = PRIVATE_CHAT_ID;
        else if (tab.dataset.chat === 'public') tab.dataset.chatMapping = 'public';
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
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            const url = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/index.html?room=${roomState?.code || "PRINCIPAL"}`;
            navigator.clipboard.writeText(url).then(() => alert('Link de convite com código da sala copiado!'));
        });
    }

    // Guess Modal Events
    if (btnOpenGuess) {
        btnOpenGuess.addEventListener('click', () => {
            guessModal.classList.remove('hidden');
            guessInput.focus();
        });
    }

    if (btnCancelGuess) {
        btnCancelGuess.addEventListener('click', () => {
            guessModal.classList.add('hidden');
            guessInput.value = '';
        });
    }

    if (btnConfirmGuess) {
        btnConfirmGuess.addEventListener('click', async () => {
            const text = guessInput.value.trim();
            if (!text) return;

            await sendGuess(PLAYER_ID, PLAYER_NAME, text);
            alert('Palpite enviado! Aguarde a verificação do Papai.');
            guessModal.classList.add('hidden');
            guessInput.value = '';
            
            // Log in chat for visibility
            // await sendMessage('group', PLAYER_ID, PLAYER_NAME, `Fiz um palpite: "${text}" 🎯`);
        });
    }
}

function updateUI() {
    if (!roomState) return;

    if (roomState.status === 'finished') {
        window.location.href = 'win.html';
        return;
    }

    // Public Chat Visibility for Guests
    const publicTab = Array.from(chatTabs).find(t => t.dataset.chat === 'public');
    if (publicTab) {
        publicTab.style.display = roomState.publicChatHiddenForGuests ? 'none' : 'block';
    }

    // Meeting
    if (roomState.meeting?.enabled && roomState.meeting?.link) {
        meetLink.href = roomState.meeting.link;
        meetContainer.classList.remove('hidden');
    } else {
        meetContainer.classList.add('hidden');
    }

    // Objective
    if (roomState.gameObjective) {
        objectiveText.textContent = roomState.gameObjective;
        objectiveContainer.classList.remove('hidden');
    } else {
        objectiveContainer.classList.add('hidden');
    }

    // Objective
    if (roomState.gameObjective) {
        objectiveText.textContent = roomState.gameObjective;
        objectiveContainer.classList.remove('hidden');
    } else {
        objectiveContainer.classList.add('hidden');
    }

    // Timer
    if (roomState.timer?.isRunning && roomState.timer?.endsAtMs) {
        const remaining = Math.max(0, Math.ceil((roomState.timer.endsAtMs - Date.now()) / 1000));
        timerNumber.textContent = remaining;
        
        // Visual feedback for low time
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.borderColor = remaining <= 10 ? '#ef4444' : '#f97316';
            timerDisplay.style.color = remaining <= 10 ? '#ef4444' : '#f97316';
        }

        if (remaining === 0) {
            playSound('timerEnd');
        }
    } else {
        timerNumber.textContent = roomState.timer?.durationSeconds || 60;
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.borderColor = '#f97316';
            timerDisplay.style.color = '#f97316';
        }
    }

    // Turn
    const timerArea = document.querySelector('.timer-area');
    if (roomState.currentTurnPlayerId === PLAYER_ID) {
        turnStatus.innerHTML = '<span class="turn-active">Sua vez de adivinhar!</span>';
        if (timerArea) timerArea.classList.add('glow-turn');
    } else {
        const turnName = roomState.currentTurnPlayerId ? roomState.currentTurnPlayerId.charAt(0).toUpperCase() + roomState.currentTurnPlayerId.slice(1) : 'Aguardando';
        turnStatus.textContent = `Vez de: ${turnName}`;
        if (timerArea) timerArea.classList.remove('glow-turn');
    }
}

function renderAllCards(hands) {
    if (!allCardsDisplay) return;
    // Mostrar apenas cartas de OUTROS jogadores ou a própria como secreta
    allCardsDisplay.innerHTML = hands.map(h => {
        const isMe = h.playerId === PLAYER_ID;
        return `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; border-radius: 12px; font-size: 0.7rem; min-width: 80px; text-align: center;">
                <div style="font-weight: 800; color: ${isMe ? '#f59e0b' : '#10b981'}; margin-bottom: 2px;">${isMe ? 'VOCÊ' : h.playerId.toUpperCase()}</div>
                <div style="color: white; font-weight: 600; filter: ${isMe ? 'blur(4px)' : 'none'};">
                    ${isMe ? '???' : (h.card?.text || 'Sem carta')}
                </div>
            </div>
        `;
    }).join('');
}

// Card Toggle
toggleCardBtn.addEventListener('click', () => {
    gameCard.classList.toggle('card-blur');
    if (!gameCard.classList.contains('card-blur')) {
        playSound('cardReveal');
        toggleCardBtn.textContent = 'Esconder Carta';
    } else {
        toggleCardBtn.textContent = 'Ver Carta';
    }
});

// Timer auto-refresh every second for smooth countdown
setInterval(() => {
    if (roomState && roomState.timer?.isRunning) {
        updateUI();
    }
}, 1000);

init();
