// server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');

// Create Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let predictionsData = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        predictionsData.push(data);

        // Broadcast metrics to all clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(predictionsData));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Serve static files (client side)
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
