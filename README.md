# STACY - Command History Manager

VS Code extension for [STACY](https://github.com/johandavidmercado2712-glitch/STACY-PROGRAM) - command history management.

## Features

- View all your terminal commands with search and machine filter
- Browse recent commands (last 11)
- Organize commands into folders with descriptions
- Create, edit and delete notes
- Login with username/password or Google OAuth
- Persistent session across VS Code restarts
- Generate and run import scripts for Linux, macOS and Windows
- Copy any command to clipboard with one click
- Responsive dark/light theme

## Quick Start

1. Click the **STACY** icon in the activity bar (left sidebar)
2. Login or register
3. Explore your commands, folders and notes

## Importing your terminal history

1. Click the **download icon** (⬇) next to the search bar
2. Select your OS:
   - **Windows** → generates `upload_history.ps1`
   - **Linux/Mac** → generates `upload_history.sh`
3. The script is **automatically saved** to your Downloads folder
4. A notification appears — click **"Ejecutar ahora"** to run it instantly
5. The terminal opens and uploads all your commands to STACY

The script reads `~/.bash_history`/`~/.zsh_history` (Linux/Mac) or `ConsoleHost_history.txt` (Windows) and sends all commands in a single request.

## Commands

| Command | Description |
|---------|-------------|
| `STACY: Login` | Sign in with username/password |
| `STACY: Logout` | Sign out |
| `STACY: Google Login` | Sign in with Google |
| `STACY: Search Commands` | Search command history |
| `STACY: Import Current Terminal Command` | Import a command manually |
| `STACY: Copy Command` | Copy a command to clipboard |
| `STACY: Refresh` | Refresh all data |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `stacy.serverUrl` | `http://52.87.195.200:8000` | STACY backend URL |
| `stacy.maxCommands` | `50` | Max recent commands to display |
| `stacy.googleClientId` | `""` | Google OAuth Client ID |

## Requirements

- VS Code ^1.85.0
- STACY backend server
