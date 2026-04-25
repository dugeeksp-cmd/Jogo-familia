/* script/index.js */
import { 
    listenToPlayers, 
    listenToRoom, 
    loginWithGoogle,
    onAuth,
    loginAnonymously,
    signUpGuest,
    loginWithUsernameOrEmail,
    syncGoogleGuestProfile,
    auth
} from './firebase-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const miguelBtn = document.getElementById('miguel-btn');
    const sophiaBtn = document.getElementById('sophia-btn');
    const papaiBtn = document.getElementById('papai-btn');
    const guestBtn = document.getElementById('guest-btn');
    
    const adminModal = document.getElementById('password-modal');
    const playerModal = document.getElementById('player-password-modal');
    const guestAuthModal = document.getElementById('guest-auth-modal');
    
    // Guest Auth Elements
    const guestOptionsMenu = document.getElementById('guest-options-menu');
    const guestLoginForm = document.getElementById('guest-login-form');
    const guestSignupForm = document.getElementById('guest-signup-form');
    const guestAuthError = document.getElementById('guest-auth-error');

    const optLoginBtn = document.getElementById('opt-login-btn');
    const optSignupBtn = document.getElementById('opt-signup-btn');
    const guestGoogleLogin = document.getElementById('guest-google-login');
    const closeGuestModal = document.getElementById('close-guest-modal');

    const backToOptionsLogin = document.getElementById('back-to-guest-options-login');
    const backToOptionsSignup = document.getElementById('back-to-guest-options-signup');

    const loginIdInput = document.getElementById('login-id');
    const loginPassInput = document.getElementById('login-pass');
    const guestLoginConfirm = document.getElementById('guest-login-confirm');

    const signupUserInput = document.getElementById('signup-user');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPassInput = document.getElementById('signup-pass');
    const guestSignupConfirm = document.getElementById('guest-signup-confirm');

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
            const now = Date.now();
            const ACTIVE_THRESHOLD = 45000; // 45 seconds (was 120s)
            
            // Deduplicate by name or slug and filter active
            const uniquePlayers = {};
            players.forEach(p => {
                const identifier = (p.slug || p.name || p.id || 'anon').toLowerCase();
                const isRecentlySeen = (now - (p.lastSeen || 0)) < ACTIVE_THRESHOLD;
                
                if (p.online && isRecentlySeen) {
                    if (!uniquePlayers[identifier] || (p.lastSeen > uniquePlayers[identifier].lastSeen)) {
                        uniquePlayers[identifier] = p;
                    }
                }
            });

            const activeList = Object.values(uniquePlayers);

            onlinePlayersList.innerHTML = activeList.map(p => {
                return `
                    <div style="display: flex; align-items: center; gap: 6px; background: rgba(74, 222, 128, 0.1); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(74, 222, 128, 0.2);">
                        <div style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #4ade80;">${p.name || 'Jogador'}</span>
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
                const user = await loginWithGoogle();
                if (user) {
                    const { updateProfile } = await import('firebase/auth');
                    await updateProfile(user, { displayName: 'Papai' });
                    await user.getIdToken(true);
                }
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

    // Guest Auth Logic
    guestBtn.addEventListener('click', () => {
        guestAuthModal.classList.remove('hidden');
        showGuestMenu();
    });

    const showGuestMenu = () => {
        guestOptionsMenu.classList.remove('hidden');
        guestLoginForm.classList.add('hidden');
        guestSignupForm.classList.add('hidden');
        guestAuthError.classList.add('hidden');
    };

    optLoginBtn.addEventListener('click', () => {
        guestOptionsMenu.classList.add('hidden');
        guestLoginForm.classList.remove('hidden');
    });

    optSignupBtn.addEventListener('click', () => {
        guestOptionsMenu.classList.add('hidden');
        guestSignupForm.classList.remove('hidden');
    });

    backToOptionsLogin.addEventListener('click', showGuestMenu);
    backToOptionsSignup.addEventListener('click', showGuestMenu);
    closeGuestModal.addEventListener('click', () => guestAuthModal.classList.add('hidden'));

    guestGoogleLogin.addEventListener('click', async () => {
        try {
            const user = await loginWithGoogle();
            await syncGoogleGuestProfile(user);
            window.location.href = 'visitante.html';
        } catch (error) {
            console.error(error);
            guestAuthError.textContent = "Erro ao entrar com Google.";
            guestAuthError.classList.remove('hidden');
        }
    });

    guestLoginConfirm.addEventListener('click', async () => {
        const login = loginIdInput.value.trim();
        const pass = loginPassInput.value.trim();
        if (!login || !pass) return;

        try {
            await loginWithUsernameOrEmail(login, pass);
            window.location.href = 'visitante.html';
        } catch (error) {
            console.error("[LOGIN]", error);
            guestAuthError.textContent = "Login ou senha inválidos.";
            guestAuthError.classList.remove('hidden');
        }
    });

    guestSignupConfirm.addEventListener('click', async () => {
        const user = signupUserInput.value.trim();
        const email = signupEmailInput.value.trim();
        const pass = signupPassInput.value.trim();

        if (!user || !email || !pass) {
            guestAuthError.textContent = "Preencha todos os campos.";
            guestAuthError.classList.remove('hidden');
            return;
        }

        if (pass.length < 6) {
            guestAuthError.textContent = "A senha deve ter pelo menos 6 caracteres.";
            guestAuthError.classList.remove('hidden');
            return;
        }

        try {
            await signUpGuest(user, email, pass);
            window.location.href = 'visitante.html';
        } catch (error) {
            console.error("[SIGNUP]", error);
            guestAuthError.textContent = error.message.includes('permission-denied') 
                ? "Erro de permissão no servidor." 
                : error.message || "Erro ao criar conta. Tente outro usuário ou e-mail.";
            guestAuthError.classList.remove('hidden');
        }
    });

    cancelPlayerBtn.addEventListener('click', () => {
        playerModal.classList.add('hidden');
    });

    const verifyPass = async () => {
        const input = playerPasswordInput.value.trim();
        const correct = currentRoom?.passwords?.[selectedPlayerId] || 'qwerty'; // Default: qwerty
        
        if (input === correct) {
            // Set displayName so firestore rules identify them
            const user = auth.currentUser;
            if (user) {
                const { updateProfile } = await import('firebase/auth');
                await updateProfile(user, { 
                    displayName: selectedPlayerId.charAt(0).toUpperCase() + selectedPlayerId.slice(1) 
                });
                await user.getIdToken(true); // Force token refresh
            }
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

    // Version Modal Logic
    const versionBtn = document.getElementById('version-btn');
    const versionModal = document.getElementById('version-modal');
    const closeVersionBtn = document.getElementById('close-version');

    if (versionBtn && versionModal && closeVersionBtn) {
        const saveVersionBtn = document.getElementById('save-version-btn');
        const validatedSection = document.getElementById('validated-section'); // I'll add this to HTML
        
        async function loadValidationHistory() {
            try {
                const res = await fetch('/api/validated');
                const history = await res.json();
                
                const checkboxes = document.querySelectorAll('.v-check');
                const validatedList = document.getElementById('validated-list');
                validatedList.innerHTML = '';
                
                checkboxes.forEach(cb => {
                    const version = cb.closest('.version-list').dataset.version;
                    const feat = cb.dataset.feat;
                    // Check specific version OR the new 'current' flat map for persistence
                    const isCheck = (history[version] && history[version][feat]) || (history["current"] && history["current"][feat]);
                    cb.checked = isCheck;
                    
                    if (isCheck) {
                        const li = document.createElement('div');
                        li.style.cssText = "font-size: 0.75rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 6px;";
                        li.innerHTML = `
                            <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span style="text-decoration: line-through;">${cb.parentElement.textContent.replace('Fix:', '').replace('Novo:', '').trim()}</span>
                        `;
                        validatedList.appendChild(li);
                        cb.parentElement.style.display = 'none'; // Hide it from pending list if already validated
                    } else {
                        cb.parentElement.style.display = 'flex';
                        cb.parentElement.style.opacity = '1';
                    }
                });
            } catch (e) { 
                console.error("[Version] Erro ao carregar histórico:", e); 
            }
        }

        versionBtn.addEventListener('click', async () => {
            versionModal.classList.remove('hidden');
            await loadValidationHistory();
        });
        
        closeVersionBtn.addEventListener('click', () => versionModal.classList.add('hidden'));

        // Handle Checkboxes and Save Button
        const checkboxes = document.querySelectorAll('.v-check');
        
        if (saveVersionBtn) {
            saveVersionBtn.addEventListener('click', async () => {
                const checkboxes = document.querySelectorAll('.v-check');
                const results = Array.from(checkboxes).map(cb => ({
                    version: cb.closest('.version-list').dataset.version,
                    feat: cb.dataset.feat,
                    checked: cb.checked
                }));

                try {
                    saveVersionBtn.textContent = "Salvando...";
                    saveVersionBtn.disabled = true;

                    // Send all checked states to server
                    // We need to send them as a block or handle carefully
                    const validatedData = {};
                    for (const item of results) {
                        if (item.checked) {
                            validatedData[item.feat] = true;
                        }
                    }

                    const resp = await fetch('/api/validate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(validatedData)
                    });

                    if (resp.ok) {
                        saveVersionBtn.textContent = "✅ Validação Salva!";
                        playSound('success');
                        
                        // Refresh history UI immediately
                        await loadValidationHistory();
                    } else {
                        throw new Error("Falha no servidor");
                    }

                    setTimeout(() => {
                        saveVersionBtn.textContent = "Salvar Validação";
                        saveVersionBtn.disabled = false;
                    }, 2000);

                } catch (e) {
                    console.error("[Version] Erro ao salvar validações:", e);
                    saveVersionBtn.textContent = "❌ Erro ao Salvar";
                    setTimeout(() => {
                        saveVersionBtn.textContent = "Salvar Validação";
                        saveVersionBtn.disabled = false;
                    }, 2000);
                }
            });
        }

        // Add Correction report functionality
        const addCorrectionBtn = document.getElementById('add-correction-btn');
        const correctionArea = document.getElementById('correction-area');
        const sendCorrectionBtn = document.getElementById('send-correction-btn');
        const correctionText = document.getElementById('correction-text');

        addCorrectionBtn?.addEventListener('click', () => {
            correctionArea.classList.toggle('hidden');
        });

        sendCorrectionBtn?.addEventListener('click', async () => {
            const text = correctionText.value.trim();
            if (!text) return;

            sendCorrectionBtn.disabled = true;
            sendCorrectionBtn.textContent = 'Enviando...';

            try {
                console.log("[CORRECTION] Novo relato:", text);
                const resp = await fetch('/api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [`RELATO_${Date.now()}`]: text })
                });

                if (resp.ok) {
                    playSound('success');
                    correctionText.value = '';
                    correctionArea.classList.add('hidden');
                    alert("Obrigado! Sua correção foi enviada para o desenvolvedor.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                sendCorrectionBtn.disabled = false;
                sendCorrectionBtn.textContent = 'Enviar Relato';
            }
        });
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
