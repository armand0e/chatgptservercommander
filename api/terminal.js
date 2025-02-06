const { spawn, appendFileSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const logFile = 'terminal_log.log';
const path = require('path');

// Create a persistent shell using cmd.exe instead of WSL
let shell;
let allOutput = '';
try {
    shell = os.platform() === 'win32' ? spawn('cmd.exe', [], { stdio: ['pipe', 'pipe', 'pipe'] }) : spawn(os.userInfo().shell || '/bin/bash', [], { stdio: ['pipe', 'pipe', 'pipe'] });

    shell.stdout.on('data', (data) => {
        allOutput += data.toString();
        fs.appendFileSync(logFile, `[OUTPUT] ${data.toString()}`);
    });

    shell.stderr.on('data', (data) => {
        fs.appendFileSync(logFile, `[ERROR] ${data.toString()}`);
    });

    shell.on('error', (err) => {
        console.error('Failed to start shell:', err);
        fs.appendFileSync(logFile, `[ERROR] Failed to start shell: ${err.message}\n`);
        shell = spawn('cmd.exe', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    });

    shell.on('exit', (code, signal) => {
        console.log(`Shell exited with code ${code} and signal ${signal}`);
        fs.appendFileSync(logFile, `[EXIT] Shell exited with code ${code} and signal ${signal}\n`);
    });

} catch (e) {
    console.error('Error spawning shell:', e);
    fs.appendFileSync(logFile, `[ERROR] Error spawning shell: ${e.message}\n`);
    shell = spawn('cmd.exe', [], { stdio: ['pipe', 'pipe', 'pipe'] });
}
const delimiter = 'COMMAND_FINISHED_DELIMITER';
let output = '';

function runShellCommand(command, args = [], callback) {
    console.log('Executing command:', command);
    fs.appendFileSync(logFile, `[INPUT] ${command} ${args.join(' ')}\n`);
    shell.stdin.write(`${command} ${args.join(' ')} & echo ${delimiter}\n`);
    
    const getOutput = (data) => {
        output += data.toString();
        fs.appendFileSync(logFile, `[OUTPUT] ${data.toString()}`);
        if (output.includes(delimiter)) {
            output = output.replace(delimiter, '');
            processOutput(output);
            output = '';
        }
    };
    
    shell.stdout.on('data', getOutput);
    const getError = (data) => {
        output += data;
        fs.appendFileSync(logFile, `[ERROR] ${data.toString()}`);
    };
    shell.stderr.on('data', getError);

    function processOutput(output) {
        console.log(`Command executed successfully. Output: ${output}`);
        fs.appendFileSync(logFile, `[SUCCESS] ${output}\n`);
        shell.stdout.removeListener('data', getOutput);
        shell.stderr.removeListener('data', getError);
        callback({ output });
    }
}

function interruptHandler(req, res) {
    if (req.method === "POST") {
        shell.kill();
        console.log("Sent SIGKILL to terminate the command.");
        fs.appendFileSync(logFile, `[INFO] Sent SIGKILL to terminate command\n`);
        shell = spawn('cmd.exe', [], { stdio: ['pipe', 'pipe', 'pipe'] });
        res.status(200).json({ message: "Command interrupted.", output });
        output = "";
    } else {
        res.status(405).json({ message: "Method not allowed. Please use POST." });
    }
}

function getCurrentDirectory() {
    return new Promise((resolve, reject) => {
        shell.stdin.write("cd\n");
        shell.stdout.once('data', (data) => {
            fs.appendFileSync(logFile, `[OUTPUT] Current Directory: ${data.toString().trim()}\n`);
            resolve(data.toString().trim());
        });
        shell.stderr.once('data', (data) => {
            fs.appendFileSync(logFile, `[ERROR] ${data.toString().trim()}\n`);
            reject(new Error(data.toString().trim()));
        });
    });
}
function writeFileWithPython(filePath, content, callback) {
    const pythonExecutable = "python"; // Use "python3" if needed
    const scriptPath = path.join(__dirname, "../utils/file_writer.py");  // ✅ Updated path
    
    const absoluteFilePath = path.resolve(filePath);
    const process = spawn(pythonExecutable, [scriptPath, absoluteFilePath, content]);
    
    let output = "";
    let error = "";

    process.stdout.on("data", (data) => {
        output += data.toString();
    });

    process.stderr.on("data", (data) => {
        error += data.toString();
    });

    process.on("close", (code) => {
        if (code === 0) {
            callback(null, output);
        } else {
            callback(error || "Unknown error occurred.");
        }
    });
}

module.exports = {
    runShellCommand,
    interruptHandler,
    getCurrentDirectory,
    writeFileWithPython,
};
