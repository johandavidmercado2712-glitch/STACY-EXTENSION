const vscode = require('vscode');

const STORAGE_KEY = 'stacy.accessToken';
const USER_KEY = 'stacy.username';

class StacyAuth {
  constructor(client) {
    this._client = client;
    this._onDidChangeLoginStatus = new vscode.EventEmitter();
    this.onDidChangeLoginStatus = this._onDidChangeLoginStatus.event;
    this._loggedIn = false;
  }

  get isLoggedIn() {
    return this._loggedIn;
  }

  async initialize(context) {
    const token = await context.secrets.get(STORAGE_KEY);
    if (token) {
      this._client.setToken(token);
      this._username = await context.secrets.get(USER_KEY) || '';
      try {
        await this._client.getProfile();
        this._loggedIn = true;
      } catch (err) {
        console.error('[STACY] stored token invalid, clearing auth:', err);
        this._client.clearToken();
        this._username = '';
        this._loggedIn = false;
        await context.secrets.delete(STORAGE_KEY);
        await context.secrets.delete(USER_KEY);
      }
    }
  }

  async login(username, password, context) {
    const data = await this._client.login(username, password);
    const token = data.access_token;
    if (!token) {
      throw new Error('No access token received');
    }
    this._client.setToken(token);
    this._loggedIn = true;
    this._username = username;
    await context.secrets.store(STORAGE_KEY, token);
    await context.secrets.store(USER_KEY, username);
    this._onDidChangeLoginStatus.fire(true);
    return token;
  }

  async loginWithToken(token, username, context) {
    this._client.setToken(token);
    this._loggedIn = true;
    this._username = username;
    await context.secrets.store(STORAGE_KEY, token);
    await context.secrets.store(USER_KEY, username);
    this._onDidChangeLoginStatus.fire(true);
  }

  async logout(context) {
    this._client.clearToken();
    this._loggedIn = false;
    await context.secrets.delete(STORAGE_KEY);
    await context.secrets.delete(USER_KEY);
    this._onDidChangeLoginStatus.fire(false);
  }

  async promptLogin(context) {
    const username = await vscode.window.showInputBox({
      prompt: 'STACY username',
      placeHolder: 'Enter your STACY username',
      ignoreFocusOut: true
    });
    if (!username) return false;

    const password = await vscode.window.showInputBox({
      prompt: 'STACY password',
      password: true,
      placeHolder: 'Enter your STACY password',
      ignoreFocusOut: true
    });
    if (!password) return false;

    try {
      await this.login(username, password, context);
      vscode.window.showInformationMessage('Successfully logged in to STACY');
      return true;
    } catch (err) {
      vscode.window.showErrorMessage(`STACY login failed: ${err.message}`);
      return false;
    }
  }
}

module.exports = StacyAuth;
