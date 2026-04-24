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

    let currentChatId = initialChatId;
    let unsubscribe = null;

    const renderMessages = (messages) => {
        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="empty-chat"><span>💬</span><p>Sem mensagens ainda. Dê um oi!</p></div>';
            return;
        }

        const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 50;

        messagesList.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === playerId ? 'msg-me' : 'msg-other'}">
                <span class="message-sender">${msg.senderName}</span>
                <p>${msg.text}</p>
                <span class="message-time">${msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
        `).join('');
        
        if (isAtBottom) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }

        // Pulse tab if not active and new message comes
        if (messages.length > 0 && tabs) {
            const lastMsg = messages[messages.length - 1];
            // Only pulse if the message came from someone else
            if (lastMsg.senderId !== playerId) {
                // Find the tab that matches the message's chatId
                const targetTab = Array.from(tabs).find(t => (t.dataset.chatMapping || t.dataset.chat) === lastMsg.chatId);
                if (targetTab && !targetTab.classList.contains('active')) {
                    targetTab.classList.add('pulse-new');
                }
            }
        }
    };

    const loadChat = (chatId) => {
        if (unsubscribe) unsubscribe();
        currentChatId = chatId;
        console.log(`[Chat] Carregando chat: ${chatId}`);
        unsubscribe = listenToMessages(chatId, (msgs) => {
            console.log(`[Chat] Recebidas ${msgs.length} mensagens para ${chatId}`);
            renderMessages(msgs);
        });
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        const originalValue = input.value;
        input.value = '';
        try {
            await sendMessage(currentChatId, playerId, playerName, text);
            playSound('message');
            if (onMessageSent) onMessageSent();
        } catch (e) {
            console.error('[Chat] Erro ao enviar mensagem:', e);
            input.value = originalValue;
            alert('Erro ao enviar mensagem. Verifique sua conexão.');
        }
    };

    // Event Listeners
    if (tabs) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.remove('pulse-new');
                tab.classList.add('active');
                
                // Logic for mapping tab to chatId should be external if complex, 
                // but let's assume tab has a data attribute.
                const newChatId = tab.dataset.chatMapping || tab.dataset.chat;
                loadChat(newChatId);
            });
        });
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Initial Load
    loadChat(currentChatId);

    console.log(`[Chat] Chat inicializado para ${playerId}`);

    return {
        loadChat,
        destroy: () => unsubscribe && unsubscribe()
    };
}
