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
    loginWithEmail
} from './firebase-service.js';
import { playSound } from './audio.js';
import { setupChat } from './chat.js';

const PLAYER_ID = document.body.dataset.player;
const PLAYER_NAME = PLAYER_ID.charAt(0).toUpperCase() + PLAYER_ID.slice(1);
const PRIVATE_CHAT_ID = `private-papai-${PLAYER_ID}`;

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

let isInitialized = false;

async function init() {
    // Store my ID for win page redirect
    localStorage.setItem('last_player_id', PLAYER_ID);
    
    onAuth(async (user) => {
        try {
            if (!user) {
                console.log("[AUTH] Nenhum usuário autenticado. Tentando login com e-mail...");

                try {
                    const email = `${PLAYER_ID}@sabermidia.com.br`;
                    const password = 'qwerty';
                    await loginWithEmail(email, password);
                    return; // Wait for onAuth to trigger again
                } catch (authError) {
                    console.error("[AUTH] Falha no login. O app não pode continuar sem autenticação.", authError);

                    showAuthError(
                        "Não foi possível entrar automaticamente. " +
                        `O usuário ${PLAYER_ID}@sabermidia.com.br precisa estar cadastrado e ativo no Firebase.`
                    );

                    return;
                }
            }

            if (!isInitialized) {
                isInitialized = true;
                console.log("[APP] Usuário autenticado. Inicializando página do jogador...");
                await finishInit();
            }

        } catch (error) {
            console.error("[APP] Erro crítico na inicialização do jogador:", error);
            showAuthError("Erro ao iniciar o jogo. Veja o console para detalhes.");
        }
    });
}

function showAuthError(message) {
    const existing = document.getElementById("auth-error-box");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "auth-error-box";
    box.style.cssText = `
        position: fixed;
        inset: 16px;
        z-index: 9999;
        background: rgba(15, 23, 42, 0.96);
        color: white;
        border: 1px solid rgba(239, 68, 68, 0.45);
        border-radius: 18px;
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        justify-content: center;
        text-align: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    box.innerHTML = `
        <div style="font-size: 42px;">⚠️</div>
        <h2 style="margin: 0; font-size: 20px;">Erro de acesso ao jogo</h2>
        <p style="margin: 0; color: #cbd5e1; line-height: 1.5;">${message}</p>
        <div style="margin-top: 10px; padding: 12px; background: rgba(255,255,255,0.06); border-radius: 12px; font-size: 13px; color: #fca5a5;">
            Verifique se Miguel e Sophia estão cadastrados no Firebase com as senhas corretas.
        </div>
        <button onclick="location.reload()" style="
            margin-top: 12px;
            height: 46px;
            border: 0;
            border-radius: 12px;
            background: #ef4444;
            color: white;
            font-weight: 800;
            cursor: pointer;
        ">
            Tentar novamente
        </button>
    `;

    document.body.appendChild(box);
}

async function finishInit() {
    await initRoom();
    
    updatePlayerStatus(PLAYER_ID, { online: true, name: PLAYER_NAME });

    // Online Heartbeat
    setInterval(() => {
        updatePlayerStatus(PLAYER_ID, { lastSeen: Date.now(), online: true });
    }, 30000);

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
    console.log("[CHAT] Preparando setupChat:", {
        playerId: PLAYER_ID,
        playerName: PLAYER_NAME,
        tabs: chatTabs.length,
        messagesList: !!messagesList,
        chatInput: !!chatInput,
        sendMsgBtn: !!sendMsgBtn
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

    console.log("[CHAT] setupChat chamado com sucesso.");

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
            playSound('click');
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
    
    // Status Concluído avoids the loop
    if (roomState.status === 'concluído') {
        turnStatus.innerHTML = '<span style="color: #4ade80;">Jogo Concluído! 🏆</span>';
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

// New Game / Create Room Button
const btnNewGame = document.getElementById('btn-new-game');
if (btnNewGame) {
    btnNewGame.addEventListener('click', async () => {
        playSound('click');
        if (confirm('Deseja iniciar uma nova rodada e gerar novas cartas?')) {
            const { CARD_BANK } = await import('./cards.js');
            const { shuffleArray } = await import('./utils.js');
            const { updatePrivateHand, updateRoom } = await import('./firebase-service.js');
            
            const shuffled = shuffleArray(CARD_BANK);
            await updatePrivateHand('miguel', shuffled[0]);
            await updatePrivateHand('sophia', shuffled[1]);
            await updatePrivateHand('papai', shuffled[2]);
            await updateRoom({ 
                roundNumber: (roomState?.roundNumber || 0) + 1,
                status: 'playing',
                gameStarted: true,
                'timer.isRunning': false
            });
            alert('Novo jogo iniciado!');
        }
    });
}

// Change Password Button
const btnChangePass = document.getElementById('btn-change-pass');
if (btnChangePass) {
    btnChangePass.addEventListener('click', async () => {
        const newPass = prompt('Digite sua nova senha:');
        if (newPass && newPass.length >= 3) {
            const { updateRoom } = await import('./firebase-service.js');
            const updates = {};
            updates[`passwords.${PLAYER_ID}`] = newPass;
            await updateRoom(updates);
            alert('Senha alterada com sucesso!');
        } else if (newPass) {
            alert('Senha muito curta!');
        }
    });
}

// Timer auto-refresh every second for smooth countdown
let lastRemaining = null;
setInterval(() => {
    if (roomState && roomState.timer?.isRunning && roomState.timer?.endsAtMs) {
        const remaining = Math.max(0, Math.ceil((roomState.timer.endsAtMs - Date.now()) / 1000));
        
        // Play warning sound every second when under 5
        if (remaining <= 5 && remaining > 0 && remaining !== lastRemaining) {
            playSound('timerWarning');
        }
        
        // Play end sound
        if (remaining === 0 && lastRemaining === 1) {
            playSound('timerEnd');
        }
        
        lastRemaining = remaining;
        updateUI();
    }
}, 1000);

init();
