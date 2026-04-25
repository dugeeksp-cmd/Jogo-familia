/* script/papai.js */
import { 
    onAuth, 
    loginWithGoogle,
    updateRoom, 
    updatePlayer,
    listenToRoom, 
    listenToPlayers,
    createGameRoom,
    listenToActiveGameRooms,
    updateMeetRoom,
    updatePlayerStatus,
    initRoom,
    auth
} from './firebase-service.js';
import { setupChat } from './chat.js';
import { playSound } from './audio.js';

const PLAYER_ID = 'papai';
const PLAYER_NAME = 'Papai';

let currentUser = null;
let roomState = null;
let allPlayers = [];

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const activeRoomsList = document.getElementById('activeRoomsList');
const meetLinkInput = document.getElementById('meet-link-input');
const btnSaveMeet = document.getElementById('btn-save-meet');
const btnToggleMeet = document.getElementById('btn-toggle-meet');
const emojiMiguel = document.getElementById('emoji-miguel');
const emojiSophia = document.getElementById('emoji-sophia');
const passMiguelInput = document.getElementById('pass-miguel-input');
const passSophiaInput = document.getElementById('pass-sophia-input');
const btnSaveMiguel = document.getElementById('p-save-miguel');
const btnSaveSophia = document.getElementById('p-save-sophia');
const chatTabs = document.querySelectorAll('.chat-tab');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');
const onlineIndicators = document.getElementById('online-indicators');

async function init() {
    onAuth(async (user) => {
        if (user) {
            currentUser = user;
            if (user.displayName !== PLAYER_NAME) {
                const { updateProfile } = await import('firebase/auth');
                await updateProfile(user, { displayName: PLAYER_NAME });
                await user.getIdToken(true);
            }
            if (loginOverlay) loginOverlay.style.display = 'none';
            initRoom();
            setupAdmin();
        } else {
            if (loginOverlay) loginOverlay.style.display = 'flex';
        }
    });

    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            try {
                const user = await loginWithGoogle();
                if (user) {
                    const { updateProfile } = await import('firebase/auth');
                    await updateProfile(user, { displayName: PLAYER_NAME });
                    await user.getIdToken(true); // Force token refresh
                    // Success, onAuth will handle the rest
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao fazer login com Google.");
            }
        });
    }
}

function setupAdmin() {
    // 0. Heartbeat
    updatePlayerStatus(PLAYER_ID, { online: true, name: PLAYER_NAME, role: 'family' });
    setInterval(() => {
        updatePlayerStatus(PLAYER_ID, { lastSeen: Date.now(), online: true });
    }, 30000);

    // 1. Listen to Global Room (PRINCIPAL) for Meet and Passwords
    listenToRoom((room) => {
        roomState = room;
        updateMeetUI();
        updatePasswordsUI();
    });

    // 2. Listen to All Players
    listenToPlayers((players) => {
        allPlayers = players;
        updatePlayersUI();
        updateOnlineUI(players);
    });

    // 3. Listen to Active Game Rooms
    listenToActiveGameRooms((rooms) => {
        renderActiveRooms(rooms);
    });

    // 4. Chat Setup
    setupChat({
        playerId: PLAYER_ID,
        playerName: PLAYER_NAME,
        playerRole: 'family',
        senderColor: '#10b981',
        initialChatId: 'family',
        tabs: chatTabs,
        messagesList: messagesList,
        input: chatInput,
        sendBtn: sendMsgBtn
    });

    // --- EVENTS ---

    btnCreateRoom.addEventListener('click', async () => {
        playSound('click');
        try {
            console.log("[ADMIN] Criando sala p/ ID:", currentUser.uid);
            const roomId = await createGameRoom(currentUser.uid, PLAYER_NAME);
            if (roomId) {
                window.location.href = `jogo.html?room=${roomId}`;
            }
        } catch (error) {
            console.error("[ADMIN] Erro ao criar sala:", error);
            alert("Erro ao criar sala: " + error.message);
        }
    });

    btnSaveMeet.addEventListener('click', async () => {
        const link = meetLinkInput.value.trim();
        const enabled = roomState?.meeting?.enabled || false;
        await updateMeetRoom(link, enabled);
        alert("Link do Meet salvo!");
    });

    btnToggleMeet.addEventListener('click', async () => {
        const link = meetLinkInput.value.trim();
        const newState = !roomState?.meeting?.enabled;
        await updateMeetRoom(link, newState);
    });

    btnSaveMiguel.addEventListener('click', async () => {
        const emoji = emojiMiguel.value.trim();
        const pass = passMiguelInput.value.trim();
        if (emoji) await updatePlayer('miguel', { emoji });
        if (pass) {
            const updates = {};
            updates['passwords.miguel'] = pass;
            await updateRoom(updates);
        }
        alert("Dados do Miguel atualizados!");
    });

    btnSaveSophia.addEventListener('click', async () => {
        const emoji = emojiSophia.value.trim();
        const pass = passSophiaInput.value.trim();
        if (emoji) await updatePlayer('sophia', { emoji });
        if (pass) {
            const updates = {};
            updates['passwords.sophia'] = pass;
            await updateRoom(updates);
        }
        alert("Dados da Sophia atualizados!");
    });
}

function updateOnlineUI(players) {
    if (onlineIndicators) {
        const others = players.filter(p => p.online && p.id !== PLAYER_ID && (Date.now() - (p.lastSeen || 0) < 60000));
        onlineIndicators.innerHTML = `
            <div class="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span class="text-[10px] text-green-500 font-bold uppercase tracking-wider">Você</span>
            </div>
            ${others.map(p => `
                <div class="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider">${p.name}</span>
                </div>
            `).join('')}
        `;
    }
}

function updateMeetUI() {
    if (!roomState?.meeting) return;
    const meeting = roomState.meeting;
    meetLinkInput.value = meeting.link || '';
    btnToggleMeet.textContent = meeting.enabled ? 'DESATIVAR MEET' : 'ATIVAR MEET';
    btnToggleMeet.className = meeting.enabled 
        ? 'flex-1 bg-red-600/20 text-red-400 p-3 rounded-xl font-black text-sm transition-all border border-red-600/30'
        : 'flex-1 bg-green-600/20 text-green-400 p-3 rounded-xl font-black text-sm transition-all border border-green-600/30';
}

function updatePasswordsUI() {
    if (!roomState?.passwords) return;
    if (!passMiguelInput.value) passMiguelInput.value = roomState.passwords.miguel || '';
    if (!passSophiaInput.value) passSophiaInput.value = roomState.passwords.sophia || '';
}

function updatePlayersUI() {
    const mig = allPlayers.find(p => p.id === 'miguel');
    const sop = allPlayers.find(p => p.id === 'sophia');
    if (mig && !emojiMiguel.value) emojiMiguel.value = mig.emoji || '';
    if (sop && !emojiSophia.value) emojiSophia.value = sop.emoji || '';
}

function renderActiveRooms(rooms) {
    if (rooms.length === 0) {
        activeRoomsList.innerHTML = '<p class="text-xs text-gray-500 italic py-4 text-center">Nenhuma sala ativa.</p>';
        return;
    }

    activeRoomsList.innerHTML = rooms.map(room => `
        <div class="bg-gray-800/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-gray-800 transition-all">
            <div>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sala de ${room.createdByName}</p>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 font-black">${room.status.toUpperCase()}</span>
                    <span class="text-xs text-gray-500">${room.joinedPlayers?.length || 0} Jogadores</span>
                </div>
            </div>
            <a href="jogo.html?room=${room.id}" class="bg-yellow-600 hover:bg-yellow-500 p-3 rounded-xl transform group-hover:scale-105 transition-all font-black text-xs">GERENCIAR / ENTRAR</a>
        </div>
    `).join('');
}

init();
