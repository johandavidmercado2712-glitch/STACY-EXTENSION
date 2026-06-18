const vscode = require('vscode');

class StacyClient {
  constructor() {
    this._token = null;
  }

  get baseUrl() {
    return vscode.workspace.getConfiguration('stacy').get('serverUrl', 'https://stacyprogram.online');
  }

  setToken(token) {
    this._token = token;
  }

  clearToken() {
    this._token = null;
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    if (path.startsWith('/notas')) {
      console.log('[STACY-API] ' + method + ' ' + url + ' body=' + (body ? JSON.stringify(body).substring(0,200) : 'null'));
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      console.log('[STACY-API] ERROR ' + method + ' ' + url + ' -> ' + response.status + ': ' + text);
      if (response.status === 401) {
        throw new Error(`Unauthorized: ${text}`);
      }
      throw new Error(`API error ${response.status}: ${text}`);
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  get(path) {
    return this.request('GET', path);
  }

  post(path, body) {
    return this.request('POST', path, body);
  }

  put(path, body) {
    return this.request('PUT', path, body);
  }

  del(path) {
    return this.request('DELETE', path);
  }

  login(username, password) {
    const url = `${this.baseUrl}/token`;
    const body = new URLSearchParams({ username, password });
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(async (res) => {
      if (!res.ok) {
        let msg = 'Login failed';
        try { const d = await res.json(); if (d.detail) msg = d.detail; } catch(e) {}
        throw new Error(msg);
      }
      return res.json();
    });
  }

  getRecentCommands() {
    return this.get('/historial/ultimos');
  }

  getAllCommands() {
    return this.get('/historial/todos');
  }

  searchCommands(name) {
    return this.get(`/historial/comandos/${encodeURIComponent(name)}`);
  }

  importCommands(commands) {
    return this.post('/comandos/importar', { comandos: commands });
  }

  getFolders() {
    return this.get('/carpetas');
  }

  createFolder(name, description) {
    return this.post('/carpetas', { nombre: name, descripcion: description || '' });
  }

  deleteFolder(id) {
    return this.del(`/carpetas/${id}`);
  }

  assignCommandToFolder(comandoId, carpetaId) {
    return this.post('/carpetas/asignar', { com_id: comandoId, car_id: carpetaId });
  }

  unassignCommandFromFolder(comandoId, carpetaId) {
    return this.post('/carpetas/desasignar', { com_id: comandoId, car_id: carpetaId });
  }

  updateCommandDescription(carpetaId, comandoId, descripcion) {
    return this.put('/carpetas/descripcion', { car_id: carpetaId, com_id: comandoId, descripcion: descripcion });
  }

  getFolderCommands(folderId) {
    return this.get(`/carpetas/${folderId}/comandos`);
  }

  getNotes() {
    return this.get('/notas');
  }

  createNote(title, content) {
    return this.post('/notas', { titulo: title, contenido: content });
  }

  updateNote(id, title, content) {
    return this.put(`/notas/${id}`, { titulo: title, contenido: content });
  }

  deleteNote(id) {
    return this.del(`/notas/${id}`);
  }

  getProfile() {
    return this.get('/users/profile');
  }

  register(username, apellidos, correo, password) {
    return this.post('/register', { username, apellidos, correo, password });
  }
}

module.exports = StacyClient;
