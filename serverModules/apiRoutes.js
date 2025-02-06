const { terminalHandler, interruptHandler } = require('../api/terminal');
const exitApplicationHandler = require('../api/exitApplicationHandler');
const { initDB } = require("./firebaseDB");
const { getCurrentDirectory, runShellCommand } = require('../api/terminal');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'terminal_log.log');

module.exports = {
    addApi: (app, config, getURL, close) => {
        // Logging middleware to log request and response details
        app.use((req, res, next) => {
            const originalSend = res.send;
            console.log(`Request to ${req.path}:`);
            console.log('Query Params:', req.query);
            console.log('Body:', req.body);

            res.send = function(data) {
                console.log(`Response from ${req.path}:`);
                console.log('Response:', data);
                originalSend.call(this, data);
            };

            next();
        });

        const readEditTextFileHandler = require('../api/readEditTextFile2Handler')(getURL);

        /** 
         * @openapi
         * /api/runTerminalScript:
         *   post:
         *     summary: Execute a shell command.
         *     description: Runs a command in the persistent terminal session.
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               command:
         *                 type: string
         *                 description: The shell command to execute.
         *     responses:
         *       200:
         *         description: Command executed successfully.
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 output:
         *                   type: string
         *       400:
         *         description: Bad request (e.g., missing command parameter).
         *       500:
         *         description: Server error while executing command.
         */
        app.post('/api/runTerminalScript', (req, res) => {
            const { command } = req.body;
            if (!command) {
                console.error("[ERROR] Missing command parameter in /api/runTerminalScript");
                return res.status(400).json({ message: 'Command parameter is required.' });
            }
        
            console.log(`[INPUT] Executing: ${command}`);
            runShellCommand(command, [], (result) => {
                if (!result || typeof result.output !== 'string' || result.output.trim() === '') {
                    console.error("[ERROR] Command execution failed or returned no output.");
                    return res.status(500).json({ message: "Command execution failed or returned no output." });
                }
                res.status(200).json({ output: result.output });
            });
        });
        

        /**
         * @openapi
         * /api/getTerminalLogs:
         *   get:
         *     summary: Retrieve terminal logs.
         *     description: Fetches the recent output from the terminal log file.
         *     responses:
         *       200:
         *         description: Log file content retrieved successfully.
         *         content:
         *           text/plain:
         *             schema:
         *               type: string
         *       500:
         *         description: Server error retrieving logs.
         */
        app.get('/api/getTerminalLogs', (req, res) => {
            const MAX_LINES = 100; // Limit to the last 100 lines
        
            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`[ERROR] Failed to read log file: ${err.message}`);
                    return res.status(500).json({ message: "Error reading log file", error: err.message });
                }
        
                const lines = data.split('\n');
                const lastLines = lines.slice(-MAX_LINES).join('\n'); // Get last 100 lines
                res.type('text/plain').send(lastLines);
            });
        });
        

        // API for retrieving the current working directory
        app.get('/api/getCurrentDirectory', async (req, res) => {
            try {
                const directory = await getCurrentDirectory();
                console.log(`[INFO] Current Directory: ${directory}`);
                res.status(200).json({ directory });
            } catch (error) {
                console.error(`[ERROR] Failed to get current directory: ${error.message}`);
                res.status(500).json({ message: 'Error retrieving directory', error: error.message });
            }
        });

        // File Handling (Ensures Python is Used for Writing)
        app.post('/api/read-or-edit-file', readEditTextFileHandler);
        app.get('/api/read-or-edit-file', readEditTextFileHandler);

        // Logs & Server Info
        app.get('/api/server-url', require('../api/getServerUrlHandler')(getURL));
        app.get('/api/logs', require('../api/getLogsHandler'));

        // Restart and Interrupt APIs
        app.post('/api/restart', exitApplicationHandler(close));
        app.post("/api/interrupt", interruptHandler);
    }
};
