const vscode = require('vscode');

function getCommandLabel(cmd) {
  return cmd.comando || cmd.comando_ejecutado || cmd.command || cmd.text || cmd.nombre || cmd.name || cmd.cmd || 'Unknown';
}

function getCommandDate(cmd) {
  return cmd.fecha_ejecucion || cmd.fecha || cmd.date || cmd.created_at || cmd.timestamp || cmd.ejecutado_en || '';
}

function getCommandDir(cmd) {
  return cmd.directorio || cmd.directory || cmd.dir || cmd.path || cmd.ruta || cmd.folder || '';
}

class CommandItem extends vscode.TreeItem {
  constructor(command) {
    const label = getCommandLabel(command);
    super(label, vscode.TreeItemCollapsibleState.None);

    const fecha = getCommandDate(command);
    const dir = getCommandDir(command);
    const id = command.id || '';

    this.description = fecha;
    this.tooltip = new vscode.MarkdownString(
      `**Comando:** \`${label}\`\n\n**Fecha:** ${fecha}\n\n**Directorio:** ${dir}\n${id ? `**ID:** ${id}` : ''}\n\n\`\`\`json\n${JSON.stringify(command, null, 2)}\n\`\`\``
    );
    this.tooltip.isTrusted = true;
    this.iconPath = new vscode.ThemeIcon('terminal', new vscode.ThemeColor('charts.yellow'));
    this.contextValue = 'command';

    this.command = {
      command: 'stacy.copyCommand',
      title: 'Copy command',
      arguments: [label]
    };
  }
}

class CommandsProvider {
  constructor(client) {
    this._client = client;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this._commands = [];
    this._loading = false;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async loadCommands() {
    this._loading = true;
    this._onDidChangeTreeData.fire();
    try {
      const data = await this._client.getRecentCommands();
      if (Array.isArray(data)) {
        this._commands = data;
      } else if (data && typeof data === 'object') {
        this._commands = data.comandos || data.commands || data.datos || data.data || data.historial || [];
      } else {
        this._commands = [];
      }
      if (!Array.isArray(this._commands)) this._commands = [];
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to load commands: ${err.message}`);
      this._commands = [];
    }
    this._loading = false;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    if (this._loading) {
      const item = new vscode.TreeItem('Loading...', vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('loading~spin');
      return [item];
    }
    if (this._commands.length === 0) {
      const item = new vscode.TreeItem('No commands found. Login and sync first.', vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('info');
      item.tooltip = 'Use STACY: Login to authenticate, then sync your commands.';
      return [item];
    }
    return this._commands.map(cmd => new CommandItem(cmd));
  }
}

module.exports = CommandsProvider;
