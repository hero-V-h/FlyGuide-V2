// Ask FlyGuide chat (Anthropic Messages API).

function initChat(){ applyPaywalls(); }

function appendMessage(role, text){
  var box = document.getElementById('chat-messages'), div = document.createElement('div');
  div.className = 'chat-message enter ' + role;
  var b = document.createElement('div'); b.className = 'chat-bubble ' + (role === 'user' ? 'user-bubble' : 'assistant-bubble');
  b.innerHTML = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'<br/><br/>').replace(/\n/g,'<br/>');
  div.appendChild(b); box.appendChild(div); box.scrollTop = box.scrollHeight; return b;
}

function showThinking() {
  var messagesEl = document.getElementById('chat-messages');
  var div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.id = 'chat-thinking-msg';
  div.innerHTML = '<div class="chat-thinking"><div class="chat-thinking-dot"></div><div class="chat-thinking-dot"></div><div class="chat-thinking-dot"></div><span>FlyGuide is thinking...</span></div>';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideThinking() {
  var el = document.getElementById('chat-thinking-msg');
  if (el) el.parentNode.removeChild(el);
}

function hideSuggestions() {
  var s = document.getElementById('chat-suggestions');
  if (s) s.style.display = 'none';
}

function sendSuggestion(btn) {
  var text = btn.textContent;
  document.getElementById('chat-input').value = text;
  sendChat();
}

function sendChat() {
  var input = document.getElementById('chat-input');
  var text = input.value.trim();
  if (!text) return;

  // Check API key is configured
  if (FLYGUIDE_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    appendMessage('assistant', 'The AI assistant is not yet configured. To activate it:\n\n1. Get a free API key at console.anthropic.com\n2. Open the FlyGuide HTML file in a text editor\n3. Find the line: FLYGUIDE_API_KEY = \'YOUR_ANTHROPIC_API_KEY_HERE\'\n4. Replace with your actual key\n5. Save and reopen\n\nOnce configured, I can answer any fly fishing question you have.');
    input.value = '';
    hideSuggestions();
    return;
  }

  input.value = '';
  hideSuggestions();

  // Add user message to UI and history
  appendMessage('user', text);
  chatHistory.push({role: 'user', content: text});

  // Disable send while waiting
  var sendBtn = document.getElementById('chat-send-btn');
  sendBtn.disabled = true;
  showThinking();

  // Build context from current app state
  var contextNote = '';
  try {
    var region = currentRegion ? REGIONS[currentRegion].name : 'Dullstroom';
    var season = document.getElementById('season') ? document.getElementById('season').value : '';
    var temp = document.getElementById('temp') ? document.getElementById('temp').value : '';
    if (region || season || temp) {
      contextNote = '\n\n[Current app context: Region=' + region + ', Season=' + season + ', Water temp=' + temp + 'C]';
    }
  } catch(e) {}

  // Build messages array for the API
  var messages = [];
  for (var i = 0; i < chatHistory.length - 1; i++) {
    messages.push(chatHistory[i]);
  }
  // Add context to the latest user message
  messages.push({
    role: 'user',
    content: text + contextNote
  });

  // Call Anthropic API
  // ── REPLACE THIS BLOCK with your backend call when going live ──
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.anthropic.com/v1/messages', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('x-api-key', FLYGUIDE_API_KEY);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-calls', 'true');

  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    hideThinking();
    sendBtn.disabled = false;

    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var reply = data.content && data.content[0] && data.content[0].text
          ? data.content[0].text
          : 'I received a response but could not read it. Please try again.';
        appendMessage('assistant', reply);
        chatHistory.push({role: 'assistant', content: reply});
        // Keep history to last 20 messages to manage token costs
        if (chatHistory.length > 20) {
          chatHistory = chatHistory.slice(chatHistory.length - 20);
        }
      } catch(e) {
        appendMessage('assistant', 'There was an error reading the response. Please try again.');
      }
    } else if (xhr.status === 401) {
      appendMessage('assistant', 'Your API key appears to be invalid. Please check your Anthropic API key at console.anthropic.com and update it in the FlyGuide file.');
    } else if (xhr.status === 429) {
      appendMessage('assistant', 'Too many requests — please wait a moment and try again. Your API usage limits have been reached briefly.');
    } else {
      var errMsg = 'Could not connect to the AI service (error ' + xhr.status + '). Please check your internet connection and try again.';
      try {
        var errData = JSON.parse(xhr.responseText);
        if (errData.error && errData.error.message) {
          errMsg = 'Error: ' + errData.error.message;
        }
      } catch(e) {}
      appendMessage('assistant', errMsg);
    }
  };

  xhr.onerror = function() {
    hideThinking();
    sendBtn.disabled = false;
    appendMessage('assistant', 'Could not connect to the AI service. Please check your internet connection and try again.');
  };

  xhr.send(JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: CHAT_SYSTEM_PROMPT,
    messages: messages
  }));
}
