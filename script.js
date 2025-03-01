// Connect to the server
const socket = io();

// Get DOM elements
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

// Listen for chat messages from the server
socket.on('chat message', (msg) => {
    const item = document.createElement('div');
    item.textContent = msg;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Auto-scroll to the latest message
});

// Send a chat message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value); // Send the message to the server
        input.value = ''; // Clear the input field
    }
});