const fs = require('fs');
const { checkJavaScriptFile } = require('../serverModules/checkjs');
const { checkPythonFile } = require('../serverModules/checkPythonFile');
const beautify = require('js-beautify').js;
const { stringifyError } = require("../serverModules/stringifyError");
const { log } = require("../serverModules/logger");
const { createToken } = require("../serverModules/fileAccessHandler");
const { getCurrentDirectory, writeFileWithPython } = require("./terminal");
const { mergeText, parseConflicts } = require('../serverModules/fileEdit');
const path = require('node:path');

const replaceTextInSection = async (filePath, replacements) => {
    let fileContent = '';

    if ((!replacements || replacements.length === 0) && !fs.existsSync(filePath)) {
        throw new Error('File does not exist, if you want to create it ask for initial content and try again.');
    }

    try {
        fileContent = await fs.promises.readFile(filePath, 'utf8');
    } catch (err) {
        log('Error reading file:', err);
    }

    const result = await mergeText(fileContent, replacements);

    // Ensure newlines and tabs are correctly interpreted
    const properlyFormattedContent = result.updatedContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    return new Promise((resolve, reject) => {
        writeFileWithPython(filePath, properlyFormattedContent, (err, successMessage) => {
            if (err) {
                reject(new Error(`Python file writer failed: ${err}`));
            } else {
                log(successMessage);
                resolve(result);
            }
        });
    });
};

const readEditTextFileHandler = (getURL) => async (req, res) => {
    let filePath;
    let body = {};

    if (req.method === 'GET') {
        filePath = req.query.filePath;
        body = { filePath };
    } else if (req.method === 'POST') {
        filePath = req.body.filePath;
        body = req.body;
    }

    const currentDir = await getCurrentDirectory();
    filePath = path.resolve(currentDir, filePath);

    let replaceResult;

    try {
        let replacements;
        if (body.mergeText) {
            replacements = parseConflicts(body.mergeText);
            if (replacements.length === 0 && body.mergeText.length > 0) {
                throw new Error('mergeText contains no valid conflict blocks.');
            }
        } else {
            replacements = body.replacements || (body.replacement && [body.replacement]) || [];
        }

        replaceResult = await replaceTextInSection(filePath, replacements);

        const url = createToken(getURL, filePath);
        let responseMessage = `File url: ${url}\nChanged diff url: ${createToken(getURL, filePath)}?diff=1`;

        if (replaceResult.fuzzyReplacements.length > 0) {
            responseMessage += `\nFuzzy replacements: ${replaceResult.fuzzyReplacements.join('\n')}`;
        }

        // **JavaScript Validation Before Writing**
        if (filePath.endsWith('.js')) {
            let issues = await checkJavaScriptFile(filePath);
            if (issues.length > 0) {
                responseMessage += `\nJavaScript Syntax Error: ${JSON.stringify(issues)}`;
                log('responseMessage', responseMessage);
                res.status(400).send(responseMessage);
                return;
            }
        }

        // **Write File Using Python Helper**
        await new Promise((resolve, reject) => {
            writeFileWithPython(filePath, replaceResult.updatedContent, (err, successMessage) => {
                if (err) {
                    reject(new Error(`Python file writer failed: ${err}`));
                } else {
                    log(successMessage);
                    resolve();
                }
            });
        });

        // **Format JavaScript Files After Writing**
        if (filePath.endsWith('.js')) {
            const beautifiedContent = beautify(replaceResult.updatedContent, { indent_size: 2 });
            await new Promise((resolve, reject) => {
                writeFileWithPython(filePath, beautifiedContent, (err, successMessage) => {
                    if (err) {
                        reject(new Error(`Python file writer failed: ${err}`));
                    } else {
                        log(successMessage);
                        resolve();
                    }
                });
            });
            responseMessage += `\nBeautified content:\n${beautifiedContent}`;
        } else {
            responseMessage += `\nFile content:\n${replaceResult.updatedContent}`;
        }

        res.type('text/plain').send(responseMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: stringifyError(error) });
    }
};

module.exports = readEditTextFileHandler;
