@echo off
setlocal
pushd "%~dp0" || exit /b 1
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Entrip-Lan.ps1" %*
set "entrip_exit=%errorlevel%"
popd
if not defined ENTRIP_NO_PAUSE pause
exit /b %entrip_exit%
