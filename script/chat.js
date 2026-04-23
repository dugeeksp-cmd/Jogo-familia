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

        messagesList.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === playerId ? 'msg-me' : 'msg-other'}">
                <span class="message-sender">${msg.senderName}</span>
                <p>${msg.text}</p>
                <span class="message-time">${msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
        `).join('');
        
        messagesList.scrollTop = messagesList.scrollHeight;
    };

    const loadChat = (chatId) => {
        if (unsubscribe) unsubscribe();
        currentChatId = chatId;
        unsubscribe = listenToMessages(chatId, renderMessages);
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        input.value = '';
        await sendMessage(currentChatId, playerId, playerName, text);
        playSound('message');
        if (onMessageSent) onMessageSent();
    };

    // Event Listeners
    if (tabs) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
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

    return {
        loadChat,
        destroy: () => unsubscribe && unsubscribe()
    };
}
