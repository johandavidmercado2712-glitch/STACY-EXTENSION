const vscode = require('vscode');
const http = require('http');

class GoogleAuth {
  async login(context) {
    const port = await this._findPort(54321);

    const { server, authPromise } = this._createServer(port);

    const authUrl = `https://stacyprogram.online/auth/google/login?port=${port}`;
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const result = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Google Login',
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: 'Esperando autenticación en el navegador...' });
      return Promise.race([
        authPromise,
        new Promise((_, reject) => {
          token.onCancellationRequested(() => {
            server.close();
            reject(new Error('Cancelado'));
          });
        })
      ]);
    });

    server.close();
    return result;
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
    let resolveAuth;
    const authPromise = new Promise((res, rej) => {
      resolveAuth = res;
      setTimeout(() => rej(new Error('Timeout esperando autenticación')), 120000);
    });

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        const token = url.searchParams.get('token');
        const user = url.searchParams.get('user');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h2>Error</h2><p>${error}</p></body></html>`);
          return;
        }

        if (token && user) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STACY - Autenticación</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #07080c; color: #e6edf3; text-align: center; }
    .card { background: #0e1017; padding: 3rem 4rem; border-radius: 18px; border: 1px solid #1e2030; }
    .icon { font-size: 3rem; color: #f59e0b; }
    h2 { margin: 0 0 0.5rem; font-size: 1.8rem; color: #f59e0b; }
    p { margin: 0; color: #8b949e; font-size: 1.1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>Autenticación exitosa</h2>
    <p>Has iniciado sesión como <b style="color:#e6edf3">${user}</b>.</p>
    <p style="margin-top:0.5rem;font-size:0.9rem;opacity:0.7;">Ya puedes cerrar esta pestaña y volver a VS Code.</p>
  </div>
</body>
</html>`);
          resolveAuth({ access_token: token, username: user });
        } else {
          res.writeHead(400);
          res.end('Error: No se recibió token de autenticación');
        }
      } catch (e) {
        console.error('[GoogleAuth] server error:', e);
      }
    });

    server.listen(port);
    return { server, authPromise };
  }
}

module.exports = GoogleAuth;
