; LuminaScreen native player for Windows — Inno Setup script (built by build.ps1).
;
; Silent install (fleet rollout / the helper's self-update):
;   LuminaScreen-Setup-X.Y.Z.exe /VERYSILENT /SERVER=https://your-server [/NAME="Lobby"]
;       [/ALLOWPACKAGES=1]
; An upgrade keeps ProgramData\LuminaScreen\config.json (server, options) and the pairing in state\.
;
; ⚠️ ACLs are the security model here, keep them as written:
;   ProgramData\LuminaScreen\config.json  — admin/SYSTEM write only. The SYSTEM helper trusts its
;                                           server_url to verify installers; a user-writable copy
;                                           would let the player user choose what SYSTEM runs.
;   ProgramData\LuminaScreen\state\       — the player users may write (pairing, cache, OTA downloads).

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{7C2B3E3A-5D0B-4B5E-9F7A-5C1D2E3F4A5B}
AppName=LuminaScreen Player
AppVersion={#AppVersion}
AppPublisher=LuminaScreen
AppPublisherURL=https://luminascreen.ru
DefaultDirName={autopf}\LuminaScreen
DefaultGroupName=LuminaScreen
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\dist
OutputBaseFilename=LuminaScreen-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
RestartApplications=no
UninstallDisplayName=LuminaScreen Player
LicenseFile=THIRD-PARTY-NOTICES.txt
MinVersion=10.0.17763

[Dirs]
Name: "{commonappdata}\LuminaScreen"
Name: "{commonappdata}\LuminaScreen\state"; Permissions: users-modify

[Files]
Source: "..\..\build\win\dist\LuminaScreen\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "THIRD-PARTY-NOTICES.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\LuminaScreen Player"; Filename: "{app}\LuminaScreen.exe"

[Run]
; Firewall: the LAN trigger listener (TCP 8079 / UDP 7847 by default, operator-configurable) and the
; local control API. A program rule covers whatever ports the dashboard configures.
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""LuminaScreen Player"""; Flags: runhidden
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""LuminaScreen Player"" dir=in action=allow program=""{app}\LuminaScreen.exe"" enable=yes profile=any"; Flags: runhidden
Filename: "{app}\luminascreen-helper.exe"; Parameters: "--startup auto install"; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "failure LuminaScreenHelper reset= 86400 actions= restart/5000/restart/5000/restart/30000"; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "start LuminaScreenHelper"; Flags: runhidden

[UninstallRun]
Filename: "{sys}\sc.exe"; Parameters: "stop LuminaScreenHelper"; Flags: runhidden; RunOnceId: "StopHelper"
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM LuminaScreen.exe"; Flags: runhidden; RunOnceId: "KillPlayer"
Filename: "{app}\luminascreen-helper.exe"; Parameters: "remove"; Flags: runhidden; RunOnceId: "RemoveHelper"
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""LuminaScreen Player"""; Flags: runhidden; RunOnceId: "DelFw"

[Code]
var
  ServerPage: TInputQueryWizardPage;

function ConfigPath(): String;
begin
  Result := ExpandConstant('{commonappdata}\LuminaScreen\config.json');
end;

function JsonEscape(S: String): String;
begin
  StringChangeEx(S, '\', '\\', True);
  StringChangeEx(S, '"', '\"', True);
  Result := S;
end;

procedure InitializeWizard();
begin
  ServerPage := CreateInputQueryPage(wpSelectDir, 'LuminaScreen server',
    'Which LuminaScreen server should this display connect to?',
    'Enter the address you use for the dashboard, e.g. https://luminascreen.ru. A pairing code will ' +
    'appear on this screen after installation; enter it in the dashboard to add the display.');
  ServerPage.Add('Server URL:', False);
  ServerPage.Add('Display name (optional):', False);
  ServerPage.Values[0] := ExpandConstant('{param:SERVER|https://luminascreen.ru}');
  ServerPage.Values[1] := ExpandConstant('{param:NAME|}');
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  { An upgrade keeps the existing configuration: never ask again. }
  Result := (PageID = ServerPage.ID) and FileExists(ConfigPath()) and (ExpandConstant('{param:SERVER|}') = '');
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  { Stop the helper (and with it the watchdog) and the player so their files can be replaced. }
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop LuminaScreenHelper', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Sleep(1500);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM LuminaScreen.exe', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM luminascreen-helper.exe', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;

procedure WriteConfig();
var
  Server, Name, Json: String;
begin
  if FileExists(ConfigPath()) and (ExpandConstant('{param:SERVER|}') = '') then
    exit;
  Server := Trim(ServerPage.Values[0]);
  while (Length(Server) > 0) and (Server[Length(Server)] = '/') do
    Delete(Server, Length(Server), 1);
  Name := Trim(ServerPage.Values[1]);
  Json := '{' + #13#10 +
          '  "server_url": "' + JsonEscape(Server) + '",' + #13#10 +
          '  "device_name": "' + JsonEscape(Name) + '",' + #13#10 +
          '  "autostart": true,' + #13#10;
  if ExpandConstant('{param:ALLOWPACKAGES|0}') = '1' then
    Json := Json + '  "allow_package_install": true' + #13#10
  else
    Json := Json + '  "allow_package_install": false' + #13#10;
  Json := Json + '}' + #13#10;
  SaveStringToFile(ConfigPath(), Json, False);
end;

procedure SetupAccess();
var
  Code: Integer;
begin
  { The helper authorises pipe callers by executable (only the installed LuminaScreen.exe), so there is
    no group to manage. Admin/SYSTEM-only config (see the header). }
  Exec(ExpandConstant('{sys}\icacls.exe'), '"' + ConfigPath() + '" /inheritance:r /grant *S-1-5-32-544:F /grant *S-1-5-18:F /grant *S-1-5-32-545:R',
       '', SW_HIDE, ewWaitUntilTerminated, Code);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  { ssInstall, not ssPostInstall: the [Run] entries start the helper service, and the helper builds its
    configuration at start — the admin-only config must exist before that. }
  if CurStep = ssInstall then
  begin
    ForceDirectories(ExpandConstant('{commonappdata}\LuminaScreen'));
    WriteConfig();
    SetupAccess();
  end;
end;
