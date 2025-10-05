// public/js/chatbot.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Create Chat Widget HTML ---
    const chatWidgetHTML = `
        <div id="chatbot-icon" class="chatbot-icon">🚀</div>
        <div id="chatbot-panel" class="chatbot-panel">
            <div class="chat-header">
                Cosmo - Your Space Assistant
                <button id="chatbot-close" class="chatbot-close-btn">&times;</button>
            </div>
            <div id="chatbot-body" class="chat-body">
                <div class="message bot">Hello! I'm Cosmo. Ask me anything about space!</div>
            </div>
            <div class="chat-footer">
                <input id="chatbot-input" type="text" placeholder="Ask a question...">
                <button id="chatbot-send" class="chatbot-send-btn">Send</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatWidgetHTML);

    // --- Get DOM Elements ---
    const chatIcon = document.getElementById('chatbot-icon');
    const chatPanel = document.getElementById('chatbot-panel');
    const chatCloseBtn = document.getElementById('chatbot-close');
    const chatBody = document.getElementById('chatbot-body');
    const chatInput = document.getElementById('chatbot-input');
    const chatSendBtn = document.getElementById('chatbot-send');

    // --- Event Listeners ---
    chatIcon.addEventListener('click', () => chatPanel.classList.toggle('open'));
    chatCloseBtn.addEventListener('click', () => chatPanel.classList.remove('open'));
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // --- Functions ---
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    async function sendMessage() {
        const messageText = chatInput.value.trim();
        if (!messageText) return;

        appendMessage('user', messageText);
        chatInput.value = '';
        
        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message', 'bot', 'thinking');
        thinkingMessage.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        chatBody.appendChild(thinkingMessage);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText })
            });
            
            chatBody.removeChild(thinkingMessage);

            // Try to parse JSON; if that fails, fall back to raw text (HTML/error pages)
            let data = null;
            try {
                data = await response.json();
            } catch (parseErr) {
                const text = await response.text();
                // If server returned non-JSON and it was an error page, notify the user
                if (!response.ok) {
                    const short = (text || response.statusText || '').toString().slice(0, 1000);
                    throw new Error(`Server returned an error (${response.status}): ${short}`);
                }
                // If it's OK but non-JSON, treat the body as the reply text
                appendMessage('bot', text || response.statusText || 'No reply');
                return;
            }

            if (!response.ok) {
                throw new Error((data && (data.error || data.message)) || 'Unknown error');
            }

            // If reply field not present, try to show a reasonable fallback
            const reply = (data && (data.reply || data.output || data.text)) || '';
            appendMessage('bot', reply || 'No reply from server');

        } catch (error) {
            appendMessage('bot', `Sorry, an error occurred: ${error.message}`);
        }
    }
});