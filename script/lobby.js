/* script/lobby.js */
import { 
    onAuth, 
    createGameRoom, 
    listenToActiveGameRooms, 
    listenToMeet,
    updatePlayerStatus
} from './firebase-service.js';
import { setupChat } from './chat.js';
import { playSound } from './audio.js';

const PLAYER_ID = document.body.dataset.player;
const PLAYER_NAME = PLAYER_ID.charAt(0).toUpperCase() + PLAYER_ID.slice(1);

let currentUser = null;

// DOM Elements
const btnCreateRoom = document.getElementById('btnCreateRoom');
const activeRoomsList = document.getElementById('activeRoomsList');
const meetContainer = document.getElementById('meet-container');
const meetLink = document.getElementById('meet-link');
const chatTabs = document.querySelectorAll('.chat-tab');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');
const playerNameDisplay = document.getElementById('player-name-display');

async function init() {
    onAuth(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = user;
        
        // Update name display
        if (playerNameDisplay) {
            playerNameDisplay.textContent = user.displayName || PLAYER_NAME;
        }

        // Finalize initialization
        setupLobby();
    });
}

function setupLobby() {
    // 1. Heartbeat
    updatePlayerStatus(PLAYER_ID, { online: true, name: PLAYER_NAME });
    setInterval(() => {
        updatePlayerStatus(PLAYER_ID, { lastSeen: Date.now(), online: true });
    }, 30000);

    // 2. Active Rooms Listener
    listenToActiveGameRooms((rooms) => {
        renderActiveRooms(rooms);
    });

    // 3. Meet Listener
    listenToMeet((meeting) => {
        if (meeting.enabled && meeting.link) {
            meetLink.href = meeting.link;
            meetContainer.classList.remove('hidden');
        } else {
            meetContainer.classList.add('hidden');
        }
    });

    // 4. Chat Setup
    const senderColor = PLAYER_ID === 'miguel' ? '#3b82f6' : '#ec4899';
    setupChat({
        playerId: PLAYER_ID,
        playerName: PLAYER_NAME,
        playerRole: 'family',
        senderColor: senderColor,
        initialChatId: 'group',
        tabs: chatTabs,
        messagesList: messagesList,
        input: chatInput,
        sendBtn: sendMsgBtn
    });

    // 5. Create Room Action
    btnCreateRoom.addEventListener('click', async () => {
        playSound('click');
        try {
            const roomId = await createGameRoom(currentUser.uid, currentUser.displayName || PLAYER_NAME);
            if (roomId) {
                window.location.href = `jogo.html?room=${roomId}`;
            }
        } catch (error) {
            alert("Erro ao criar sala. Verifique suas permissões.");
            console.error(error);
        }
    });
}

function renderActiveRooms(rooms) {
    if (rooms.length === 0) {
        activeRoomsList.innerHTML = '<p class="text-xs text-gray-500 italic py-4 text-center">Nenhuma sala ativa no momento.</p>';
        return;
    }

    activeRoomsList.innerHTML = rooms.map(room => `
        <div class="bg-indigo-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-indigo-900/60 transition-all">
            <div>
                <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Sala de ${room.createdByName}</p>
                <div class="flex items-center gap-2">
                    <span class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">${room.joinedPlayers?.length || 0} Jogadores</span>
                    <span class="text-[10px] text-gray-500 uppercase font-black">${room.status === 'playing' ? '🎮 Jogando' : '⏳ Aguardando'}</span>
                </div>
            </div>
            <a href="jogo.html?room=${room.id}" class="bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl transform group-hover:scale-110 transition-all font-black text-xs">ENTRAR</a>
        </div>
    `).join('');
}

init();
