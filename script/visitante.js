/* script/visitante.js */
import { 
    onAuth, 
    getGuestProfile,
    listenToActiveGameRooms,
    updatePlayerStatus
} from './firebase-service.js';
import { setupChat } from './chat.js';

let currentUser = null;
let profile = null;

// DOM Elements
const guestNameDisplay = document.getElementById('guest-name-display');
const activeRoomsList = document.getElementById('activeRoomsList');
const messagesList = document.getElementById('messages-list');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg');

async function init() {
    onAuth(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = user;
        
        // Fetch Guest Profile
        profile = await getGuestProfile(user.uid);
        if (profile) {
            guestNameDisplay.textContent = profile.displayName;
        }

        setupVisitante();
    });
}

function setupVisitante() {
    const playerId = 'guest_' + currentUser.uid.slice(0, 8);
    const playerName = profile?.displayName || "Convidado";

    // 1. Heartbeat
    updatePlayerStatus(playerId, { online: true, name: playerName, role: 'guest' });
    setInterval(() => {
        updatePlayerStatus(playerId, { lastSeen: Date.now(), online: true });
    }, 30000);

    // 2. Chat (Only Group)
    setupChat({
        playerId: playerId,
        playerName: playerName,
        playerRole: 'guest',
        senderColor: profile?.chatColor || '#f59e0b',
        initialChatId: 'group',
        tabs: [], // No tabs for guests
        messagesList: messagesList,
        input: chatInput,
        sendBtn: sendMsgBtn
    });

    // 3. Active Rooms
    listenToActiveGameRooms((rooms) => {
        renderActiveRooms(rooms);
    });
}

function renderActiveRooms(rooms) {
    if (rooms.length === 0) {
        activeRoomsList.innerHTML = `
            <div class="text-center py-8 space-y-2">
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest italic">Nenhuma sala ativa no momento</p>
                <p class="text-[10px] text-gray-600">Aguarde a família iniciar um jogo...</p>
            </div>
        `;
        return;
    }

    activeRoomsList.innerHTML = rooms.map(room => `
        <div class="bg-gray-800/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-gray-800 transition-all">
            <div>
                <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sala de ${room.createdByName}</p>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-600/20 font-black">${room.status.toUpperCase()}</span>
                    <span class="text-xs text-gray-500">${room.joinedPlayers?.length || 0} Jogadores</span>
                </div>
            </div>
            <a href="jogo.html?room=${room.id}" class="bg-white text-gray-950 p-3 rounded-xl transform group-hover:scale-105 transition-all font-black text-xs">ENTRAR</a>
        </div>
    `).join('');
}

init();
