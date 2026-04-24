/* script/index.js */
import { 
    listenToPlayers, 
    listenToRoom, 
    loginWithGoogle,
    onAuth,
    loginAnonymously
} from './firebase-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const miguelBtn = document.getElementById('miguel-btn');
    const sophiaBtn = document.getElementById('sophia-btn');
    const papaiBtn = document.getElementById('papai-btn');
    
    const adminModal = document.getElementById('password-modal');
    const playerModal = document.getElementById('player-password-modal');
    
    const playerPasswordInput = document.getElementById('player-password-input');
    const playerPasswordError = document.getElementById('player-password-error');
    const playerModalTitle = document.getElementById('player-modal-title');
    const confirmPlayerBtn = document.getElementById('confirm-player-password');
    const cancelPlayerBtn = document.getElementById('cancel-player-password');
    
    const papaiLoginBtn = document.getElementById('papai-login-confirm');
    const cancelAdminBtn = document.getElementById('cancel-password');
    
    const onlinePlayersList = document.getElementById('online-players-list');
    
    let currentRoom = null;
    let selectedPlayerId = null;

    // Ensure user is at least anonymously logged in to see online players
    onAuth(async (user) => {
        if (!user) {
            await loginAnonymously();
            return;
        }
        startListeners();
    });

    function startListeners() {
        // Listen to players for online status
        listenToPlayers((players) => {
            onlinePlayersList.innerHTML = players.map(p => {
                if (!p.online) return '';
                return `
                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(74, 222, 128, 0.1); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(74, 222, 128, 0.2);">
                        <div style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #4ade80;">${p.name}</span>
                    </div>
                `;
            }).join('') || '<p style="font-size: 0.7rem; opacity: 0.4;">Ninguém online no momento.</p>';
        });

        listenToRoom((room) => {
            currentRoom = room;
        });
    }

    // Admin Access (Google Login)
    papaiBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
    });

    cancelAdminBtn.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });

    if (papaiLoginBtn) {
        papaiLoginBtn.addEventListener('click', async () => {
            try {
                await loginWithGoogle();
                window.location.href = 'papai.html';
            } catch (e) {
                console.error(e);
            }
        });
    }

    // Player Access (With custom password)
    const openPlayerModal = (id, name) => {
        selectedPlayerId = id;
        playerModalTitle.textContent = `Acesso ${name}`;
        playerModal.classList.remove('hidden');
        playerPasswordError.classList.add('hidden');
        playerPasswordInput.value = '';
        playerPasswordInput.focus();
    };

    miguelBtn.addEventListener('click', () => openPlayerModal('miguel', 'Miguel'));
    sophiaBtn.addEventListener('click', () => openPlayerModal('sophia', 'Sophia'));

    cancelPlayerBtn.addEventListener('click', () => {
        playerModal.classList.add('hidden');
    });

    const verifyPass = () => {
        const input = playerPasswordInput.value.trim();
        const correct = currentRoom?.passwords?.[selectedPlayerId] || '123abc';
        
        if (input === correct) {
            window.location.href = `${selectedPlayerId}.html`;
        } else {
            playerPasswordError.classList.remove('hidden');
            playerPasswordInput.value = '';
            playerPasswordInput.focus();
        }
    };

    confirmPlayerBtn.addEventListener('click', verifyPass);
    playerPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPass();
    });

    // Info Modal Logic
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeInfoBtn = document.getElementById('close-info');

    if (infoBtn && infoModal && closeInfoBtn) {
        infoBtn.addEventListener('click', () => infoModal.classList.remove('hidden'));
        closeInfoBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
    }
});

// Shake animation style
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}
`;
document.head.appendChild(style);
