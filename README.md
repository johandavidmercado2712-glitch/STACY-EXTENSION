# STACY - Gestor de Historial de Comandos

Extensión de VS Code para [STACY](https://github.com/johandavidmercado2712-glitch/STACY-PROGRAM) — gestiona y sube el historial de comandos de tu terminal.

## Funcionalidades

- Visualiza todos tus comandos con búsqueda y filtro por máquina
- Navega por comandos recientes (últimos 11)
- Organiza comandos en carpetas con descripciones
- Crea, edita y elimina notas
- Inicia sesión con usuario/contraseña o con Google OAuth
- Sesión persistente al reiniciar VS Code
- Genera y ejecuta scripts de importación para Linux, macOS y Windows
- Copia cualquier comando al portapapeles con un clic
- Tema oscuro/claro responsive
- Subida por lotes de 100 comandos para evitar errores con historiales grandes
- Detección automática de tokens expirados con cierre de sesión automático

## Inicio rápido

1. Haz clic en el icono de **STACY** en la barra lateral izquierda
2. Inicia sesión o regístrate
3. Explora tus comandos, carpetas y notas

## Importar tu historial de terminal

1. Haz clic en el icono de **descarga** (⬇) junto a la barra de búsqueda
2. Selecciona tu sistema operativo:
   - **Windows** → genera `upload_history.ps1`
   - **Linux/Mac** → genera `upload_history.sh`
3. El script se **guarda automáticamente** en tu carpeta de Descargas
4. Aparece una notificación — haz clic en **"Ejecutar ahora"** para correrlo al instante
5. La terminal se abre y sube todos tus comandos a STACY en lotes de 100

El script lee `~/.bash_history`/`~/.zsh_history` (Linux/Mac) o `ConsoleHost_history.txt` (Windows) y los envía en lotes de 100 comandos para mayor estabilidad.

### Solución de problemas en Windows

Si el script de PowerShell se queda pegado mostrando "Subiendo en lotes de 100...":
1. Abre PowerShell como administrador
2. Ejecuta: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
3. Navega a la carpeta donde descargaste el script
4. Ejecuta: `.\upload_history.ps1`

Si el problema persiste, usa el botón **"Importar directamente"** dentro del modal de descarga (solo disponible en Windows).

## Comandos

| Comando | Descripción |
|---------|-------------|
| `STACY: Login` | Iniciar sesión con usuario/contraseña |
| `STACY: Logout` | Cerrar sesión |
| `STACY: Google Login` | Iniciar sesión con Google |
| `STACY: Search Commands` | Buscar en el historial de comandos |
| `STACY: Import Current Terminal Command` | Importar un comando manualmente |
| `STACY: Copy Command` | Copiar un comando al portapapeles |
| `STACY: Refresh` | Actualizar todos los datos |

## Configuración

| Opción | Valor por defecto | Descripción |
|--------|-------------------|-------------|
| `stacy.serverUrl` | `http://stacyprogram.online` | URL del servidor backend de STACY |
| `stacy.maxCommands` | `50` | Máximo de comandos recientes a mostrar |
| `stacy.googleClientId` | `""` | Google OAuth Client ID |

## Requisitos

- VS Code ^1.85.0
- Servidor backend de STACY
