/* global acquireVsCodeApi */
var vsc=acquireVsCodeApi();
var _allCmds=[], _fCmds={}, _folders=[];
var _curView='all';
var _folderCmds=[];
var _currentFolderId=0;

function initWebview(){
  var loginForm=document.getElementById('login-form');
  if(loginForm) loginForm.addEventListener('submit', doLogin);
  var registerForm=document.getElementById('register-form');
  if(registerForm) registerForm.addEventListener('submit', doRegister);
  var googleButton=document.getElementById('google-login-btn');
  if(googleButton) googleButton.addEventListener('click', doGoogleLogin);
}
initWebview();

// ============ MESSAGE HANDLER ============
window.addEventListener('message',function(e){
  var msg=e.data;
  if(msg.type==='downloadComplete'){
    var btn=document.getElementById('downloadScriptBtn');
    if(btn){btn.disabled=false;btn.textContent=btn.getAttribute('data-orig')||'Descargar script'}
    return
  }
  if(msg.type!=='setData')return;
  _allCmds=msg.allCmds||[];
  _fCmds=msg.fCmdCache||{};
  _folders=msg.folders||[];

  if(msg.loggedIn){
    document.getElementById('loginView').style.display='none';
    document.getElementById('dashboardView').style.display='';
    startAutoRefresh();

    if(msg.html){
      if(msg.html.cmdItems)document.getElementById('cmdList').innerHTML=msg.html.cmdItems;
      if(msg.html.folderItems)document.getElementById('folderList').innerHTML=msg.html.folderItems;
      if(msg.html.noteItems)document.getElementById('noteList').innerHTML=msg.html.noteItems;
      if(msg.html.profilePanel)document.getElementById('profilePanel').innerHTML=msg.html.profilePanel;
    }
    if(msg.username){
      var ul=document.querySelector('.user-label-1');
      if(ul)ul.textContent=msg.username;
      var ua=document.querySelector('.user-avatar');
      if(ua)ua.textContent=msg.initial||msg.username[0];
    }
    var t=document.querySelectorAll('.tab');
    if(t.length>=3){
      t[0].querySelector('.tab-count').textContent=msg.allCmds?msg.allCmds.length:0;
      t[1].querySelector('.tab-count').textContent=msg.folders?msg.folders.length:0;
      t[2].querySelector('.tab-count').textContent=msg.notes?msg.notes.length:0;
    }
    var lb=document.getElementById('login-btn');
    if(lb){lb.disabled=false;lb.textContent='Ingresar'}
    var rb=document.getElementById('reg-btn');
    if(rb){rb.disabled=false;rb.textContent='Registrarse'}
  }else{
    document.getElementById('loginView').style.display='';
    document.getElementById('dashboardView').style.display='none';
    stopAutoRefresh();
    var am=document.getElementById('auth-msg');
    if(am)am.textContent=msg.loginError||'';
    lb=document.getElementById('login-btn');
    if(lb){lb.disabled=false;lb.textContent='Ingresar'}
    rb=document.getElementById('reg-btn');
    if(rb){rb.disabled=false;rb.textContent='Registrarse'}
    document.getElementById('login-user').value='';
    document.getElementById('login-pass').value='';
    document.getElementById('reg-user').value='';
    document.getElementById('reg-apellidos').value='';
    document.getElementById('reg-correo').value='';
    document.getElementById('reg-pass').value='';
  }

  renderCmds();
  rebuildMachineFilter();
  var fcp=document.getElementById('folderCmdPanel');
  if(fcp&&fcp.style.display!=='none'&&_currentFolderId)renderFolderCmdList();
});

vsc.postMessage({type:'ready'});

// ============ EVENT DELEGATION ============
document.addEventListener('click',function(e){
  var t=e.target;

  // Profile panel
  if(t.closest('.profile-overlay')){closeProfile();return}
  if(t.closest('.user-trigger')){toggleProfile();return}
  var profileItem=t.closest('.profile-item');
  if(profileItem){doBajarComandos();closeProfile();return}
  var profileLogout=t.closest('.profile-logout');
  if(profileLogout){doLogout();closeProfile();return}

  // Tab switching
  var tab=t.closest('.tab[data-tab]');
  if(tab){switchTab(tab.dataset.tab);return}

  // View toggle
  var viewBtn=t.closest('.view-btn[data-v]');
  if(viewBtn){setView(viewBtn.dataset.v);return}

  // Bajar button
  var bajarBtn=t.closest('[data-action="bajar"]');
  if(bajarBtn){doBajarComandos();return}

  // Folder back
  if(t.closest('#folderBack')){backFolders();return}

  // Folder items
  var folderCard=t.closest('.folder-item');
  if(folderCard){
    var fid=parseInt(folderCard.dataset.fid),fname=folderCard.dataset.fname;
    if(fid){openFolder(fid,fname)}
    return
  }

  // Note items
  var noteCard=t.closest('.note-item');
  if(noteCard){
    openNote(parseInt(noteCard.dataset.nid)||0,noteCard.dataset.ntitle||'',noteCard.dataset.ncontent||'');
    return
  }

  // Modal overlays
  if(t.id==='noteModal'){closeNoteModal();return}
  if(t.id==='detailModal'){closeDetailModal();return}
  if(t.id==='bajarModal'){closeBajarModal();return}
  if(t.id==='folderModal'){closeFolderModal();return}

  // Auth tabs
  if(t.id==='tab-login'){switchAuth('login');return}
  if(t.id==='tab-register'){switchAuth('register');return}

  // OS tabs in bajar modal
  var osTab=t.closest('.os-tab[data-os]');
  if(osTab){switchOS(osTab.dataset.os);return}

  // Folder add suggestions
  var suggestItem=t.closest('.suggest-item');
  if(suggestItem){
    var cid=parseInt(suggestItem.dataset.cid);
    if(cid&&_currentFolderId){
      document.getElementById('folderAddSuggestions').style.display='none';
      document.getElementById('folderCmdSearch').value='';
      vsc.postMessage({type:'assignCommand',comandoId:cid,carpetaId:_currentFolderId});
      showToast('Anadiendo comando...');
    }
    return
  }
});

// ============ SPECIFIC BUTTON LISTENERS ============
document.getElementById('refresh-btn').addEventListener('click',doRefresh);
document.getElementById('create-folder-btn').addEventListener('click',createFolder);
document.getElementById('create-note-btn').addEventListener('click',function(){openNote(0,'','')});
document.getElementById('closeNoteBtn').addEventListener('click',closeNoteModal);
document.getElementById('noteCancelBtn').addEventListener('click',closeNoteModal);
document.getElementById('noteCancelEditBtn').addEventListener('click',closeNoteModal);
document.getElementById('noteEditBtn').addEventListener('click',editNote);
document.getElementById('noteSaveBtn').addEventListener('click',saveNote);
document.getElementById('noteDelBtn').addEventListener('click',deleteNote);
document.getElementById('closeDetailBtn').addEventListener('click',closeDetailModal);
document.getElementById('detailCloseBtn').addEventListener('click',closeDetailModal);
document.getElementById('detailSaveDescBtn').addEventListener('click',saveCommandDescription);
document.getElementById('closeBajarBtn').addEventListener('click',closeBajarModal);
document.getElementById('closeBajarCancelBtn').addEventListener('click',closeBajarModal);
document.getElementById('closeFolderBtn').addEventListener('click',closeFolderModal);
document.getElementById('folderCancelBtn').addEventListener('click',closeFolderModal);
document.getElementById('folderSaveBtn').addEventListener('click',saveFolder);

// ============ CMD LIST DELEGATION (copy) ============
document.getElementById('cmdList').addEventListener('click',function(e){
  var item=e.target.closest('.cmd-item');
  if(item&&item.dataset.cmd){cpy(item.dataset.cmd)}
});

// ============ FOLDER CMD PANEL DELEGATION ============
document.getElementById('folderCmdList').addEventListener('click',function(e){
  var item=e.target.closest('.cmd-item');
  if(!item)return;
  if(e.target.closest('.cmd-action-btn'))return;
  var idx=parseInt(item.dataset.cidx);
  if(!isNaN(idx))openDetailModal(idx);
});

// ============ PROFILE ============
function toggleProfile(){
  var o=document.getElementById('profileOverlay'),p=document.getElementById('profilePanel');
  if(p.classList.contains('open')){closeProfile();return}
  o.style.display='block';p.classList.add('open');
}
function closeProfile(){document.getElementById('profileOverlay').style.display='none';document.getElementById('profilePanel').classList.remove('open')}
function doLogout(){vsc.postMessage({type:'logout'})}
function doRefresh(){vsc.postMessage({type:'refresh'})}

// ============ BAJAR MODAL ============
function doBajarComandos(){
  var m=document.getElementById('bajarModal');
  if(m){m.style.display='flex';switchOS('windows')}
}
function closeBajarModal(){document.getElementById('bajarModal').style.display='none'}
function switchOS(os){
  document.querySelectorAll('.os-tab').forEach(function(b){b.classList.remove('active')});
  document.querySelector('.os-tab[data-os="'+os+'"]').classList.add('active');
  var c=pasosHTML(os);
  document.getElementById('pasosContent').innerHTML=c;
  var btn=document.getElementById('downloadScriptBtn');
  if(btn)btn.addEventListener('click',function(){downloadScript(os)});
  var directBtn=document.getElementById('importWinDirectBtn');
  if(directBtn)directBtn.addEventListener('click',importWinDirect);
}
function importWinDirect(){
  var btn=document.getElementById('importWinDirectBtn');
  if(btn){btn.disabled=true;btn.textContent='Importando...'}
  vsc.postMessage({type:'importWindowsHistory'});
  showToast('Leyendo historial de PowerShell...')
}
function pasosHTML(os){
  var esLinux=os==='linux';
  var sn=esLinux?'upload_history.sh':'upload_history.ps1';
  var paso2=esLinux?
    '<div class="paso-texto"><strong>Ejecutalo en tu terminal</strong><p>Abre una terminal y navega a la carpeta donde se descargo el archivo (normalmente <strong>Descargas</strong>). Luego corre:</p><code class="paso-code">cd ~/Downloads && bash upload_history.sh</code><p class="paso-nota">Si lo guardaste en otra carpeta, usa <code>cd /ruta/donde/lo/guardaste</code></p><p class="paso-nota">Si es una maquina nueva, abre una terminal, ejecuta algunos comandos y <strong>cierrala</strong> para que se guarde el historial, luego ejecuta el script.</p></div>':
    '<div class="paso-texto"><strong>Ejecutalo en PowerShell</strong><p>Abre <strong>PowerShell</strong> como usuario normal y navega a la carpeta donde se descargo el archivo (normalmente <strong>Descargas</strong>). Luego corre:</p><code class="paso-code">cd ~\\Downloads && .\\upload_history.ps1</code><p class="paso-nota">Si es la primera vez, ejecuta antes: <code>Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass</code></p><p class="paso-nota">Si es una maquina nueva, abre PowerShell, ejecuta algunos comandos y <strong>cierra la ventana</strong> para que se guarde el historial, luego ejecuta el script.</p><p class="paso-nota"><strong>¿Usas WSL?</strong> Si ejecutas VS Code desde WSL (Windows Subsystem for Linux), puedes usar el boton <strong>"Importar directamente"</strong> de abajo para leer el historial de PowerShell de Windows sin descargar el script.</p></div>';
  var directBtn=esLinux?'':'<button id="importWinDirectBtn" class="modal-btn" style="width:100%;margin-top:10px">Importar directamente</button>';
  return '<div class="pasos-guide">'+
    '<div class="paso"><span class="paso-num">1</span><div class="paso-texto"><strong>Descarga el script</strong><p>Haz clic en el boton de abajo para descargar el archivo <code>'+sn+'</code> con tu token incluido.</p></div></div>'+
    '<div class="paso"><span class="paso-num">2</span>'+paso2+'</div>'+
    '<div class="paso"><span class="paso-num">3</span><div class="paso-texto"><strong>Actualiza la pagina</strong><p>Presiona <kbd>Ctrl+Shift+R</kbd> o haz clic en "Actualizar" y tus comandos apareceran con el nombre de tu maquina.</p></div></div>'+
  '</div>'+
  '<button id="downloadScriptBtn" class="modal-btn" style="width:100%;margin-top:10px">Descargar '+sn+'</button>'+
  directBtn;
}
function downloadScript(os){
  var btn=document.getElementById('downloadScriptBtn');
  if(btn){btn.setAttribute('data-orig',btn.textContent);btn.disabled=true;btn.textContent='Descargando...'}
  vsc.postMessage({type:'downloadScript',os:os});
  showToast('Guardando script en Descargas...')
}
function cpy(t){vsc.postMessage({type:'copy',text:t});showToast('Copiado!')}
function showToast(m){var e=document.getElementById('toast');e.textContent=m;e.classList.add('show');e.classList.remove('toast-undo');setTimeout(function(){e.classList.remove('show')},2000)}
function showToastUndo(m){
  var e=document.getElementById('toast');
  e.innerHTML=m+' <button class="toast-undo-btn" onclick="undoDelete()">Deshacer</button>';
  e.classList.add('show','toast-undo');
  if(window._undoTimer)clearTimeout(window._undoTimer);
  window._undoTimer=setTimeout(function(){e.classList.remove('show');e.classList.remove('toast-undo');doRealDelete()},5000);
}

// ============ COMMANDS TAB ============
function switchTab(t){
  document.querySelectorAll('.tab').forEach(function(e){e.classList.remove('active')});
  document.querySelectorAll('.panel').forEach(function(e){e.classList.remove('active')});
  document.querySelector('.tab[data-tab="'+t+'"]').classList.add('active');
  document.getElementById('panel-'+t).classList.add('active');
  if(t==='folders'){document.getElementById('folderListPanel').style.display='';document.getElementById('folderCmdPanel').style.display='none';document.getElementById('folderBack').style.display='none'}
}

function setView(v){
  _curView=v;
  document.querySelectorAll('.view-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelector('.view-btn[data-v="'+v+'"]').classList.add('active');
  document.getElementById('panelTitle').textContent=v==='all'?'Todos los comandos':'Ultimos 11 comandos';
  renderCmds();
}
var _srchTimer;
function onSearch(){clearTimeout(_srchTimer);_srchTimer=setTimeout(renderCmds,200)}
document.getElementById('cmdSearch').addEventListener('input',onSearch);
document.getElementById('folderCmdSearch').addEventListener('input',onFolderCmdSearch);

function renderCmds(){
  var q=(document.getElementById('cmdSearch').value||'').toLowerCase().trim();
  var maqFilter=document.getElementById('machineFilter').value;
  var src=_curView==='recent'?_allCmds.slice(0,11):_allCmds;
  var f=src;
  if(q)f=f.filter(function(c){return (c.comando||c.COM_NOMBRE||'').toLowerCase().indexOf(q)!==-1});
  if(maqFilter)f=f.filter(function(c){var d=c.ruta||c.COM_RUTA||'',m=(d.match(/\[MAQUINA:(.*?)\]/)||[])[1]||'Servidor';return m===maqFilter});
  var el=document.getElementById('cmdList');
  if(!f.length){el.innerHTML='<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-content"><div class="empty-title">No se encontraron comandos</div><div class="empty-desc">Intenta con otros términos de búsqueda</div></div></div>';return}
  el.innerHTML=f.map(function(c){
    var l=c.comando||c.COM_NOMBRE||c.comando_ejecutado||c.command||c.text||c.nombre||c.name||c.cmd||'Unknown';
    var fe=c.fecha||c.COM_FECHA||'';
    var d=c.ruta||c.COM_RUTA||'';
    var maq=d.match(/\[MAQUINA:(.*?)\]/);
    var maqTxt=maq?maq[1]:'Servidor';
    var dClean=d?d.replace(/\[MAQUINA:.*?\]\s*/,''):'';
    var feFmt=fe?new Date(fe.replace(' ','T')).toLocaleString('es-CO',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    return '<div class="cmd-item" data-cmd="'+l.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'">'+
      '<div class="cmd-top"><span class="cmd-maq">'+escHtml(maqTxt)+'</span>'+(feFmt?'<span class="cmd-time">'+escHtml(feFmt)+'</span>':'')+'</div>'+
      '<code class="cmd-code"><svg class="cmd-code-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>'+escHtml(l)+'</code>'+
      (dClean?'<div class="cmd-path">'+escHtml(dClean)+'</div>':'')+
    '</div>';
  }).join('');
}
function rebuildMachineFilter(){
  var sel=document.getElementById('machineFilter');
  if(!sel)return;
  var cur=sel.value;
  var machines={};
  _allCmds.forEach(function(c){var d=c.ruta||c.COM_RUTA||'',m=(d.match(/\[MAQUINA:(.*?)\]/)||[])[1]||'Servidor';machines[m]=(machines[m]||0)+1});
  var opts='<option value="">🔧 Todas las maquinas</option>';
  Object.keys(machines).sort().forEach(function(m){opts+='<option value="'+escHtml(m)+'">💻 '+escHtml(m)+' ('+machines[m]+')</option>'});
  sel.innerHTML=opts;
  if(cur)sel.value=cur;
}

// ============ FOLDERS ============
function renderFolderCmdList(){
  var fid=_currentFolderId;
  if(!fid)return;
  var cmds=_fCmds[fid]||[];
  _folderCmds=cmds;
  var el=document.getElementById('folderCmdList');
  if(!cmds.length){el.innerHTML='<div class="empty" style="margin-top:8px"><div class="empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div><div class="empty-content"><div class="empty-title">Esta carpeta está vacía</div><div class="empty-desc">Busca y agrega comandos usando el buscador de arriba</div></div></div>';return}
  el.innerHTML=cmds.map(function(c,i){
    var l=c.COM_NOMBRE||c.comando||c.comando_ejecutado||c.command||c.text||c.nombre||c.name||c.cmd||'Unknown';
    var fe=c.COM_FECHA||c.fecha||'';
    var d=c.COM_RUTA||c.ruta||'';
    var maq=d.match(/\[MAQUINA:(.*?)\]/);
    var maqTxt=maq?maq[1]:'Servidor';
    var dClean=d?d.replace(/\[MAQUINA:.*?\]\s*/,''):'';
    var feFmt=fe?new Date(fe.replace(' ','T')).toLocaleString('es-CO',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    var cleanL=l.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="cmd-item" data-cidx="'+i+'">'+
      '<div class="cmd-top"><span class="cmd-maq">'+escHtml(maqTxt)+'</span>'+(feFmt?'<span class="cmd-time">'+escHtml(feFmt)+'</span>':'')+'</div>'+
      '<code class="cmd-code">'+escHtml(l)+'</code>'+
      (dClean?'<div class="cmd-path">'+escHtml(dClean)+'</div>':'')+
      '<div style="display:flex;gap:4px;margin-top:4px">'+
        '<button class="cmd-action-btn" data-copy="'+cleanL+'">'+
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
        ' Copiar</button>'+
      '</div>'+
    '</div>';
  }).join('');
  renderFolderFilter();
}
function openFolder(fid,fname){
  _currentFolderId=fid;
  document.getElementById('folderListPanel').style.display='none';
  document.getElementById('folderCmdPanel').style.display='';
  document.getElementById('folderBack').style.display='';
  document.getElementById('folderCmdTitle').textContent=fname;
  renderFolderCmdList();
}

// Machine filter change
document.getElementById('machineFilter').addEventListener('change',renderCmds);

// ============ AUTO-REFRESH ============
var _refreshTimer;
function startAutoRefresh(){clearInterval(_refreshTimer);_refreshTimer=setInterval(doRefresh,300000)}
function stopAutoRefresh(){clearInterval(_refreshTimer)}
// Clear on logout, start on first setData with loggedIn
var _origSetData = window.addEventListener;
// Hook into message handler to start auto-refresh after login

// ============ THEME TOGGLE ============
document.getElementById('themeToggleBtn').addEventListener('click',function(){
  var hasLight=document.body.classList.contains('stacy-light');
  var hasDark=document.body.classList.contains('stacy-dark');
  if(!hasLight&&!hasDark){
    if(document.body.classList.contains('vscode-dark')){
      document.body.classList.add('stacy-light');
      localStorage.setItem('stacy-theme','light');
    }else{
      document.body.classList.add('stacy-dark');
      localStorage.setItem('stacy-theme','dark');
    }
  }else{
    document.body.classList.remove('stacy-light','stacy-dark');
    localStorage.removeItem('stacy-theme');
  }
});
// Restore saved theme
(function(){
  var saved=localStorage.getItem('stacy-theme');
  if(saved==='light')document.body.classList.add('stacy-light');
  else if(saved==='dark')document.body.classList.add('stacy-dark');
})();

// Copy button delegation for folder cmd list
document.getElementById('folderCmdList').addEventListener('click',function(e){
  var copyBtn=e.target.closest('.cmd-action-btn[data-copy]');
  if(copyBtn){cpy(copyBtn.dataset.copy);return}
});

function backFolders(){
  document.getElementById('folderListPanel').style.display='';
  document.getElementById('folderCmdPanel').style.display='none';
  document.getElementById('folderBack').style.display='none';
}
function cId(c){return c.COM_ID||c.id||c.comando_id||c.cmd_id||c.com_id||0}
var _folderSrchTimer;
function onFolderCmdSearch(){
  clearTimeout(_folderSrchTimer);
  _folderSrchTimer=setTimeout(function(){
    var q=(document.getElementById('folderCmdSearch').value||'').trim();
    var box=document.getElementById('folderAddSuggestions');
    if(!q){box.style.display='none';return}
    var fid=_currentFolderId;
    var existing=(_fCmds[fid]||[]).map(function(c){return cId(c)});
    var hits=_allCmds.filter(function(c){return cId(c)&&existing.indexOf(cId(c))===-1&&((c.comando||c.COM_NOMBRE||'').toLowerCase().indexOf(q.toLowerCase())!==-1)}).slice(0,8);
    if(!hits.length){box.innerHTML='<div class="folder-add-suggest"><div class="empty-suggest"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> No se encontraron comandos</div></div>';box.style.display='';return}
    box.innerHTML='<div class="folder-add-suggest">'+hits.map(function(c){
      var cl=c.comando||c.COM_NOMBRE||'';
      var r=c.ruta||c.COM_RUTA||'';
      return '<div class="suggest-item" data-cid="'+cId(c)+'" data-ctext="'+escHtml(cl)+'">'+
        '<div class="suggest-cmd">'+escHtml(cl)+'</div>'+
        (r?'<div class="suggest-path">'+escHtml(r.replace(/\[MAQUINA:.*?\]\s*/,''))+'</div>':'')+
      '</div>';
    }).join('')+'</div>';
    box.style.display='';
  },150);
}

// ============ FOLDER FILTER ============
var _folderFilterTimer;
document.getElementById('folderFilterInput').addEventListener('input',function(){
  clearTimeout(_folderFilterTimer);
  _folderFilterTimer=setTimeout(renderFolderFilter,200);
});
function renderFolderFilter(){
  var q=(document.getElementById('folderFilterInput').value||'').toLowerCase().trim();
  var items=document.querySelectorAll('#folderCmdList .cmd-item');
  items.forEach(function(el){
    var text=(el.textContent||'').toLowerCase();
    el.style.display=(!q||text.indexOf(q)!==-1)?'':'none';
  });
}
// Override openFolder to clear filter
var _origOpenFolder=openFolder;
openFolder=function(fid,fname){
  document.getElementById('folderFilterInput').value='';
  _origOpenFolder(fid,fname);
};

// ============ NOTES ============
function openNote(id,title,content){
  document.getElementById('noteModalTitle').textContent=id?'Nota':'Nueva nota';
  document.getElementById('noteId').value=id;
  document.getElementById('noteTitle').value=title;
  document.getElementById('noteContent').value=content;
  document.getElementById('noteViewTitle').textContent=title||'Sin titulo';
  document.getElementById('noteViewContent').textContent=content||'Sin contenido';
  if(id){
    document.getElementById('noteViewMode').style.display='';
    document.getElementById('noteEditMode').style.display='none';
    document.getElementById('noteViewFooter').style.display='';
    document.getElementById('noteEditFooter').style.display='none';
  }else{
    document.getElementById('noteViewMode').style.display='none';
    document.getElementById('noteEditMode').style.display='';
    document.getElementById('noteViewFooter').style.display='none';
    document.getElementById('noteEditFooter').style.display='';
    document.getElementById('noteDelBtn').style.display='none';
  }
  document.getElementById('noteModal').style.display='flex';
  if(!id)setTimeout(function(){document.getElementById('noteTitle').focus()},100);
}
function closeNoteModal(){
  document.getElementById('noteModal').style.display='none';
  document.getElementById('noteViewMode').style.display='';
  document.getElementById('noteEditMode').style.display='none';
  document.getElementById('noteViewFooter').style.display='';
  document.getElementById('noteEditFooter').style.display='none';
}
function editNote(){
  document.getElementById('noteViewMode').style.display='none';
  document.getElementById('noteEditMode').style.display='';
  document.getElementById('noteViewFooter').style.display='none';
  document.getElementById('noteEditFooter').style.display='';
  var id=parseInt(document.getElementById('noteId').value)||0;
  document.getElementById('noteDelBtn').style.display=id?'':'none';
  setTimeout(function(){document.getElementById('noteTitle').focus()},100);
}
function saveNote(){
  var id=parseInt(document.getElementById('noteId').value)||0;
  var t=document.getElementById('noteTitle').value.trim(),c=document.getElementById('noteContent').value;
  if(!t){showToast('El titulo es obligatorio');document.getElementById('noteTitle').focus();return}
  closeNoteModal();
  vsc.postMessage({type:id?'updateNote':'createNote',id:id,title:t,content:c});
  showToast(id?'Nota actualizada':'Nota creada');
}
var _undoData=null;
function deleteNote(){
  var id=parseInt(document.getElementById('noteId').value)||0;
  if(!id)return;
  closeNoteModal();
  var title=document.getElementById('noteTitle').value;
  var content=document.getElementById('noteContent').value;
  _undoData={type:'note',id:id,title:title,content:content};
  showToastUndo('Nota eliminada');
}
function doRealDelete(){
  if(!_undoData)return;
  vsc.postMessage({type:'deleteNote',id:_undoData.id});
  _undoData=null;
}
function undoDelete(){
  if(!_undoData||_undoData.type!=='note')return;
  var title=_undoData.title||'Sin titulo';
  var content=_undoData.content||'';
  var preview=content.replace(/\n/g,' ').substring(0,80);
  var date=new Date().toLocaleDateString('es-CO',{month:'short',day:'numeric'});
  var el=document.getElementById('noteList');
  var div=document.createElement('div');
  div.className='note-item';
  div.dataset.nid=_undoData.id;
  div.dataset.ntitle=title;
  div.dataset.ncontent=content;
  div.innerHTML='<div class="note-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><line x1="9" y1="9" x2="10" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div><div class="note-info"><div class="note-title">'+escHtml(title)+'</div>'+(preview?'<div class="note-preview">'+escHtml(preview)+'</div>':'')+'</div><div class="note-date">'+date+'</div>';
  el.insertBefore(div,el.firstChild);
  var countEl=document.querySelector('.tab[data-tab="notes"] .tab-count');
  if(countEl)countEl.textContent=parseInt(countEl.textContent||'0')+1;
  _undoData=null;
  showToast('Nota restaurada');
}
function escHtml(t){if(!t)return '';return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ============ FOLDER CRUD ============
function createFolder(){
  document.getElementById('folderModalTitle').textContent='Nueva carpeta';
  document.getElementById('folderNameInput').value='';
  document.getElementById('folderDescInput').value='';
  document.getElementById('folderModal').style.display='flex';
  setTimeout(function(){document.getElementById('folderNameInput').focus()},100);
}
function closeFolderModal(){document.getElementById('folderModal').style.display='none'}
function saveFolder(){
  var n=document.getElementById('folderNameInput').value.trim();
  if(!n){showToast('El nombre es obligatorio');document.getElementById('folderNameInput').focus();return}
  closeFolderModal();
  vsc.postMessage({type:'createFolder',name:n,description:document.getElementById('folderDescInput').value.trim()});
  showToast('Creando carpeta...');
}

// ============ DETAIL MODAL ============
function openDetailModal(i){
  var c=_folderCmds[i];
  if(!c)return;
  var l=c.COM_NOMBRE||c.comando||c.comando_ejecutado||c.command||c.text||c.nombre||c.name||c.cmd||'Unknown';
  var fe=c.COM_FECHA||c.fecha||'';
  var d=c.COM_RUTA||c.ruta||'';
  var maq=d.match(/\[MAQUINA:(.*?)\]/);
  var maqTxt=maq?maq[1]:'Servidor';
  var dClean=d?d.replace(/\[MAQUINA:.*?\]\s*/,''):'';
  var feFmt=fe?new Date(fe.replace(' ','T')).toLocaleString('es-CO',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'--:--';
  var desc=c.CC_DESCRIPCION||'';
  document.getElementById('detailCmdCode').textContent=l;
  document.getElementById('detailMaquina').textContent=maqTxt;
  document.getElementById('detailHora').textContent=feFmt;
  document.getElementById('detailRuta').textContent=dClean||'/';
  var descField=document.getElementById('detailDescField');
  var descInput=document.getElementById('detailDescInput');
  var saveBtn=document.getElementById('detailSaveDescBtn');
  descInput.value=desc;
  descField.style.display='';
  saveBtn.style.display='';
  saveBtn._comId=c.COM_ID||c.com_id||0;
  document.getElementById('detailModal').style.display='flex';
}
function saveCommandDescription(){
  var desc=document.getElementById('detailDescInput').value.trim();
  var comId=document.getElementById('detailSaveDescBtn')._comId||0;
  if(!comId||!_currentFolderId)return;
  closeDetailModal();
  vsc.postMessage({type:'saveCommandDescription',carpetaId:_currentFolderId,comandoId:comId,descripcion:desc});
  showToast('Guardando descripcion...');
}
function closeDetailModal(){document.getElementById('detailModal').style.display='none'}

// ============ AUTH ============
function switchAuth(m){
  document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.remove('active')});
  document.getElementById('tab-'+m).classList.add('active');
  document.getElementById('login-form').style.display=m==='login'?'':'none';
  document.getElementById('register-form').style.display=m==='register'?'':'none';
}
function doLogin(e){
  e.preventDefault();
  var u=document.getElementById('login-user').value.trim(),p=document.getElementById('login-pass').value;
  if(!u||!p)return;
  document.getElementById('login-btn').disabled=true;document.getElementById('login-btn').textContent='Ingresando...';
  vsc.postMessage({type:'login',username:u,password:p});
}
function doRegister(e){
  e.preventDefault();
  var u=document.getElementById('reg-user').value.trim(),a=document.getElementById('reg-apellidos').value.trim(),c=document.getElementById('reg-correo').value.trim(),p=document.getElementById('reg-pass').value;
  if(!u||!a||!c||!p)return;
  document.getElementById('reg-btn').disabled=true;document.getElementById('reg-btn').textContent='Registrando...';
  vsc.postMessage({type:'register',username:u,apellidos:a,correo:c,password:p});
}
function doGoogleLogin(){
  var btn=document.getElementById('google-login-btn');
  btn.disabled=true;btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" class="spin"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Conectando...';
  vsc.postMessage({type:'googleLogin'});
  setTimeout(function(){
    btn.disabled=false;
    btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continuar con Google';
  },5000)
}
