const vscode = require('vscode');

function getField(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

class FolderItem extends vscode.TreeItem {
  constructor(folder, commandCount = 0) {
    const label = getField(folder, 'nombre', 'name', 'nombre_carpeta', 'folder_name', 'title') || 'Unnamed';
    super(label, vscode.TreeItemCollapsibleState.Collapsed);

    this.folderData = folder;
    this.contextValue = 'folder';
    this.tooltip = new vscode.MarkdownString(
      `**Carpeta:** ${label}\n\n**ID:** ${folder.id}\n\n**Comandos:** ${commandCount}\n\n\`\`\`json\n${JSON.stringify(folder, null, 2)}\n\`\`\``
    );
    this.tooltip.isTrusted = true;
    this.iconPath = new vscode.ThemeIcon('folder-active', new vscode.ThemeColor('charts.yellow'));
    this.description = `${commandCount} commands`;
    this.resourceUri = vscode.Uri.parse(`stacy:folder:${folder.id}`);
  }
}

function getCommandLabel(cmd) {
  return getField(cmd, 'comando', 'comando_ejecutado', 'command', 'comando_ejecutado', 'text', 'nombre', 'name', 'cmd') || 'Unknown';
}

function getCommandDate(cmd) {
  return getField(cmd, 'fecha_ejecucion', 'fecha', 'date', 'created_at', 'timestamp', 'ejecutado_en') || '';
}

function getCommandDir(cmd) {
  return getField(cmd, 'directorio', 'directory', 'dir', 'path', 'ruta', 'folder') || '';
}

class FolderCommandItem extends vscode.TreeItem {
  constructor(command) {
    const label = getCommandLabel(command);
    super(label, vscode.TreeItemCollapsibleState.None);

    const fecha = getCommandDate(command);
    const dir = getCommandDir(command);

    this.description = fecha || dir || '';
    this.tooltip = new vscode.MarkdownString(
      `**Comando:** \`${label}\`\n\n**Fecha:** ${fecha}\n\n**Directorio:** ${dir}\n\n\`\`\`json\n${JSON.stringify(command, null, 2)}\n\`\`\``
    );
    this.tooltip.isTrusted = true;
    this.iconPath = new vscode.ThemeIcon('terminal-view', new vscode.ThemeColor('charts.yellow'));
    this.contextValue = 'folderCommand';

    this.command = {
      command: 'stacy.copyCommand',
      title: 'Copy command',
      arguments: [label]
    };
  }
}

class FoldersProvider {
  constructor(client) {
    this._client = client;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this._folders = [];
    this._folderCommands = {};
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async loadFolders() {
    try {
      const data = await this._client.getFolders();
      if (Array.isArray(data)) {
        this._folders = data;
      } else if (data && typeof data === 'object') {
        this._folders = data.carpetas || data.folders || data.datos || data.data || [];
      } else {
        this._folders = [];
      }
      if (!Array.isArray(this._folders)) this._folders = [];

      this._folderCommands = {};
      for (const folder of this._folders) {
        if (!folder || !folder.id) continue;
        try {
          const cmds = await this._client.getFolderCommands(folder.id);
          if (Array.isArray(cmds)) {
            this._folderCommands[folder.id] = cmds;
          } else if (cmds && typeof cmds === 'object') {
            this._folderCommands[folder.id] = cmds.comandos || cmds.commands || cmds.datos || cmds.data || [];
          } else {
            this._folderCommands[folder.id] = [];
          }
        } catch {
          this._folderCommands[folder.id] = [];
        }
      }
    } catch (err) {
      if (!err.message.includes('Login')) {
        vscode.window.showErrorMessage(`Failed to load folders: ${err.message}`);
      }
      this._folders = [];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      if (this._folders.length === 0) {
        const item = new vscode.TreeItem('No folders yet', vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon('folder-opened', new vscode.ThemeColor('charts.yellow'));
        item.tooltip = 'Create folders from STACY-PROGRAM to organize your commands.';
        return [item];
      }
      return this._folders.map(f => {
        const cmds = this._folderCommands[f.id] || [];
        return new FolderItem(f, cmds.length);
      });
    }

    const folderCommands = this._folderCommands[element.folderData.id] || [];
    if (folderCommands.length === 0) {
      const item = new vscode.TreeItem('(empty folder)', vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('empty-window');
      item.tooltip = 'This folder has no commands yet.';
      return [item];
    }
    return folderCommands.map(cmd => new FolderCommandItem(cmd));
  }
}

module.exports = FoldersProvider;
