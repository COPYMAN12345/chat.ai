// ================== P2P Chat and Video Call Functions ==================

// Get DOM elements for P2P chat and video call
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
let localStream = null; // Initialize localStream as null
let currentCall;
let username; // Variable to store the username
let isMuted = false; // Track mute state
let isVideoPaused = false; // Track video pause state

// Function to generate a Peer ID based on the current time (HHMM format)
const generatePeerIdFromTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0'); // Ensure 2 digits
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure 2 digits
    return hours + minutes; // Combine to form HHMM
};

// Function to initialize PeerJS with a custom ID
const initializePeer = (customId) => {
    peer = new Peer(customId);

    peer.on('open', (id) => {
        console.log('PeerJS connection opened. My peer ID is:', id);
        peerIdDisplay.textContent = 'Your Peer ID: ' + id; // Display Peer ID on the page
    });

    peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        alert('An error occurred with PeerJS. Please check the console for details.');
    });

    peer.on('connection', (connection) => {
        conn = connection;
        conn.on('open', () => {
            conn.send({ username: 'System', message: 'Connected to ' + username });
            appendMessage('Connected to ' + conn.peer, 'system');
        });
        conn.on('data', (data) => {
            // Display the received message with the sender's username
            appendMessage(data.username + ': ' + data.message, data.username === 'System' ? 'system' : 'remote');
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

// Generate Peer ID from current time
const customId = generatePeerIdFromTime();

// Prompt for username, default to "bot1" if not provided
username = prompt('Enter your username (e.g., Alice):') || 'bot1';

// Initialize PeerJS with the generated Peer ID
initializePeer(customId);

// Connect to another peer
connectButton.addEventListener('click', () => {
    const peerId = peerIdInput.value;
    if (!peerId) return alert('Please enter a Peer ID');
    conn = peer.connect(peerId);
    conn.on('open', () => {
        conn.send({ username: 'System', message: 'Connected to ' + username });
        appendMessage('Connected to ' + peerId, 'system');
    });
    conn.on('data', (data) => {
        appendMessage(data.username + ': ' + data.message, data.username === 'System' ? 'system' : 'remote');
    });
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

// ================== QR Code Scanner Functions ==================

document.getElementById("scan-btn").addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            const qrVideo = document.getElementById("qr-video");
            qrVideo.srcObject = stream;
            qrVideo.play();
            requestAnimationFrame(scanQR);
        })
        .catch(err => {
            console.error("Error accessing the camera: ", err);
            alert("Error accessing the camera. Please ensure you have granted camera permissions.");
        });
});

function scanQR() {
    const qrVideo = document.getElementById("qr-video");
    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement("canvas");
        canvas.width = qrVideo.videoWidth;
        canvas.height = qrVideo.videoHeight;
        const context = canvas.getContext("2d");
        context.drawImage(qrVideo, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            document.getElementById("encryptedMessageInput").value = code.data;
            qrVideo.srcObject.getTracks().forEach(track => track.stop());
        } else {
            requestAnimationFrame(scanQR);
        }
    } else {
        requestAnimationFrame(scanQR);
    }
}

document.getElementById("upload-btn").addEventListener("click", () => {
    document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const context = canvas.getContext("2d");
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    document.getElementById("encryptedMessageInput").value = code.data;
                } else {
                    alert("No QR code found in the uploaded image.");
                }
            };
        };
        reader.readAsDataURL(file);
    }
});
