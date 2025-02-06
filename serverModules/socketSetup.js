const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');

module.exports = function (server) {
    const io = socketIo(server);
    const filePath = path.join(__dirname, '..', 'public', 'index.html');

    // Watch for changes in the HTML file
    fs.watch(filePath, { persistent: true }, (eventType, filename) => {
        if (eventType === 'change') {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading index.html:', err);
                    return;
                }

                const bodyMatch = data.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                const bodyContent = bodyMatch ? bodyMatch[1] : null;

                if (bodyContent) {
                    io.emit('bodyContent', { content: bodyContent });
                } else {
                    console.warn('No <body> content found in index.html');
                }
            });
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('log', (data) => {
            if (!data || !data.type || !Array.isArray(data.args)) {
                console.warn('Invalid log data received:', data);
                return;
            }

            if (data.type === 'log') {
                console.log('Client log:', ...data.args);
            } else if (data.type === 'error') {
                console.error('Client error:', ...data.args);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.id} disconnected:`, reason);
        });

        socket.on('error', (error) => {
            console.error(`Socket error from ${socket.id}:`, error);
        });
    });

    console.log('Socket.io setup complete.');
};
