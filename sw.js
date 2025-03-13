// sw.js
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const title = data.title;
    const options = {
        body: data.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png', // Optional: Add an icon
    };

    event.waitUntil(self.registration.showNotification(title, options));
});