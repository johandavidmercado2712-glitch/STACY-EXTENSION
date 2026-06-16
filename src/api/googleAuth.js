const vscode = require('vscode');
const http = require('http');
const crypto = require('crypto');

class GoogleAuth {
  async login(context) {
    const clientId = vscode.workspace.getConfiguration('stacy').get('googleClientId', '');
    if (!clientId) {
      vscode.window.showErrorMessage('Configura "stacy.googleClientId" en settings para usar Google Login');
      return null;
    }

    const codeVerifier = this._genVerifier();
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const port = await this._findPort(54321);
    const redirectUri = `http://localhost:${port}/callback`;

    const { server, codePromise } = this._createServer(port);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'select_account'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const code = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Google Login',
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: 'Esperando autenticación en el navegador...' });
      return Promise.race([
        codePromise,
        new Promise((_, reject) => {
          token.onCancellationRequested(() => {
            server.close();
            reject(new Error('Cancelado'));
          });
        })
      ]);
    });

    server.close();

    const serverUrl = vscode.workspace.getConfiguration('stacy').get('serverUrl', '');
    const exchangeUrl = `${serverUrl}/auth/google/exchange`;

    vscode.window.showInformationMessage('Intercambiando token con STACY...');

    const resp = await fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Error en backend Google auth: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error('No se recibió access_token del backend');
    }

    return data;
  }

  _genVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  _findPort(start) {
    return new Promise((resolve) => {
      const s = require('net').createServer();
      s.listen(start, () => {
        resolve(s.address().port);
        s.close();
      });
      s.on('error', () => resolve(this._findPort(start + 1)));
    });
  }

  _createServer(port) {
    let resolveCode;
    const codePromise = new Promise((res, rej) => {
      resolveCode = res;
      setTimeout(() => rej(new Error('Timeout esperando callback de Google')), 120000);
    });

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`);
        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h2>Error</h2><p>${error}</p></body></html>`);
          return;
        }
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;color:#e6edf3;text-align:center"><div><h2 style="color:#f59e0b">✓ Autenticación exitosa</h2><p>Ya puedes cerrar esta ventana y volver a VS Code.</p></div></body></html>`);
          resolveCode(code);
        } else {
          res.writeHead(400);
          res.end('No authorization code received');
        }
      } catch (e) {
        console.error('[GoogleAuth] server error:', e);
      }
    });

    server.listen(port);
    return { server, codePromise };
  }
}

module.exports = GoogleAuth;
