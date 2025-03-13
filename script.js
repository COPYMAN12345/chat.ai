// Get DOM elements
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const peerIdInput = document.getElementById('peerIdInput');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const callButton = document.getElementById('callButton');
const endCallButton = document.getElementById('endCallButton');
const muteButton = document.getElementById('muteButton');
const pauseVideoButton = document.getElementById('pauseVideoButton');
const clearChatButton = document.getElementById('clearChatButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const peerIdDisplay = document.getElementById('peerIdDisplay');

let peer;
let conn;
let localStream = null;
let currentCall;
let username;
let isMuted = false;
let isVideoPaused = false;

// Function to request notification permissions
const requestNotificationPermission = () => {
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted.");
            }
        });
    }
};

// Function to show a notification
const showNotification = (title, message) => {
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: "https://cdn-icons-png.flaticon.com/512/733/733585.png" // Optional: Add an icon
        });
    } else {
        console.warn("Notification permission not granted.");
    }
};

// Function to generate a Peer ID based on the current time (HHMM format)
const generatePeerIdFromTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return hours + minutes;
};

// Function to initialize PeerJS with a custom ID
const initializePeer = (customId) => {
    peer = new Peer(customId);

    peer.on('open', (id) => {
        console.log('PeerJS connection opened. My peer ID is:', id);
        peerIdDisplay.textContent = 'Your Peer ID: ' + id;
        localStorage.setItem('peerId', id);

        // Auto-connect to a peer if a peer ID is stored in local storage
        const storedPeerId = localStorage.getItem('connectedPeerId');
        if (storedPeerId) {
            connectToPeer(storedPeerId);
        }
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        alert('An error occurred with PeerJS. Please check the console for details.');
    });

    peer.on('connection', (connection) => {
        conn = connection;
        conn.on('open', () => {
            // Notify the other peer that this user is online
            conn.send({ username: 'System', message: `${username} is online` });
            appendMessage(`${conn.peer} is online`, 'system');

            // Save the connected peer ID to local storage
            localStorage.setItem('connectedPeerId', conn.peer);

            // Show a Chrome notification when a friend comes online
            showNotification("Friend Online", `${conn.peer} is now online!`);
        });
        conn.on('data', (data) => {
            // Display the received message with the sender's username
            appendMessage(data.username + ': ' + data.message, data.username === 'System' ? 'system' : 'remote');
        });
        conn.on('close', () => {
            // Notify when the peer disconnects
            appendMessage(`${conn.peer} is offline`, 'system');
            // Remove the connected peer ID from local storage
            localStorage.removeItem('connectedPeerId');

            // Show a Chrome notification when a friend goes offline
            showNotification("Friend Offline", `${conn.peer} is now offline.`);
        });
    });

    peer.on('call', (call) => {
        if (localStream) {
            call.answer(localStream);
            call.on('stream', (remoteStream) => {
                remoteVideo.srcObject = remoteStream;
            });
            currentCall = call;
        } else {
            call.close();
            alert('Cannot accept video call: Camera and microphone access denied.');
        }
    });
};

// Function to connect to a peer
const connectToPeer = (peerId) => {
    if (!peerId) return alert('Please enter a Peer ID');
    conn = peer.connect(peerId);
    conn.on('open', () => {
        // Notify the other peer that this user is online
        conn.send({ username: 'System', message: `${username} is online` });
        appendMessage(`Connected to ${peerId}`, 'system');
        // Save the connected peer ID to local storage
        localStorage.setItem('connectedPeerId', peerId);
    });
    conn.on('data', (data) => {
        appendMessage(data.username + ': ' + data.message, data.username === 'System' ? 'system' : 'remote');
    });
    conn.on('close', () => {
        // Notify when the peer disconnects
        appendMessage(`${peerId} is offline`, 'system');
        // Remove the connected peer ID from local storage
        localStorage.removeItem('connectedPeerId');
    });
};

// Check if a Peer ID is already stored in local storage
let customId = localStorage.getItem('peerId');

// If no Peer ID is stored, generate one based on the current time
if (!customId) {
    customId = generatePeerIdFromTime();
}

// Prompt for username, default to "bot1" if not provided
username = prompt('Enter your username (e.g., Alice):') || 'bot1';

// Initialize PeerJS with the generated or stored Peer ID
initializePeer(customId);

// Request notification permissions when the page loads
requestNotificationPermission();

// Connect to another peer
connectButton.addEventListener('click', () => {
    const peerId = peerIdInput.value;
    connectToPeer(peerId);
});

// Send a message
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (!message) return;
    if (conn && conn.open) {
        conn.send({ username: username, message: message });
        appendMessage(username + ': ' + message, 'local');
        messageInput.value = '';
    } else {
        alert('Not connected to any peer.');
    }
});

// Disconnect from the current peer
disconnectButton.addEventListener('click', () => {
    if (conn) {
        conn.close();
        appendMessage('Disconnected', 'system');
        conn = null;
    }
});

// Start a video call
callButton.addEventListener('click', async () => {
    if (!conn) return alert('Not connected to any peer.');
    const permissionsGranted = await requestMediaPermissions();
    if (!permissionsGranted) return; // Stop if permissions are denied
    const peerId = conn.peer;
    const call = peer.call(peerId, localStream);
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
    });
    currentCall = call;
});

// End the video call
endCallButton.addEventListener('click', () => {
    if (currentCall) {
        currentCall.close();
        remoteVideo.srcObject = null;
    }
});

// Mute/Unmute audio
muteButton.addEventListener('click', () => {
    if (localStream) {
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
        muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
    }
});

// Pause/Resume video
pauseVideoButton.addEventListener('click', () => {
    if (localStream) {
        isVideoPaused = !isVideoPaused;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !isVideoPaused;
        });
        pauseVideoButton.textContent = isVideoPaused ? 'Resume Video' : 'Pause Video';
    }
});

// Clear chat
clearChatButton.addEventListener('click', () => {
    chatBox.innerHTML = '';
});

// Append a message to the chat box
const appendMessage = (message, type) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    const colonIndex = message.indexOf(':');
    const usernamePart = message.substring(0, colonIndex + 1);
    const messagePart = message.substring(colonIndex + 1);
    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = usernamePart;
    usernameSpan.classList.add('username');
    const messageSpan = document.createElement('span');
    messageSpan.textContent = messagePart;
    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(messageSpan);
    if (type === 'local') {
        messageElement.classList.add('local');
    } else if (type === 'remote') {
        messageElement.classList.add('remote');
    } else if (type === 'system') {
        messageElement.classList.add('system');
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to request camera and microphone access
const requestMediaPermissions = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
        localStream = stream;
        console.log('Camera and microphone access granted.');
        return true; // Permissions granted
    } catch (error) {
        console.warn('Camera and microphone access denied:', error);
        alert('Camera and microphone access denied. You cannot start a video call.');
        return false; // Permissions denied
    }
};
