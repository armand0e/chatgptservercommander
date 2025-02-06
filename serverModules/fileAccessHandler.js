const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { log } = require("../serverModules/logger");
const simpleGit = require("simple-git");

const tokenStorePath = path.join(__dirname, "../tokenStore.json");

// Function to read the token store
const readTokenStore = () => {
    if (fs.existsSync(tokenStorePath)) {
        try {
            return JSON.parse(fs.readFileSync(tokenStorePath, "utf8"));
        } catch (err) {
            log("Error reading token store:", err);
            return {};
        }
    }
    return {};
};

// Function to write to the token store
const writeToTokenStore = (tokenStore) => {
    try {
        fs.writeFileSync(tokenStorePath, JSON.stringify(tokenStore, null, 2), "utf8");
    } catch (err) {
        log("Error writing to token store:", err);
    }
};

module.exports.createToken = (getURL, filePath) => {
    const tokenStore = readTokenStore();
    let token = "";
    let existingTokenFound = false;

    // Normalize file path for consistency
    filePath = path.resolve(filePath);

    // Check for an existing valid token
    Object.keys(tokenStore).forEach((existingToken) => {
        const tokenInfo = tokenStore[existingToken];
        if (tokenInfo.filePath === filePath && new Date(tokenInfo.expiryDate) > new Date()) {
            // Extend the existing token's expiry date
            tokenInfo.expiryDate = new Date(Date.now() + 600000);
            token = existingToken;
            existingTokenFound = true;
        }
    });

    if (!existingTokenFound) {
        token = crypto.randomBytes(20).toString("hex");
        tokenStore[token] = { filePath, expiryDate: new Date(Date.now() + 600000) };
    }

    // Remove expired tokens
    Object.keys(tokenStore).forEach((token) => {
        if (new Date(tokenStore[token].expiryDate) < new Date()) {
            delete tokenStore[token];
        }
    });

    writeToTokenStore(tokenStore);

    const serverUrl = getURL(); // Gets the base server URL
    const accessUrl = `${serverUrl}/access/${token}`; // Constructs the file access URL
    log("Created URL:", accessUrl);
    return accessUrl;
};

module.exports.retrieveFile = async (req, res) => {
    const { token } = req.params;
    const tokenStore = readTokenStore();

    if (!tokenStore[token]) {
        return res.status(404).send("Token not found or has expired.");
    }

    const tokenInfo = tokenStore[token];

    if (new Date(tokenInfo.expiryDate) < new Date()) {
        delete tokenStore[token];
        writeToTokenStore(tokenStore);
        return res.status(410).send("Token has expired.");
    }

    const filePath = path.resolve(tokenInfo.filePath);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found.");
    }

    if (req.query.diff) {
        const git = simpleGit();
        try {
            const diffOutput = await git.diff(["--", filePath]);

            const safeDiffOutput = Buffer.from(diffOutput).toString("base64");

            const htmlDiff = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Git Diff</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
                    <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html.min.js"></script>
                </head>
                <body>
                    <div id="diff"></div>
                    <script>
                        document.addEventListener('DOMContentLoaded', function () {
                            const diffHtml = Diff2Html.html(atob("${safeDiffOutput}"), {
                                inputFormat: "diff",
                                showFiles: true,
                                matching: "lines"
                            });
                            document.getElementById('diff').innerHTML = diffHtml;
                        });
                    </script>
                </body>
                </html>`;

            res.send(htmlDiff);
        } catch (error) {
            log("Error fetching Git diff:", error);
            res.status(500).send("Error fetching Git diff: " + error.message);
        }
    } else {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                log("Failed to read file:", err);
                return res.status(500).send("Failed to read the file.");
            }
            res.setHeader("Content-Type", "text/plain");
            res.send(data);
        });
    }
};
