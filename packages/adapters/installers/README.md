# Desktop Login Startup Artifacts

These files are installer-facing templates for PRD-11 startup behavior.

## Purpose

- Launch the desktop client automatically at user login.
- Run once, fetch question availability, submit outcome, then exit.
- Avoid persistent tray/background runtime.

## Files

- `macos/com.in_the_loop.desktop_login.plist`:
  LaunchAgent template for login-time execution.
- `windows/register-startup.ps1`:
  Adds/removes per-user startup registration under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- `linux/in-the-loop-desktop-login.desktop`:
  XDG autostart entry template.

## Installer integration notes

- macOS installer should deploy the plist and load it for the logged-in user context.
- Windows installer should call the registration script (or equivalent MSI/WiX table action).
- Linux installer should place the desktop entry into `/etc/xdg/autostart` (system-wide) or user autostart path.
