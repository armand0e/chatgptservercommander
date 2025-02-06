const { spawn } = require('child_process');
const fs = require('fs');

function checkPythonFile(filePath) {
    return new Promise((resolve) => {
        if (!fs.existsSync(filePath)) {
            return resolve([{ message: "File does not exist." }]);
        }

        const pythonProcess = spawn('python', ['-m', 'py_compile', filePath]);

        let errorOutput = '';
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve([]); // No syntax errors
            } else {
                resolve([{ message: errorOutput.trim() }]); // Return syntax error messages
            }
        });
    });
}

module.exports = { checkPythonFile };
