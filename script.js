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
        // Save the Peer ID to local storage
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

// ================== AES Encryption Functions ==================

async function generateKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptMessage(message, password, timeLimitMinutes) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM

    const key = await generateKey(password, salt);

    const timestamp = Math.floor(Date.now() / 1000);
    const messageWithTimestamp = `${timestamp}:${timeLimitMinutes}:${message}`;

    const encodedMessage = new TextEncoder().encode(messageWithTimestamp);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedMessage
    );

    const encryptedMessage = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
    return btoa(String.fromCharCode(...encryptedMessage));
}

document.getElementById("encryptBtn").addEventListener("click", async () => {
    const message = document.getElementById("message").value;
    const password = document.getElementById("password").value;
    const timeLimit = document.getElementById("timeLimit").value;

    if (!message || !password || !timeLimit) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const encryptedMessage = await encryptMessage(message, password, timeLimit);
        document.getElementById("encryptedMessage").value = encryptedMessage;

        // Auto-fill the encrypted message into the P2P chat input box
        document.getElementById("messageInput").value = encryptedMessage;

        // Generate QR Code
        const qrcodeContainer = document.getElementById("qrcode");
        qrcodeContainer.innerHTML = ""; // Clear previous QR code
        new QRCode(qrcodeContainer, {
            text: encryptedMessage,
            width: 256,
            height: 256,
        });

        // Add double-click event listener to the QR code container
        qrcodeContainer.addEventListener("dblclick", () => {
            navigator.clipboard.writeText(encryptedMessage)
                .then(() => {
                    alert("Encrypted message copied to clipboard!");
                })
                .catch((err) => {
                    console.error("Failed to copy encrypted message:", err);
                    alert("Failed to copy encrypted message. Please try again.");
                });
        });

    } catch (error) {
        console.error("Encryption failed:", error);
        alert("Encryption failed. Please try again.");
    }
});

// ================== AES Decryption Functions ==================

async function decryptMessage(encryptedMessage, password) {
    try {
        const data = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28); // 12 bytes for AES-GCM
        const encryptedData = data.slice(28);

        const key = await generateKey(password, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
        );

        const decryptedMessage = new TextDecoder().decode(decrypted);
        const [timestampStr, timeLimitStr, message] = decryptedMessage.split(":", 3);

        const timestamp = parseInt(timestampStr, 10);
        const timeLimitMinutes = parseInt(timeLimitStr, 10);

        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime - timestamp > timeLimitMinutes * 60) {
            throw new Error("The message is older than the specified time limit and is no longer valid.");
        }

        return message;
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Decryption failed. The message may be invalid or expired.");
    }
}

document.getElementById("decryptBtn").addEventListener("click", async () => {
    const encryptedMessage = document.getElementById("encryptedMessageInput").value;
    const password = document.getElementById("decryptionPassword").value;

    if (!encryptedMessage || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const decryptedMessage = await decryptMessage(encryptedMessage, password);
        document.getElementById("decryptedMessage").value = decryptedMessage;
    } catch (error) {
        console.error("Decryption failed:", error);
        alert("Decryption failed. The message may be invalid or expired.");
    }
});

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
