const vscode = require('vscode');

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escHtml(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(typeof d === 'string' && d.includes(' ') ? d.replace(' ', 'T') : d);
  return isNaN(dt) ? d : dt.toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortDate(d) {
  if (!d) return '';
  const dt = new Date(typeof d === 'string' && d.includes(' ') ? d.replace(' ', 'T') : d);
  return isNaN(dt) ? d : dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function cLabel(c) { return c.comando || c.COM_NOMBRE || c.comando_ejecutado || c.command || c.text || c.nombre || c.name || c.cmd || 'Unknown'; }
function cDate(c) { return c.fecha || c.COM_FECHA || c.fecha_ejecucion || c.date || ''; }
function cDir(c) { return c.ruta || c.COM_RUTA || c.directorio || c.directory || ''; }
function fName(f) { return f.CAR_NOMBRE || f.nombre || f.name || f.nombre_carpeta || f.folder_name || f.title || 'Unnamed'; }
function fId(f) { return f.CAR_ID || f.id || f.car_id || 0; }

// ============ SERVER-SIDE RENDERING HELPERS ============

function cmdCard(c) {
  const l = cLabel(c), f = cDate(c), d = cDir(c);
  return `<div class="cmd-item" data-cmd="${escHtml(l).replace(/'/g,"&#39;")}">
    <div class="cmd-top"><span class="cmd-maq">${d.match(/\[MAQUINA:(.*?)\]/)?escHtml(d.match(/\[MAQUINA:(.*?)\]/)[1]):'Servidor'}</span><span class="cmd-time">${f?fmtDate(f):''}</span></div>
    <code class="cmd-code"><svg class="cmd-code-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>${escHtml(l)}</code>
    <div class="cmd-path">${d?escHtml(d.replace(/\[MAQUINA:.*?\]\s*/,'')):''}</div>
  </div>`;
}

function renderCmdItems(ac) {
  return !ac || !ac.length
    ? '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="empty-content"><div class="empty-title">Aún no hay comandos</div><div class="empty-desc">Importa tu historial de comandos usando el botón "Bajar comandos"</div></div></div>'
    : ac.map(cmdCard).join('');
}

function renderRecentItems(rc) {
  return !rc || !rc.length
    ? '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><div class="empty-content"><div class="empty-title">Aún no hay comandos recientes</div><div class="empty-desc">Los comandos que ejecutes aparecerán aquí automáticamente</div></div></div>'
    : rc.slice(0, 11).map(cmdCard).join('');
}

function renderFolderItems(folders) {
  return !folders || !folders.length
    ? '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div><div class="empty-content"><div class="empty-title">Aún no hay carpetas</div><div class="empty-desc">Crea tu primera carpeta con el botón + para organizar comandos</div></div></div>'
    : folders.map(function(f){
        return `<div class="folder-item" data-fid="${fId(f)}" data-fname="${escHtml(fName(f))}">
          <div class="folder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="folder-info"><div class="folder-name">${escHtml(fName(f))}</div>${f.CAR_DESCRIPCION?'<div class="folder-desc">'+escHtml(f.CAR_DESCRIPCION)+'</div>':''}</div>
          <svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>`;
      }).join('');
}

function renderNoteItems(notes) {
  return !notes || !notes.length
    ? '<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><line x1="9" y1="9" x2="10" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div><div class="empty-content"><div class="empty-title">Aún no hay notas</div><div class="empty-desc">Crea tu primera nota con el botón + para guardar información</div></div></div>'
    : notes.map(function(n){
        const title = n.NOT_TITULO||n.titulo||n.title||'Sin titulo';
        const preview = (n.NOT_CONTENIDO||n.contenido||n.content||'').replace(/\n/g,' ').substring(0,80);
        const date = shortDate(n.NOT_UPDATED_AT||n.updated_at||n.NOT_CREATED_AT||'');
        return `<div class="note-item" data-nid="${n.NOT_ID||n.id||0}" data-ntitle="${escHtml(title)}" data-ncontent="${escHtml(n.NOT_CONTENIDO||n.contenido||n.content||'')}">
          <div class="note-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
              <line x1="9" y1="9" x2="10" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </div>
          <div class="note-info">
            <div class="note-title">${escHtml(title)}</div>${preview?'<div class="note-preview">'+escHtml(preview)+'</div>':''}
          </div>
          ${date?'<div class="note-date">'+escHtml(date)+'</div>':''}
        </div>`;
      }).join('');
}

function renderProfile(prof, username) {
  const initial = (username || '?')[0].toUpperCase();
  const p = prof || {};
  return `<div class="profile-header">
    <div class="profile-avatar-lg">${escHtml(initial)}</div>
    <div class="profile-info">
      <span class="profile-username">${escHtml(p.username||username||'')}</span>
      <span class="profile-label-1">Perfil de usuario</span>
    </div>
  </div>
  <div class="profile-body">
    ${p.apellidos?'<div class="profile-field"><span class="profile-field-label">Apellidos</span><span class="profile-field-value">'+escHtml(p.apellidos)+'</span></div>':''}
    ${p.correo?'<div class="profile-field"><span class="profile-field-label">Correo</span><span class="profile-field-value">'+escHtml(p.correo)+'</span></div>':''}
    <div class="profile-divider"></div>
    <button class="profile-item" data-action="bajar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Bajar comandos de este equipo</button>
    <button class="profile-logout"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar sesion</button>
  </div>`;
}

// ============ STATIC HTML (no embedded data) ============

function getWebViewContent(scriptUri, nonce) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#07080c;--surface:#0e1017;--surface-hover:#161822;--text:#e6edf3;--text-secondary:#8b949e;--accent:#f59e0b;--accent-hover:#fbbf24;--accent-dim:rgba(245,158,11,0.12);--accent-glow:rgba(245,158,11,0.08);--border:#1e2030;--border-focus:#f59e0b;--danger:#f85149;--success:#3fb950;--radius:14px;--radius-sm:10px;--radius-lg:18px;--transition:200ms cubic-bezier(0.4,0,0.2,1);--shadow:0 4px 24px rgba(0,0,0,0.35);--shadow-lg:0 12px 48px rgba(0,0,0,0.45);--shadow-accent:0 8px 32px rgba(245,158,11,0.1);--font:'SF Pro Display','Inter','Segoe UI',system-ui,-apple-system,sans-serif;--font-mono:'SF Mono','JetBrains Mono','Fira Code','Consolas',monospace}
body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden;text-rendering:optimizeLegibility}
body.vscode-light{--bg:#f0f2f5;--surface:#ffffff;--surface-hover:#f3f4f6;--text:#1a1a2e;--text-secondary:#6b7280;--accent:#d97706;--accent-hover:#b45309;--accent-dim:rgba(217,119,6,0.1);--accent-glow:rgba(217,119,6,0.06);--border:#dce0e8;--border-focus:#d97706;--danger:#dc2626;--success:#16a34a;--shadow:0 2px 12px rgba(0,0,0,0.06);--shadow-lg:0 8px 32px rgba(0,0,0,0.1);--shadow-accent:0 8px 32px rgba(217,119,6,0.08)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}

/* LOGIN VIEW */
#loginView{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;background:var(--bg)}
.auth-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(245,158,11,0.1) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 80% 90%,rgba(245,158,11,0.06) 0%,transparent 50%)}
.auth-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);width:90%;max-width:360px;box-shadow:var(--shadow-lg);overflow:hidden;position:relative;z-index:1}
.auth-card-header{background:linear-gradient(135deg,rgba(245,158,11,0.12) 0%,rgba(245,158,11,0.03) 100%);padding:24px 24px 16px;text-align:center;border-bottom:1px solid var(--border)}
.auth-logo{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;background:var(--accent);color:#0d1117;margin-bottom:8px;box-shadow:0 4px 16px rgba(245,158,11,0.3)}
.auth-logo svg{width:24px;height:24px}
.auth-card-header h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-0.03em}
.auth-tagline{margin:2px 0 0;font-size:12px;color:var(--text-secondary);font-weight:500;letter-spacing:0.01em}
.auth-tabs{display:flex;gap:4px;margin-bottom:16px;background:var(--bg);border-radius:var(--radius-sm);padding:4px}
.auth-tab{background:transparent;color:var(--text-secondary);border:none;padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer;font-weight:600;flex:1;transition:all var(--transition);font-family:inherit}
.auth-tab.active{background:var(--surface);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,0.25)}
.auth-body{padding:16px 20px 20px}
.auth-form{display:flex;flex-direction:column;gap:10px}
.input-group{position:relative;display:flex;align-items:center}
.input-icon{position:absolute;left:10px;color:var(--text-secondary);opacity:0.5;pointer-events:none;flex-shrink:0;width:16px;height:16px}
.input-group:focus-within .input-icon{opacity:0.9;color:var(--accent)}
.input-group input{width:100%;padding:8px 10px 8px 32px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:13px;background:var(--bg);color:var(--text);outline:none;transition:border-color var(--transition),box-shadow var(--transition)}
.input-group input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.input-group input::placeholder{color:var(--text-secondary);opacity:0.5}
.auth-form button{padding:8px;font-size:13px;font-weight:700;border:none;background:var(--accent);color:#0d1117;border-radius:var(--radius-sm);cursor:pointer;font-family:inherit;transition:all var(--transition);letter-spacing:0.01em}
.auth-form button:hover{background:var(--accent-hover);box-shadow:0 4px 16px rgba(245,158,11,0.3);transform:translateY(-1px)}
.auth-form button:active{transform:scale(0.98)}
.auth-form button:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none}
.auth-divider{display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--text-secondary);font-size:11px;font-weight:500}
.auth-divider::before,.auth-divider::after{content:"";flex:1;height:1px;background:var(--border)}
.btn-google{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:8px 12px;font-size:12px;font-weight:600;font-family:inherit;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:var(--radius-sm);cursor:pointer;transition:all var(--transition)}
.btn-google:hover{background:var(--surface-hover);border-color:var(--text-secondary);transform:translateY(-1px)}
.auth-message{margin-top:8px;font-size:12px;text-align:center;min-height:18px;font-weight:600;color:var(--danger)}

/* DASHBOARD - NAVBAR */
.navbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb, var(--surface) 88%, transparent);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2)}
.navbar-brand{display:flex;align-items:center;gap:8px}
.navbar-logo{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;color:var(--accent);letter-spacing:-0.03em;text-shadow:0 0 20px rgba(245,158,11,0.15)}
.navbar-logo svg{width:18px;height:18px;stroke-width:2.5}
.navbar-user{display:flex;align-items:center;gap:6px}
.navbar-btn{font-size:11px;padding:5px 10px;border:none;background:var(--accent);color:#0d1117;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;transition:all var(--transition);white-space:nowrap;line-height:1.4;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
.theme-btn{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;cursor:pointer;transition:all var(--transition)}
.theme-btn:hover{background:var(--surface-hover);color:var(--accent);border-color:var(--accent-dim)}
.theme-btn svg{width:14px;height:14px}
body.stacy-light{--bg:#f0f2f5;--surface:#ffffff;--surface-hover:#f3f4f6;--text:#1a1a2e;--text-secondary:#6b7280;--accent:#d97706;--accent-hover:#b45309;--accent-dim:rgba(217,119,6,0.1);--accent-glow:rgba(217,119,6,0.06);--border:#dce0e8;--border-focus:#d97706;--danger:#dc2626;--success:#16a34a;--shadow:0 2px 12px rgba(0,0,0,0.06);--shadow-lg:0 8px 32px rgba(0,0,0,0.1);--shadow-accent:0 8px 32px rgba(217,119,6,0.08)}
body.stacy-dark{--bg:#0b1120;--surface:#161b22;--surface-hover:#1c2333;--text:#e6edf3;--text-secondary:#8b949e;--accent:#f59e0b;--accent-hover:#fbbf24;--accent-dim:rgba(245,158,11,0.12);--accent-glow:rgba(245,158,11,0.08);--border:#2d3348;--border-focus:#f59e0b;--danger:#f85149;--success:#3fb950;--shadow:0 4px 24px rgba(0,0,0,0.3);--shadow-lg:0 12px 48px rgba(0,0,0,0.4);--shadow-accent:0 8px 32px rgba(245,158,11,0.12)}
.navbar-btn:hover{background:var(--accent-hover);box-shadow:0 4px 16px rgba(245,158,11,0.35);transform:translateY(-1px)}
.navbar-btn:active{transform:scale(0.97)}
.user-trigger{display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 5px 3px 10px;border-radius:10px;border:1px solid transparent;transition:all var(--transition);position:relative}
.user-trigger:hover{background:var(--surface-hover);border-color:var(--border)}
.user-label-1{font-size:12px;color:var(--text-secondary);font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.user-avatar{width:26px;height:26px;border-radius:50%;background:var(--accent);color:#0d1117;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 2px var(--accent-dim),0 0 16px rgba(245,158,11,0.2);transition:box-shadow var(--transition)}
.user-trigger:hover .user-avatar{box-shadow:0 0 0 2px var(--accent-dim),0 0 20px rgba(245,158,11,0.35)}

/* PROFILE DROPDOWN */
.profile-overlay{position:fixed;inset:0;z-index:900;background:transparent;display:none}
.profile-panel{position:fixed;top:48px;right:14px;z-index:950;width:280px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);opacity:0;transform:translateY(-8px) scale(0.96);pointer-events:none;transition:opacity var(--transition),transform var(--transition);overflow:hidden}
.profile-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
.profile-header{display:flex;align-items:center;gap:12px;padding:16px;background:linear-gradient(135deg,rgba(245,158,11,0.1) 0%,rgba(245,158,11,0.03) 100%);border-bottom:1px solid var(--border)}
.profile-avatar-lg{width:40px;height:40px;border-radius:50%;background:var(--accent);color:#0d1117;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 0 3px var(--accent-dim),0 0 24px rgba(245,158,11,0.25)}
.profile-info{display:flex;flex-direction:column;min-width:0}
.profile-username{font-size:14px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.profile-label-1{font-size:11px;color:var(--text-secondary);font-weight:500}
.profile-body{padding:8px 16px 16px}
.profile-field{margin-bottom:8px}
.profile-field-label{display:block;font-size:10px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}
.profile-field-value{font-size:13px;color:var(--text)}
.profile-divider{height:1px;background:var(--border);margin:10px 0}
.profile-logout{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:none;background:transparent;color:var(--danger);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;border-radius:var(--radius-sm);transition:all var(--transition)}
.profile-logout:hover{background:rgba(248,81,73,0.1);transform:translateX(2px)}
.profile-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:none;background:transparent;color:var(--text);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;border-radius:var(--radius-sm);transition:all var(--transition)}
.profile-item:hover{background:var(--surface-hover)}

/* TABS */
.tabs{display:flex;background:var(--surface);border-bottom:1px solid var(--border);overflow-x:auto;padding:4px 6px 0;gap:2px}
.tab{position:relative;padding:10px 18px;font-size:12px;font-weight:700;font-family:inherit;background:transparent;border:none;color:var(--text-secondary);cursor:pointer;transition:all var(--transition);white-space:nowrap;border-radius:10px 10px 0 0;margin-bottom:0;letter-spacing:0.01em}
.tab:hover{color:var(--text);background:var(--surface-hover)}
.tab.active{color:var(--accent);background:linear-gradient(to top,var(--accent-dim) 0%,transparent 100%);text-shadow:0 0 20px rgba(245,158,11,0.15)}
.tab.active::after{content:'';position:absolute;bottom:0;left:10px;right:10px;height:2.5px;background:var(--accent);border-radius:2px 2px 0 0;box-shadow:0 0 12px rgba(245,158,11,0.4)}
.tab-count{font-size:10px;background:var(--accent-dim);color:var(--accent);border-radius:999px;padding:1px 8px;font-weight:700;margin-left:7px;display:inline-block;line-height:1.6}

.content{padding:0 14px 16px}
.panel{display:none;animation:fadeIn 200ms ease}
.panel.active{display:block}

.panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px 0 8px;border-bottom:1px solid var(--border);margin-bottom:4px}
.panel-header h2{font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.02em;background:linear-gradient(135deg,var(--text) 0%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.panel-header .badge{font-size:10px;color:var(--accent);background:var(--accent-dim);border:1px solid rgba(245,158,11,0.2);border-radius:999px;padding:2px 10px;font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.panel-header .action-btn{background:var(--accent-dim);border:1px solid rgba(245,158,11,0.15);color:var(--accent);cursor:pointer;font-size:20px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:all var(--transition)}
.panel-header .action-btn:hover{background:var(--accent);color:#0d1117;transform:rotate(90deg);box-shadow:0 4px 12px rgba(245,158,11,0.3)}

.toolbar{display:flex;gap:8px;margin:8px 0;align-items:center;flex-wrap:wrap}
.toolbar .search-bar{flex:1;min-width:140px}
.toolbar .search-bar input{width:100%;padding:7px 10px;font-size:12px;font-family:inherit;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;outline:none;transition:all var(--transition)}
.toolbar .search-bar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.folder-filter-bar{display:flex;align-items:center;gap:6px;padding:6px 10px;background:color-mix(in srgb,var(--accent) 8%,var(--surface));border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border));border-radius:8px;margin:6px 0;transition:all var(--transition)}
.folder-filter-bar:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);background:color-mix(in srgb,var(--accent) 12%,var(--surface))}
.folder-filter-bar svg{flex-shrink:0;color:var(--text-secondary);opacity:0.6}
.folder-filter-bar input{flex:1;min-width:0;border:none;background:none;font-size:12px;font-family:inherit;color:var(--text);outline:none}
.folder-filter-bar input::placeholder{color:var(--text-secondary);opacity:0.6}
.machine-select-wrap{position:relative;display:flex;align-items:center;flex-shrink:0}
.machine-select-icon{position:absolute;left:8px;color:var(--text-secondary);opacity:0.5;pointer-events:none;flex-shrink:0;width:14px;height:14px;z-index:1}
.machine-select-icon:hover{opacity:0.8}
.machine-select{font-size:12px;padding:6px 8px 6px 28px;font-family:inherit;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;outline:none;cursor:pointer;flex-shrink:0;max-width:170px;transition:border-color var(--transition);appearance:auto;-webkit-appearance:auto}
.machine-select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.view-toggle{display:flex;gap:2px;padding:3px;background:var(--surface);border:1px solid var(--border);border-radius:10px;flex-shrink:0}
.view-btn{font-size:11px;padding:4px 10px;border:none;background:transparent;color:var(--text-secondary);border-radius:7px;cursor:pointer;font-weight:600;font-family:inherit;transition:all var(--transition);white-space:nowrap}
.view-btn:hover{color:var(--text)}
.view-btn.active{background:var(--bg);color:var(--accent);box-shadow:0 1px 4px rgba(0,0,0,0.2)}
.toolbar-btn{display:flex;align-items:center;gap:6px;padding:5px 10px;font-size:11px;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;cursor:pointer;font-family:inherit;transition:all var(--transition);white-space:nowrap;flex-shrink:0}
.toolbar-btn:hover{background:var(--surface-hover);border-color:var(--text-secondary);transform:translateY(-1px)}
.toolbar-btn:active{transform:scale(0.97)}

/* SKELETON */
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
.skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface-hover) 50%,var(--surface) 75%);background-size:200px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:var(--radius-sm);border:1px solid var(--border)}

/* COMMAND LIST */
.cmd-list{display:flex;flex-direction:column;gap:4px;margin:4px 0 0;padding:0}
.cmd-item{padding:10px 12px;background:var(--surface);border-radius:0 var(--radius-sm) var(--radius-sm) 0;border:1px solid var(--border);border-left:3px solid var(--accent-dim);cursor:pointer;transition:all var(--transition);animation:fadeSlideIn 220ms ease both;position:relative}
.cmd-item:nth-child(1){animation-delay:0ms}
.cmd-item:nth-child(2){animation-delay:30ms}
.cmd-item:nth-child(3){animation-delay:60ms}
.cmd-item:nth-child(4){animation-delay:90ms}
.cmd-item:nth-child(5){animation-delay:120ms}
.cmd-item:nth-child(6){animation-delay:150ms}
.cmd-item:nth-child(7){animation-delay:180ms}
.cmd-item:nth-child(8){animation-delay:210ms}
.cmd-item:hover{background:var(--surface-hover);border-color:var(--accent-dim);border-left-color:var(--accent);box-shadow:0 2px 12px rgba(245,158,11,0.08);transform:translateX(3px)}
.cmd-item:active{transform:scale(0.995)}
.cmd-top{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.cmd-maq{font-size:9px;color:var(--accent);background:var(--accent-dim);border:1px solid rgba(245,158,11,0.2);border-radius:999px;padding:2px 8px;font-weight:700;white-space:nowrap;letter-spacing:0.03em;text-transform:uppercase}
.cmd-time{font-size:10px;color:var(--text-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto;opacity:0.7}
.cmd-code{font-family:var(--font-mono);font-size:12px;background:color-mix(in srgb, var(--bg) 70%, transparent);border-radius:6px;padding:4px 10px;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px;line-height:1.8;font-weight:500;border:1px solid rgba(245,158,11,0.08)}
.cmd-code-icon{flex-shrink:0;width:14px;height:14px;opacity:0.5;color:var(--accent)}
.cmd-path{font-size:10px;color:var(--text-secondary);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;padding-left:3px;opacity:0.6}

/* FOLDER LIST */
.folder-list{display:flex;flex-direction:column;gap:4px}
.folder-item{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--radius);cursor:pointer;transition:all var(--transition);background:var(--surface);border:1px solid var(--border);position:relative;overflow:hidden}
.folder-item::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--accent-dim) 0%,transparent 50%);opacity:0;transition:opacity var(--transition)}
.folder-item:hover::before{opacity:1}
.folder-item:hover{background:var(--surface-hover);border-color:var(--accent-dim);box-shadow:0 2px 12px rgba(245,158,11,0.08);transform:translateX(3px)}
.folder-item:active{transform:scale(0.995)}
.folder-icon{flex-shrink:0;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent-dim) 0%,rgba(245,158,11,0.06) 100%);border-radius:var(--radius-sm);color:var(--accent);position:relative;z-index:1;border:1px solid rgba(245,158,11,0.1)}
.folder-icon svg{width:20px;height:20px}
.folder-info{flex:1;min-width:0;position:relative;z-index:1}
.folder-name{font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.folder-desc{font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.folder-arrow{flex-shrink:0;width:18px;height:18px;color:var(--text-secondary);opacity:0.4;transition:all var(--transition);position:relative;z-index:1}
.folder-item:hover .folder-arrow{opacity:1;color:var(--accent);transform:translateX(5px)}

.folder-back{display:flex;align-items:center;gap:6px;padding:8px 2px;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;transition:all var(--transition)}
.folder-back:hover{opacity:0.8;transform:translateX(-3px)}

/* FOLDER ADD SUGGESTIONS */
.folder-add-suggest{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;max-height:180px;overflow-y:auto}
.folder-add-suggest .suggest-item{padding:8px 10px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:all var(--transition);color:var(--text)}
.folder-add-suggest .suggest-item:last-child{border-bottom:none}
.folder-add-suggest .suggest-item:hover{background:var(--accent-dim);color:var(--accent)}
.folder-add-suggest .suggest-item .suggest-cmd{font-family:var(--font-mono);font-size:11px;font-weight:500}
.folder-add-suggest .suggest-item .suggest-path{font-size:10px;color:var(--text-secondary);margin-top:2px}
.folder-add-suggest .empty-suggest{padding:14px;text-align:center;font-size:12px;color:var(--text-secondary)}

/* NOTE LIST */
#noteList{display:flex;flex-direction:column;gap:4px}
.note-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all var(--transition)}
.note-item:hover{background:var(--surface-hover);border-color:var(--accent-dim);box-shadow:0 2px 12px rgba(245,158,11,0.06);transform:translateX(2px)}
.note-item:active{transform:scale(0.995)}
.note-icon{flex-shrink:0;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent-dim) 0%,rgba(245,158,11,0.06) 100%);border-radius:var(--radius-sm);color:var(--accent);border:1px solid rgba(245,158,11,0.1)}
.note-icon svg{width:18px;height:18px}
.note-info{flex:1;min-width:0}
.note-title{font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.note-preview{font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.note-date{flex-shrink:0;font-size:10px;color:var(--text-secondary);opacity:0.6;font-variant-numeric:tabular-nums;white-space:nowrap}

/* NOTE VIEW */
.note-view-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;line-height:1.4;word-break:break-word}
.note-view-content{font-size:13px;color:var(--text-secondary);line-height:1.7;white-space:pre-wrap;word-break:break-word;background:var(--bg);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border);min-height:80px;max-height:300px;overflow-y:auto}

/* EMPTY */
.empty{text-align:center;padding:44px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;animation:fadeIn 300ms ease}
.empty-icon{width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:var(--accent-dim);border-radius:18px;color:var(--accent);opacity:0.85;border:1px solid rgba(245,158,11,0.1);box-shadow:0 0 30px var(--accent-glow)}
.empty-icon svg{width:28px;height:28px}
.empty-title{font-size:15px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
.empty-desc{font-size:12px;color:var(--text-secondary);line-height:1.5;max-width:260px;font-weight:450}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(6px);animation:fadeIn 180ms ease}
.modal-box{background:var(--surface);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-lg);width:92%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-lg),0 0 60px var(--accent-glow);animation:slideIn 220ms cubic-bezier(0.16,1,0.3,1)}
.modal-box.wide{max-width:520px}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(245,158,11,0.12);background:linear-gradient(135deg,var(--accent-dim) 0%,var(--surface-hover) 100%);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.modal-header h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-0.01em;color:var(--text)}
.modal-close{background:none;border:none;color:var(--text-secondary);font-size:22px;cursor:pointer;padding:0;line-height:1;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all var(--transition)}
.modal-close:hover{color:var(--text);background:var(--accent-dim)}
.modal-body{padding:14px 16px}
.modal-input{width:100%;padding:8px 10px;font-size:13px;font-family:inherit;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;outline:none;transition:all var(--transition);box-sizing:border-box}
.modal-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.modal-textarea{width:100%;min-height:120px;padding:8px 10px;font-size:13px;font-family:inherit;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;outline:none;resize:vertical;transition:all var(--transition);box-sizing:border-box;margin-top:6px;line-height:1.5}
.modal-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--border);background:color-mix(in srgb, var(--bg) 60%, transparent)}
.modal-btn{padding:7px 16px;font-size:12px;font-weight:700;font-family:inherit;border:none;background:var(--accent);color:#0d1117;border-radius:9px;cursor:pointer;transition:all var(--transition);letter-spacing:0.01em;box-shadow:0 2px 8px rgba(245,158,11,0.2)}
.modal-btn:hover{background:var(--accent-hover);transform:translateY(-2px);box-shadow:0 4px 16px rgba(245,158,11,0.35)}
.modal-btn:active{transform:scale(0.97)}
.modal-btn-outline{background:transparent;color:var(--text-secondary);border:1px solid var(--border);box-shadow:none}
.modal-btn-outline:hover{border-color:var(--text-secondary);color:var(--text);transform:translateY(-2px);box-shadow:none;background:var(--surface-hover)}
.modal-btn-danger{background:transparent;color:var(--danger);border:1px solid rgba(248,81,73,0.3);box-shadow:none}
.modal-btn-danger:hover{background:rgba(248,81,73,0.12);border-color:var(--danger);transform:translateY(-2px);box-shadow:0 4px 16px rgba(248,81,73,0.15)}

/* CMD ACTION BTNS */
.cmd-action-btn{font-size:10px;padding:3px 8px;border:none;background:var(--accent);color:#0d1117;border-radius:7px;cursor:pointer;font-weight:600;font-family:inherit;transition:all var(--transition);line-height:1.5}
.cmd-action-btn:hover{background:var(--accent-hover);transform:translateY(-1px);box-shadow:0 2px 8px rgba(245,158,11,0.25)}
.cmd-action-btn:active{transform:scale(0.95)}

/* DETAIL MODAL */
.detail-field{margin-bottom:12px}
.detail-label{display:block;font-size:10px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
.detail-value{font-size:13px;color:var(--text);word-break:break-all;line-height:1.5}
.detail-code{font-family:var(--font-mono);font-size:13px;color:var(--accent);background:var(--accent-dim);padding:5px 10px;border-radius:8px;display:inline-block;word-break:break-all;max-width:100%}
.detail-maquina{font-weight:600;color:var(--accent)}
.detail-path{word-break:break-all;font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)}

/* OS SELECTOR */
.os-selector{display:flex;gap:0;margin-bottom:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.os-tab{flex:1;padding:7px 10px;background:var(--bg);border:none;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;transition:all var(--transition);text-align:center;font-family:inherit}
.os-tab:not(:last-child){border-right:1px solid var(--border)}
.os-tab.active{background:var(--accent-dim);color:var(--accent)}
.os-tab:hover:not(.active){background:var(--surface-hover);color:var(--text)}

/* PASOS GUIDE */
.pasos-guide{display:flex;flex-direction:column;gap:10px}
.paso{display:flex;gap:10px;align-items:flex-start;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)}
.paso-num{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#0d1117;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;box-shadow:0 2px 8px rgba(245,158,11,0.25)}
.paso-texto{flex:1;min-width:0}
.paso-texto strong{font-size:13px;color:var(--text);display:block;margin-bottom:4px}
.paso-texto p{margin:0 0 4px;font-size:12px;color:var(--text-secondary);line-height:1.6}
.paso-code{display:block;font-family:var(--font-mono);font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--accent);margin-top:4px;overflow-x:auto}
.paso-nota{font-size:11px;color:var(--text-secondary);font-style:italic;margin-top:4px}
.paso-nota code{font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);background:var(--surface-hover);padding:1px 5px;border-radius:4px}

/* TOAST */
.toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--accent);color:#0d1117;font-size:12px;font-weight:600;padding:8px 18px;border-radius:10px;z-index:2000;opacity:0;transition:opacity 200ms ease;pointer-events:none;box-shadow:0 4px 16px rgba(245,158,11,0.3);white-space:nowrap}
.toast.show{opacity:1}
.toast.toast-undo{pointer-events:auto;cursor:default;padding:8px 14px}
.toast-undo-btn{background:rgba(0,0,0,0.2);border:none;color:#0d1117;font-weight:800;font-size:12px;padding:3px 10px;border-radius:6px;cursor:pointer;margin-left:8px;font-family:inherit;transition:all 100ms ease}
.toast-undo-btn:hover{background:rgba(0,0,0,0.35)}

@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateY(-12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.spin{animation:spin 1s linear infinite}

/* RESPONSIVE */
@media(max-width:480px){
  .tabs{overflow-x:auto;gap:0}
  .tab{padding:8px 10px;font-size:11px}
  .tab.active::after{left:6px;right:6px}
  .tab-count{display:none}
  .content{padding:0 8px 12px}
  .toolbar{gap:4px;margin:4px 0}
  .toolbar .search-bar{min-width:80px;flex:1 1 100%;order:-1}
  .machine-select{font-size:11px;padding:5px 6px 5px 24px;max-width:140px}
  .machine-select-icon{width:12px;height:12px;left:6px}
  .view-btn{font-size:10px;padding:3px 6px}
  .toolbar-btn{font-size:10px;padding:4px 6px}
  .panel-header{padding:8px 0 4px}
  .panel-header h2{font-size:13px}
  .cmd-item{padding:8px 10px}
  .cmd-code{font-size:11px;padding:2px 6px}
  .folder-item{padding:10px 12px;gap:10px}
  .folder-icon{width:30px;height:30px}
  .folder-icon svg{width:16px;height:16px}
  .note-item{padding:10px 12px;gap:10px}
  .note-icon{width:30px;height:30px}
  .note-icon svg{width:16px;height:16px}
  .navbar{padding:6px 8px}
  .navbar-btn{font-size:10px;padding:4px 6px}
  .user-avatar{width:20px;height:20px;font-size:10px}
  .user-label-1{font-size:10px;max-width:80px}
  .modal-box{width:96%;max-width:none;margin:0 8px}
  .profile-panel{right:8px;width:240px}
  .navbar-logo{font-size:12px}
  .navbar-logo svg{width:14px;height:14px}
}
@media(min-width:481px)and(max-width:768px){
  .content{padding:0 12px 14px}
  .machine-select{max-width:150px}
}
@media(min-width:769px){
  .content{padding:0 20px 20px}
  .toolbar{gap:10px}
  .cmd-item{padding:12px 16px}
  .folder-item{padding:16px 20px}
  .note-item{padding:16px 20px}
  .folder-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px}
  #noteList{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px}
}
</style></head>
<body>

<!-- ===== LOGIN VIEW ===== -->
<div id="loginView">
  <div class="auth-bg"></div>
  <div class="auth-card">
    <div class="auth-card-header">
      <div class="auth-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
      <h1>STACY</h1>
      <p class="auth-tagline">Historial de Comandos</p>
    </div>
    <div class="auth-body">
      <div class="auth-tabs">
        <button id="tab-login" class="auth-tab active">Iniciar sesion</button>
        <button id="tab-register" class="auth-tab">Registrarse</button>
      </div>
      <form id="login-form" class="auth-form">
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input type="text" id="login-user" placeholder="Usuario" required autofocus>
        </div>
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="login-pass" placeholder="Contrasena" required>
        </div>
        <button type="submit" id="login-btn">Ingresar</button>
      </form>
      <form id="register-form" class="auth-form" style="display:none">
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <input type="text" id="reg-user" placeholder="Usuario" required>
        </div>
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <input type="text" id="reg-apellidos" placeholder="Apellidos" required>
        </div>
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <input type="email" id="reg-correo" placeholder="Correo" required>
        </div>
        <div class="input-group">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="reg-pass" placeholder="Contrasena" required>
        </div>
        <button type="submit" id="reg-btn">Registrarse</button>
      </form>
      <div class="auth-divider"><span>o continua con</span></div>
      <button id="google-login-btn" class="btn-google" type="button">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <span>Continuar con Google</span>
      </button>
      <div class="auth-message" id="auth-msg"></div>
    </div>
  </div>
</div>

<!-- ===== DASHBOARD VIEW ===== -->
<div id="dashboardView" style="display:none">

<nav class="navbar">
  <div class="navbar-brand">
    <span class="navbar-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      STACY
    </span>
  </div>
  <div class="navbar-user">
    <button class="navbar-btn" data-action="bajar" title="Bajar comandos de este equipo"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Bajar comandos</button>
    <button id="themeToggleBtn" class="theme-btn" title="Cambiar tema"><svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
    <div class="user-trigger">
      <span class="user-label-1"></span>
      <span class="user-avatar"></span>
    </div>
  </div>
</nav>

<div class="profile-overlay" id="profileOverlay"></div>
<div class="profile-panel" id="profilePanel"></div>

<div class="tabs">
  <button class="tab active" data-tab="commands">COMANDOS <span class="tab-count">0</span></button>
  <button class="tab" data-tab="folders">CARPETAS <span class="tab-count">0</span></button>
  <button class="tab" data-tab="notes">NOTAS <span class="tab-count">0</span></button>
</div>

<div class="content">
  <!-- COMMANDS -->
  <div class="panel active" id="panel-commands">
    <div class="toolbar">
      <div class="search-bar"><input type="text" id="cmdSearch" placeholder="Filtrar comandos..."></div>
      <div class="machine-select-wrap">
        <svg class="machine-select-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
        <select class="machine-select" id="machineFilter">
          <option value="">Todas las maquinas</option>
        </select>
      </div>
      <div class="view-toggle">
        <button class="view-btn active" data-v="all">Todos</button>
        <button class="view-btn" data-v="recent">Ultimos 11</button>
      </div>
      <button id="refresh-btn" class="toolbar-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Actualizar
      </button>
    </div>
    <div class="panel-header">
      <h2 id="panelTitle">Todos los comandos</h2>
    </div>
    <div class="cmd-list" id="cmdList"><div class="skeleton" style="height:48px"></div><div class="skeleton" style="height:48px;margin-top:6px"></div><div class="skeleton" style="height:48px;margin-top:6px"></div><div class="skeleton" style="height:48px;margin-top:6px"></div></div>
  </div>

  <!-- FOLDERS -->
  <div class="panel" id="panel-folders">
    <div class="folder-back" id="folderBack" style="display:none">← Volver a carpetas</div>
    <div id="folderListPanel">
      <div class="panel-header"><h2>Carpetas</h2><button id="create-folder-btn" class="action-btn">+</button></div>
      <div class="folder-list" id="folderList"><div class="skeleton" style="height:60px"></div><div class="skeleton" style="height:60px;margin-top:6px"></div></div>
    </div>
    <div id="folderCmdPanel" style="display:none">
      <div class="panel-header"><h2 id="folderCmdTitle">Carpeta</h2></div>
      <div class="toolbar" style="margin:4px 0;flex-wrap:nowrap">
        <div class="search-bar"><input type="text" id="folderCmdSearch" placeholder="Buscar comando para anadir..." autocomplete="off"></div>
      </div>
      <div id="folderAddSuggestions" style="display:none"></div>
      <div class="folder-filter-bar"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="folderFilterInput" placeholder="Filtrar comandos de esta carpeta..." autocomplete="off"></div>
      <div class="cmd-list" id="folderCmdList"></div>
    </div>
  </div>

  <!-- NOTES -->
  <div class="panel" id="panel-notes">
    <div class="panel-header">
      <h2>Notas</h2>
      <button id="create-note-btn" class="action-btn">+</button>
    </div>
    <div id="noteList"><div class="skeleton" style="height:60px"></div><div class="skeleton" style="height:60px;margin-top:6px"></div></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<!-- MODALS -->
<div class="modal-overlay" id="noteModal" style="display:none">
  <div class="modal-box">
    <div class="modal-header">
      <h3 id="noteModalTitle">Nota</h3>
      <button id="closeNoteBtn" class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="noteId">
      <!-- VIEW MODE -->
      <div id="noteViewMode">
        <div class="note-view-title" id="noteViewTitle"></div>
        <div class="note-view-content" id="noteViewContent"></div>
      </div>
      <!-- EDIT MODE -->
      <div id="noteEditMode" style="display:none">
        <input type="text" class="modal-input" id="noteTitle" placeholder="Titulo de la nota">
        <textarea class="modal-textarea" id="noteContent" placeholder="Escribe tu nota aqui..." style="min-height:140px"></textarea>
      </div>
    </div>
    <div class="modal-footer" id="noteViewFooter">
      <button id="noteCancelBtn" class="modal-btn modal-btn-outline">Cancelar</button>
      <button id="noteEditBtn" class="modal-btn">Editar</button>
    </div>
    <div class="modal-footer" id="noteEditFooter" style="display:none">
      <button class="modal-btn modal-btn-danger" id="noteDelBtn" style="margin-right:auto">Eliminar</button>
      <button id="noteCancelEditBtn" class="modal-btn modal-btn-outline">Cancelar</button>
      <button id="noteSaveBtn" class="modal-btn">Guardar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="detailModal" style="display:none">
  <div class="modal-box" style="max-width:440px">
    <div class="modal-header">
      <h3>Detalles del comando</h3>
      <button id="closeDetailBtn" class="modal-close">&times;</button>
    </div>
    <div class="modal-body" id="detailModalBody">
      <div class="detail-field"><span class="detail-label">Comando</span><code class="detail-code" id="detailCmdCode"></code></div>
      <div class="detail-field"><span class="detail-label">Maquina</span><span class="detail-value detail-maquina" id="detailMaquina"></span></div>
      <div class="detail-field"><span class="detail-label">Hora</span><span class="detail-value" id="detailHora"></span></div>
      <div class="detail-field"><span class="detail-label">Ruta</span><span class="detail-value detail-path" id="detailRuta"></span></div>
      <div class="detail-field" id="detailDescField" style="display:none">
        <span class="detail-label">Descripcion</span>
        <textarea class="modal-textarea" id="detailDescInput" placeholder="Anade una descripcion para este comando en esta carpeta..." style="min-height:60px;margin-top:2px"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button id="detailCloseBtn" class="modal-btn modal-btn-outline">Cerrar</button>
      <button class="modal-btn" id="detailSaveDescBtn" style="display:none">Guardar descripcion</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="bajarModal" style="display:none">
  <div class="modal-box" style="max-width:440px">
    <div class="modal-header">
      <h3>Bajar comandos de este equipo</h3>
      <button id="closeBajarBtn" class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="os-selector">
        <button class="os-tab active" data-os="linux">Linux / Mac</button>
        <button class="os-tab" data-os="windows">Windows</button>
      </div>
      <div id="pasosContent"></div>
    </div>
    <div class="modal-footer">
      <button id="closeBajarCancelBtn" class="modal-btn modal-btn-outline">Cerrar</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="folderModal" style="display:none">
  <div class="modal-box" style="max-width:360px">
    <div class="modal-header">
      <h3 id="folderModalTitle">Nueva carpeta</h3>
      <button id="closeFolderBtn" class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <input type="text" class="modal-input" id="folderNameInput" placeholder="Nombre de la carpeta">
      <textarea class="modal-textarea" id="folderDescInput" placeholder="Descripcion..." style="min-height:60px;margin-top:6px"></textarea>
    </div>
    <div class="modal-footer">
      <button id="folderCancelBtn" class="modal-btn modal-btn-outline">Cancelar</button>
      <button id="folderSaveBtn" class="modal-btn">Crear</button>
    </div>
  </div>
</div>

</div><!-- end dashboardView -->

<script nonce="${nonce}" src="${scriptUri}"></script>
</body></html>`;
}

// ============ PROVIDER ============

class StacyWebViewProvider {
  constructor(uri, client) {
    this._uri = uri;
    this._client = client;
    this._auth = null;
    this._ctx = null;
    this._view = null;
    this._ready = false;
    this._rc = [];
    this._ac = [];
    this._folders = [];
    this._fcc = {};
    this._notes = [];
    this._prof = null;
    this._user = '';
    this._loginErr = '';
  }

  setAuth(auth, ctx) { this._auth = auth; this._ctx = ctx; }

  resolveWebviewView(v) {
    this._view = v;
    this._ready = false;
    v.webview.options = { enableScripts: true, localResourceRoots: [this._uri] };
    const scriptPath = vscode.Uri.joinPath(this._uri, 'media', 'webview.js');
    const scriptUri = v.webview.asWebviewUri(scriptPath);
    const nonce = getNonce();
    const content = getWebViewContent(scriptUri, nonce);
    console.log('[STACY] resolveWebviewView: setting webview html length=' + (typeof content === 'string' ? content.length : 0) + ' scriptUri=' + scriptUri);
    v.webview.html = content;

    v.webview.onDidReceiveMessage(async (msg) => {
      console.log('[STACY] msg received type=' + (msg?msg.type:'null'));
      if (!msg || !msg.type) return;

      if (msg.type === 'ready') {
        this._ready = true;
        console.log('[STACY] webview ready, _update will be called, _user="' + this._user + '"');
        this._update();
        return;
      }

      switch (msg.type) {
        case 'copy': vscode.env.clipboard.writeText(msg.text); break;
        case 'refresh': vscode.commands.executeCommand('stacy.refresh'); break;
        case 'logout':
          this._user = '';
          this._loginErr = '';
          vscode.commands.executeCommand('stacy.logout');
          break;
        case 'import': vscode.commands.executeCommand('stacy.importCommand'); break;
        case 'googleLogin': vscode.commands.executeCommand('stacy.googleLogin'); break;

        case 'login':
          console.log('[STACY] login msg received, _ready=' + this._ready + ' _user="' + this._user + '"');
          if (this._auth && this._ctx) {
            try {
              await this._auth.login(msg.username, msg.password, this._ctx);
              this._user = msg.username;
              this._loginErr = '';
              console.log('[STACY] login OK, calling _update, _ready=' + this._ready + ' _user="' + this._user + '"');
              // update webview state immediately and then refresh data
              try { this._update(); } catch (e) { console.error('[STACY] _update after login failed', e); }
              console.log('[STACY] calling stacy.refresh');
              vscode.commands.executeCommand('stacy.refresh');
            } catch (err) {
              console.log('[STACY] login FAILED: ' + err.message);
              this._loginErr = err.message === 'Login failed' ? 'Credenciales Incorrectas' : 'Error al iniciar sesion: ' + err.message;
              this._update();
            }
          }
          break;

        case 'register':
          try {
            await this._client.register(msg.username, msg.apellidos, msg.correo, msg.password);
            this._loginErr = '';
            if (this._auth && this._ctx) {
              await this._auth.login(msg.username, msg.password, this._ctx);
              this._user = msg.username;
              vscode.commands.executeCommand('stacy.refresh');
            }
          } catch (err) {
            this._loginErr = 'Error al registrar: ' + err.message;
            this._update();
          }
          break;

        case 'createNote':
          try { await this._client.createNote(msg.title, msg.content); vscode.commands.executeCommand('stacy.refresh'); }
          catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;
        case 'updateNote':
          try {
            console.log('[STACY] updateNote id=' + msg.id + ' title="' + msg.title + '" content_length=' + (msg.content||'').length);
            await this._client.updateNote(msg.id, msg.title, msg.content);
            vscode.commands.executeCommand('stacy.refresh');
          }
          catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;
        case 'deleteNote':
          try { await this._client.deleteNote(msg.id); vscode.commands.executeCommand('stacy.refresh'); }
          catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;

        case 'createFolder':
          try {
            await this._client.createFolder(msg.name, msg.description);
            vscode.commands.executeCommand('stacy.refresh');
          } catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;

        case 'downloadScript':
          try {
            const apiUrl = this._client.baseUrl;
            const token = this._client._token || '';
            const isWin = msg.os === 'windows';
            const fn = isWin ? 'upload_history.ps1' : 'upload_history.sh';
            let content;
            if (isWin) {
              content = 'Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force\n$API_URL = "' + apiUrl + '"\n$TOKEN = \'' + token + '\'\n$HOSTNAME = $env:COMPUTERNAME\n$histFile = "$env:USERPROFILE\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt"\nif (Test-Path $histFile) {\n  Write-Host "Leyendo historial..." -ForegroundColor Cyan\n  $lines = Get-Content $histFile | Where-Object { $_ -ne "" }\n  $total = $lines.Count\n  Write-Host "Encontrados $total comandos. Subiendo en lotes de 100..." -ForegroundColor Yellow\n  $comandos = @($lines | ForEach-Object { @{ comando = $_; directorio = "[MAQUINA:$HOSTNAME] $env:USERPROFILE" } })\n  $batchSize = 100\n  $importados = 0\n  for ($i = 0; $i -lt $comandos.Count; $i += $batchSize) {\n    $end = [Math]::Min($i + $batchSize - 1, $comandos.Count - 1)\n    $batch = @($comandos[$i..$end])\n    $body = @{ comandos = $batch } | ConvertTo-Json -Depth 10 -Compress\n    $loteNum = [Math]::Floor($i / $batchSize) + 1\n    $loteTotal = [Math]::Ceiling($total / $batchSize)\n    Write-Host "  Lote $loteNum de $loteTotal..." -ForegroundColor Cyan\n    try {\n      $r = Invoke-RestMethod -Uri "$API_URL/comandos/importar" -Method Post -Headers @{ Authorization = "Bearer $TOKEN" } -ContentType "application/json" -Body $body -TimeoutSec 120\n      $importados += $r.importados\n      Write-Host "  +$($r.importados) importados" -ForegroundColor Green\n    } catch {\n      Write-Host "  Error en lote: $_" -ForegroundColor Red\n    }\n  }\n  Write-Host "Listo! $importados comandos importados de $total." -ForegroundColor Green\n} else {\n  Write-Host "No se encontro el historial en $histFile" -ForegroundColor Red\n}\n';
            } else {
              content = '#!/bin/bash\nAPI_URL="' + apiUrl + '"\nTOKEN=\'' + token + '\'\nHOSTNAME=$(hostname 2>/dev/null || echo "unknown")\n\nif [ -f ~/.bash_history ] || [ -f ~/.zsh_history ]; then\n  for f in ~/.bash_history ~/.zsh_history; do\n    [ ! -f "$f" ] && continue\n    echo "Leyendo $f..."\n    lines=$(grep -v "^\s*$" "$f" | tac 2>/dev/null || grep -v "^\s*$" "$f")\n    total=$(echo "$lines" | wc -l)\n    echo "Encontrados $total comandos. Subiendo..."\n    json="{\\"comandos\\":["\n    first=true\n    while IFS= read -r line; do\n      [ -z "$line" ] && continue\n      $first && first=false || json="$json,"\n      esc=$(echo "$line" | sed \'s/"/\\\\"/g\' | sed ":a;N;$!ba;s/\\n/\\\\n/g")\n      json="$json{\\"comando\\":\\"$esc\\",\\"directorio\\":\\"[MAQUINA:$HOSTNAME] $HOME\\"}"\n    done <<< "$lines"\n    json="$json]}"\n    curl -s --max-time 120 -X POST "$API_URL/comandos/importar" \\\n      -H "Authorization: Bearer $TOKEN" \\\n      -H "Content-Type: application/json" \\\n      -d "$json"\n    echo -e "\\nListo! Comandos de $f importados."\n  done\nelse\n  echo "No se encontro historial en ~/.bash_history ni ~/.zsh_history"\nfi\n';
            }
            const os = require('os');
            const path = require('path');
            const fs = require('fs');
            const child_process = require('child_process');
            const home = os.homedir();
            let outDir = home;
            if (isWin) {
              try {
                outDir = child_process.execSync(
                  'powershell -Command "[Environment]::GetFolderPath(\'UserProfile\') + \'\\\\Downloads\'"',
                  { encoding: 'utf8', timeout: 3000 }
                ).trim();
              } catch (e) {}
            }
            if (outDir === home || !fs.existsSync(outDir)) {
              const candidates = isWin
                ? ['Downloads', 'Descargas', 'Download', 'Téléchargements', '下載', 'Scaricati', 'Heruntergeladene']
                : ['Downloads', 'Descargas', 'Escritorio', 'Desktop', ''];
              for (const c of candidates) {
                const p = c ? path.join(home, c) : home;
                if (fs.existsSync(p)) { outDir = p; break; }
              }
            }
            const outPath = path.join(outDir, fn);
            fs.writeFileSync(outPath, content);
            if (!isWin) fs.chmodSync(outPath, 0o755);
            const open = await vscode.window.showInformationMessage(
              'Script guardado en: ' + outPath,
              'Ejecutar ahora'
            );
            if (open === 'Ejecutar ahora') {
              const terminal = vscode.window.createTerminal('STACY Upload');
              terminal.show();
              if (isWin) {
                terminal.sendText('powershell -ExecutionPolicy Bypass -Command "& \'' + outPath + '\'; Read-Host \'Presiona Enter\'"', true);
              } else {
                terminal.sendText('cd "' + outDir + '" && bash ' + fn, true);
              }
            }
          } catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;

        case 'assignCommand':
          try {
            await this._client.assignCommandToFolder(msg.comandoId, msg.carpetaId);
            vscode.commands.executeCommand('stacy.refresh');
          } catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;
        case 'saveCommandDescription':
          try {
            await this._client.updateCommandDescription(msg.carpetaId, msg.comandoId, msg.descripcion);
            vscode.commands.executeCommand('stacy.refresh');
          } catch (err) { vscode.window.showErrorMessage('Error: ' + err.message); }
          break;
      }
    });
  }

  update(rc, ac, folders, notes, fcc, prof, user) {
    this._rc = rc || [];
    this._ac = ac || [];
    this._folders = folders || [];
    this._notes = notes || [];
    this._fcc = fcc || {};
    this._prof = prof || null;
    if (user !== undefined) this._user = user;
    this._update();
  }

  _update() {
    if (!this._view) { console.log('[STACY] _update skipped: no _view'); return; }
    if (!this._ready) { console.log('[STACY] _update skipped: _ready=false, user="' + (this._user||'') + '"'); return; }
    const loggedIn = !!this._user;

    console.log('[STACY] _update called - ready=' + this._ready + ' view=' + !!this._view + ' loggedIn=' + loggedIn + ' user=' + (this._user||''));

    const payload = {
      type: 'setData',
      loggedIn,
      username: this._user,
      initial: this._user ? this._user[0].toUpperCase() : '',
      loginError: this._loginErr,
      allCmds: this._ac,
      fCmdCache: this._fcc,
      folders: this._folders,
      notes: this._notes
    };

    if (loggedIn) {
      payload.html = {
        cmdItems: renderCmdItems(this._ac),
        folderItems: renderFolderItems(this._folders),
        noteItems: renderNoteItems(this._notes),
        profilePanel: renderProfile(this._prof, this._user)
      };
    }

    console.log('[STACY] _update posting setData loggedIn=' + loggedIn + ' cmds=' + (this._ac||[]).length);
    this._view.webview.postMessage(payload);
  }
}

module.exports = StacyWebViewProvider;
