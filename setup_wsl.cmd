@echo off
echo ============================================
echo   WSL2 + Docker Setup for Civic Reporter
echo ============================================
echo.
echo Step 1: Enabling WSL2 features...
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
echo.
echo Step 2: Features enabled! A restart is NOW REQUIRED.
echo.
echo After restart:
echo   1. Open Docker Desktop (should start automatically)
echo   2. Run: docker-compose up -d
echo   3. Run: cd backend ^&^& alembic upgrade head ^&^& python scripts\seed_wards.py
echo   4. Run: cd ..\admin-web ^&^& npm install ^&^& npm start
echo.
echo Restarting in 10 seconds... (close this window to cancel)
timeout /t 10
shutdown /r /t 5 /c "Restarting to enable WSL2 for Docker"
pause
