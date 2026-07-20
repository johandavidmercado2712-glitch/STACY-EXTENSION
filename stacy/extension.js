const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

/**
 * Helper to get the access token from VS Code's secure SecretStorage.
 * @param {vscode.ExtensionContext} context 
 * @returns {Promise<string|undefined>}
 */
async function getAccessToken(context) {
    return await context.secrets.get('stacy.token');
}

/**
 * Helper to store or delete the access token in VS Code's secure SecretStorage.
 * @param {vscode.ExtensionContext} context 
 * @param {string|undefined} token 
 */
async function setAccessToken(context, token) {
    if (token) {
        await context.secrets.store('stacy.token', token);
    } else {
        await context.secrets.delete('stacy.token');
    }
}

/**
 * Cleans zsh history timestamps if present.
 * @param {string} line 
 * @returns {string}
 */
function cleanZshLine(line) {
    if (!line) return "";
    if (line.startsWith(": ")) {
        const idx = line.indexOf(";");
        if (idx !== -1) {
            return line.substring(idx + 1).trim();
        }
    }
    return line.trim();
}

/**
 * Reads local terminal history based on OS.
 * @returns {Promise<string[]>} List of commands
 */
async function readLocalHistory() {
    const platform = os.platform();
    const homeDir = os.homedir();
    let commands = [];

    if (platform === 'win32') {
        // PowerShell history in Windows
        const psHistoryPath = path.join(
            process.env.APPDATA || '',
            'Microsoft', 'Windows', 'PowerShell', 'PSReadLine', 'ConsoleHost_history.txt'
        );
        if (fs.existsSync(psHistoryPath)) {
            try {
                const content = fs.readFileSync(psHistoryPath, 'utf8');
                commands = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            } catch (e) {
                console.error("Error reading PowerShell history:", e);
            }
        }

        // Fallback to CMD doskey if PowerShell is empty
        if (commands.length === 0) {
            commands = await new Promise((resolve) => {
                exec('doskey /history', (error, stdout) => {
                    if (error) {
                        resolve([]);
                    } else {
                        resolve(stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
                    }
                });
            });
        }
    } else {
        // Linux/macOS history files
        const historyFiles = [
            path.join(homeDir, '.zsh_history'),
            path.join(homeDir, '.bash_history')
        ];

        for (const file of historyFiles) {
            if (fs.existsSync(file)) {
                try {
                    const content = fs.readFileSync(file, { encoding: 'utf8', flag: 'r' });
                    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
                    if (file.endsWith('.zsh_history')) {
                        commands = lines.map(cleanZshLine).filter(Boolean);
                    } else {
                        commands = lines;
                    }
                    break;
                } catch (e) {
                    console.error(`Error reading ${file}:`, e);
                }
            }
        }
    }
    return commands;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('STACY extension is now active!');

    // Command: Configure Backend URL
    const configBackend = vscode.commands.registerCommand('stacy.configureBackend', async () => {
        const config = vscode.workspace.getConfiguration('stacy');
        const url = await vscode.window.showInputBox({
            prompt: "Ingrese la URL del servidor backend de STACY",
            value: config.get('backendUrl') || "http://127.0.0.1:8000"
        });
        if (url) {
            await config.update('backendUrl', url, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Backend de STACY configurado en: ${url}`);
        }
    });

    // Command: Log in to STACY
    const loginCommand = vscode.commands.registerCommand('stacy.login', async () => {
        const config = vscode.workspace.getConfiguration('stacy');
        const backendUrl = config.get('backendUrl');

        const username = await vscode.window.showInputBox({ prompt: "Nombre de usuario o correo de STACY" });
        if (!username) return;

        const password = await vscode.window.showInputBox({ prompt: "Contraseña", password: true });
        if (!password) return;

        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await fetch(`${backendUrl}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Credenciales inválidas');
            }

            const data = await response.json();
            await setAccessToken(context, data.access_token);
            vscode.window.showInformationMessage("Sesión iniciada exitosamente en STACY.");
            
            // Execute initial sync
            vscode.commands.executeCommand('stacy.syncHistory');
        } catch (err) {
            vscode.window.showErrorMessage(`Error de inicio de sesión: ${err.message}`);
        }
    });

    // Command: Sync History
    const syncCommand = vscode.commands.registerCommand('stacy.syncHistory', async () => {
        const config = vscode.workspace.getConfiguration('stacy');
        const backendUrl = config.get('backendUrl');
        const token = await getAccessToken(context);

        if (!token) {
            vscode.window.showWarningMessage("No has iniciado sesión en STACY. Ejecuta 'STACY: Iniciar Sesión' primero.");
            return;
        }

        try {
            const rawCommands = await readLocalHistory();
            if (rawCommands.length === 0) {
                return;
            }

            // Delta sync using last synced command
            const lastSyncedCommand = context.globalState.get('stacy.lastSyncedCommand');
            let startIndex = 0;
            
            if (lastSyncedCommand) {
                const idx = rawCommands.lastIndexOf(lastSyncedCommand);
                if (idx !== -1) {
                    startIndex = idx + 1;
                }
            }

            const newCommands = rawCommands.slice(startIndex);
            if (newCommands.length === 0) {
                console.log("No new commands to sync.");
                return;
            }

            const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || os.homedir();
            const bulkData = {
                comandos: newCommands.map(cmd => {
                    let cmdPath = currentWorkspace;
                    if (cmd.toLowerCase().startsWith('cd ')) {
                        const parts = cmd.substring(3).trim();
                        if (parts) cmdPath = parts;
                    }
                    return {
                        comando: cmd,
                        ruta: cmdPath
                    };
                })
            };

            const response = await fetch(`${backendUrl}/historial/registrar-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bulkData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Fallo de respuesta del servidor');
            }

            // Save the last successfully synced command
            const lastCmd = newCommands[newCommands.length - 1];
            await context.globalState.update('stacy.lastSyncedCommand', lastCmd);

            vscode.window.showInformationMessage(`STACY: Sincronizados ${newCommands.length} comandos nuevos.`);
        } catch (err) {
            vscode.window.showErrorMessage(`Error de sincronización de STACY: ${err.message}`);
        }
    });

    context.subscriptions.push(configBackend, loginCommand, syncCommand);

    // Setup periodic auto-sync
    let autoSyncInterval;
    function setupAutoSync() {
        if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
        }
        const config = vscode.workspace.getConfiguration('stacy');
        const autoSync = config.get('autoSync');
        const intervalMin = config.get('syncInterval') || 5;

        if (autoSync) {
            autoSyncInterval = setInterval(() => {
                vscode.commands.executeCommand('stacy.syncHistory');
            }, intervalMin * 60 * 1000);
        }
    }

    setupAutoSync();

    // Re-configure auto-sync when settings change
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('stacy.autoSync') || e.affectsConfiguration('stacy.syncInterval')) {
            setupAutoSync();
        }
    }));
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
