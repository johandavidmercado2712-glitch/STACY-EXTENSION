const vscode = require('vscode');
const StacyClient = require('./api/client');
const StacyAuth = require('./api/auth');
const GoogleAuth = require('./api/googleAuth');
const StacyWebViewProvider = require('./providers/stacyWebView');

let stacyAuth;
let stacyClient;
let statusBarItem;
let webViewProvider;

function updateStatusBar() {
  if (!statusBarItem) return;
  if (stacyAuth.isLoggedIn) {
    statusBarItem.text = '$(check-all) STACY: Connected';
    statusBarItem.tooltip = 'Click to logout';
    statusBarItem.command = 'stacy.logout';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(sign-in) STACY: Disconnected';
    statusBarItem.tooltip = 'Click to login';
    statusBarItem.command = 'stacy.login';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

let extensionContext;
let _currentUsername = '';

let _folderCommandCache = {};

async function refreshAll() {
  if (!stacyAuth.isLoggedIn) return;
  _currentUsername = stacyAuth._username || '';

  const [cmdData, allCmdData, folderData, notesData] = await Promise.all([
    stacyClient.getRecentCommands().catch(() => null),
    stacyClient.getAllCommands().catch(() => null),
    stacyClient.getFolders().catch(() => null),
    stacyClient.getNotes().catch(() => null)
  ]);

  const profileData = await stacyClient.getProfile().catch((err) => {
    if (err && err.message && err.message.includes('Unauthorized')) {
      return { _expired: true };
    }
    return null;
  });

  if (profileData && profileData._expired) {
    console.log('[STACY] Token expired during refresh, logging out');
    if (extensionContext) {
      await stacyAuth.logout(extensionContext);
      webViewProvider.update([], [], [], [], {}, null, '');
    }
    vscode.window.showErrorMessage('Sesión expirada. Inicia sesión de nuevo.');
    return;
  }

  const commands = parseData(cmdData, 'comandos');
  const allCommands = parseData(allCmdData, 'comandos');
  const folders = parseData(folderData, 'carpetas');
  const notes = parseData(notesData, 'notas');

  const allEmpty = commands.length === 0 && allCommands.length === 0 && folders.length === 0 && notes.length === 0;
  const hasPrevData = webViewProvider._ac.length > 0 || webViewProvider._folders.length > 0 || webViewProvider._notes.length > 0;

  if (allEmpty && hasPrevData) {
    console.log('[STACY] refreshAll: all data empty but provider has data, preserving current view');
    return;
  }

  _folderCommandCache = {};
  for (const f of folders) {
    const fid = f.CAR_ID || f.id;
    if (!fid) continue;
    try {
      const fData = await stacyClient.getFolderCommands(fid);
      _folderCommandCache[fid] = parseData(fData, 'comandos');
    } catch { _folderCommandCache[fid] = []; }
  }

  webViewProvider.update(commands, allCommands, folders, notes, _folderCommandCache, profileData, _currentUsername);
}

function parseData(data, defaultKey) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    return data[defaultKey] || data.commands || data.datos || data.data || data.historial || data.folders || [];
  }
  return [];
}

function activate(context) {
  extensionContext = context;
  stacyClient = new StacyClient();
  stacyAuth = new StacyAuth(stacyClient);
  webViewProvider = new StacyWebViewProvider(context.extensionUri, stacyClient);
  webViewProvider.setAuth(stacyAuth, context);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(sync~spin) STACY: Initializing...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('stacyWebView', webViewProvider)
  );

  stacyAuth.onDidChangeLoginStatus(() => {
    updateStatusBar();
  });

  stacyAuth.initialize(context).then(() => {
    updateStatusBar();
    if (stacyAuth.isLoggedIn) {
      _currentUsername = stacyAuth._username || '';
      refreshAll();
    } else {
      webViewProvider.update([], [], [], [], {}, null, '');
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.copyCommand', async (text) => {
      if (text) {
        await vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage(`Copied: ${text}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.login', async () => {
      const ok = await stacyAuth.promptLogin(context);
      if (ok) {
        _currentUsername = stacyAuth._username || '';
        refreshAll();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.logout', async () => {
      await stacyAuth.logout(context);
      vscode.window.showInformationMessage('Logged out of STACY');
      _currentUsername = '';
      webViewProvider.update([], [], [], [], {}, null, '');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.refresh', async () => {
      if (!stacyAuth.isLoggedIn) {
        const ok = await stacyAuth.promptLogin(context);
        if (!ok) return;
      }
      await refreshAll();
      vscode.window.showInformationMessage('STACY data refreshed');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.googleLogin', async () => {
      if (stacyAuth.isLoggedIn) {
        vscode.window.showInformationMessage('Ya has iniciado sesión');
        return;
      }
      try {
        const googleAuth = new GoogleAuth();
        const result = await googleAuth.login(context);
        if (!result || !result.access_token) {
          vscode.window.showErrorMessage('Google Login falló');
          return;
        }
        const username = result.username || result.email || 'google_user';
        await stacyAuth.loginWithToken(result.access_token, username, context);
        _currentUsername = username;
        vscode.window.showInformationMessage('Google Login exitoso');
        refreshAll();
      } catch (err) {
        vscode.window.showErrorMessage(`Google Login: ${err.message}`);
        webViewProvider.update([], [], [], [], {}, null, '');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.searchCommands', async () => {
      if (!stacyAuth.isLoggedIn) {
        const ok = await stacyAuth.promptLogin(context);
        if (!ok) return;
      }
      const query = await vscode.window.showInputBox({
        prompt: 'Search commands',
        placeHolder: 'Enter command name or keyword'
      });
      if (!query) return;
      try {
        const data = await stacyClient.searchCommands(query);
        const commands = parseData(data, 'comandos');
        if (commands.length === 0) {
          vscode.window.showInformationMessage('No commands found');
          return;
        }
        const items = commands.map(cmd => ({
          label: cmd.comando || cmd.comando_ejecutado || cmd.command || cmd.text || cmd.nombre || 'Unknown',
          description: cmd.fecha_ejecucion || cmd.fecha || cmd.date || '',
          detail: cmd.directorio || cmd.directory || ''
        }));
        const picked = await vscode.window.showQuickPick(items, {
          matchOnDescription: true,
          matchOnDetail: true,
          placeHolder: 'Select a command to copy'
        });
        if (picked) {
          vscode.env.clipboard.writeText(picked.label);
          vscode.window.showInformationMessage('Command copied to clipboard');
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Search failed: ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('stacy.importCommand', async () => {
      if (!stacyAuth.isLoggedIn) {
        const ok = await stacyAuth.promptLogin(context);
        if (!ok) return;
      }
      const cmd = await vscode.window.showInputBox({
        prompt: 'Command to import to STACY',
        placeHolder: 'e.g. docker ps -a'
      });
      if (!cmd) return;
      try {
        await stacyClient.importCommands([
          { comando: cmd, directorio: vscode.workspace.rootPath || process.cwd() }
        ]);
        vscode.window.showInformationMessage('Command imported to STACY');
      } catch (err) {
        vscode.window.showErrorMessage(`Import failed: ${err.message}`);
      }
    })
  );

}

function deactivate() {}

module.exports = { activate, deactivate };
