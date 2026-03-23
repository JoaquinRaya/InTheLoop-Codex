param(
  [Parameter(Mandatory = $true)]
  [string]$ExecutablePath,
  [string]$Arguments = "--login-run",
  [switch]$Unregister
)

$runKeyPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$valueName = "InTheLoopDesktopLogin"

if ($Unregister) {
  if (Get-ItemProperty -Path $runKeyPath -Name $valueName -ErrorAction SilentlyContinue) {
    Remove-ItemProperty -Path $runKeyPath -Name $valueName
  }
  Write-Output "Removed startup registration: $valueName"
  exit 0
}

$command = "`"$ExecutablePath`" $Arguments"
Set-ItemProperty -Path $runKeyPath -Name $valueName -Value $command
Write-Output "Registered startup command: $command"
