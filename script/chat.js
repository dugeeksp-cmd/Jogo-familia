/* script/chat.js */
import { listenToMessages, sendMessage } from './firebase-service.js';
import { playSound } from './audio.js';

export function setupChat(config) {
    const { 
        playerId, 
        playerName, 
        initialChatId, 
        tabs, 
        messagesList, 
        input, 
        sendBtn,
        onMessageSent
    } = config;

    console.log(`[CHAT] Inicializando chat para ${playerId} (${playerName})`, { initialChatId });
    console.log("[CHAT] tabs encontrados:", tabs?.length);
    console.log("[CHAT] messagesList:", messagesList);
    console.log("[CHAT] chat-input:", input);
    console.log("[CHAT] sendBtn:", sendBtn);

    if (!messagesList || !input || !sendBtn) {
        console.error('[CHAT] Elementos obrigatórios ausentes. Chat não será iniciado.');
        return;
    }

    let currentChatId = initialChatId;
    let unsubscribe = null;

    const renderMessages = (messages) => {
        console.log(`[CHAT] Renderizando ${messages.length} mensagens para o chat ${currentChatId}`);
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="empty-chat"><span>💬</span><p>Sem mensagens ainda nesta aba. Dê um oi!</p></div>';
            return;
        }

        const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 100;

        messagesList.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === playerId ? 'msg-me' : 'msg-other'}">
                <span class="message-sender">${msg.senderName}</span>
                <p>${msg.text}</p>
                <span class="message-time">${msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
        `).join('');
        
        // Always scroll if I am the sender, or if I was already at the bottom
        const lastMsg = messages[messages.length - 1];
        const iAmSender = lastMsg && lastMsg.senderId === playerId;

        if (isAtBottom || iAmSender) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }

        // Pulse tab if not active and new message comes
        if (messages.length > 0 && tabs) {
            const lastMessage = messages[messages.length - 1];
            // Only pulse and play sound if the message came from someone else
            if (lastMessage.senderId !== playerId) {
                // If it's a "new" message (not just loading history)
                if (messagesList.dataset.lastId !== lastMessage.id) {
                    playSound('message');
                    messagesList.dataset.lastId = lastMessage.id;
                }

                // Find the tab that matches the message's chatId
                const targetTab = Array.from(tabs).find(t => (t.dataset.chatMapping || t.dataset.chat) === lastMessage.chatId);
                if (targetTab && !targetTab.classList.contains('active')) {
                    targetTab.classList.add('pulse-new');
                }
            } else {
                messagesList.dataset.lastId = lastMessage.id;
            }
        }
    };

    const loadChat = (chatId) => {
        if (!chatId) {
            console.error('[CHAT] Tentativa de carregar chat com ID inválido');
            return;
        }

        if (unsubscribe) {
            console.log(`[CHAT] Encerrando listener anterior do chat`);
            unsubscribe();
        }
        
        currentChatId = chatId;
        console.log(`[CHAT] Aba ativa: ${currentChatId}`);
        
        messagesList.innerHTML = '<div class="loading-chat">Carregando mensagens...</div>';
        
        unsubscribe = listenToMessages(chatId, (msgs) => {
            console.log(`[CHAT] Mensagens recebidas para ${chatId}: ${msgs.length}`);
            renderMessages(msgs);
        }, (err) => {
            console.error(`[CHAT] Erro no listener de ${chatId}:`, err);
            messagesList.innerHTML = `
                <div class="empty-chat">
                    <span>⚠️</span>
                    <p>Erro ao carregar mensagens. Verifique os índices do Firestore no console.</p>
                </div>
            `;
        });
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        console.log(`[CHAT] Enviando mensagem para ${currentChatId}:`, text);
        const originalValue = input.value;
        input.value = '';
        
        try {
            await sendMessage(currentChatId, playerId, playerName, text);
            playSound('message');
            if (onMessageSent) onMessageSent();
        } catch (e) {
            console.error('[CHAT] Erro ao enviar mensagem:', e);
            input.value = originalValue;
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    };

    // Tabs logic
    if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const newChatId = tab.dataset.chatMapping || tab.dataset.chat;
                console.log(`[CHAT] Clique na aba: ${tab.textContent.trim()} -> ${newChatId}`);
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.remove('pulse-new');
                tab.classList.add('active');
                
                loadChat(newChatId);
            });
        });
    } else {
        console.warn('[CHAT] Nenhuma aba encontrada para configurar alternância');
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Initial Load
    loadChat(currentChatId);

    return {
        loadChat,
        destroy: () => {
            console.log('[CHAT] Destruindo chat');
            if (unsubscribe) unsubscribe();
        }
    };
}
