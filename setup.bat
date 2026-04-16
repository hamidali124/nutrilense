@echo off
setlocal EnableExtensions EnableDelayedExpansion

title NutriLens One-Click Setup
color 0B

set "NO_PAUSE=0"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

set "SERVER_DIR=%PROJECT_ROOT%\server"
set "PYTHON_SERVICE_DIR=%SERVER_DIR%\python_service"
set "ROOT_ENV_FILE=%PROJECT_ROOT%\.env"
set "ROOT_ENV_EXAMPLE=%PROJECT_ROOT%\.env.example"
set "SERVER_ENV_FILE=%SERVER_DIR%\.env"
set "SERVER_ENV_EXAMPLE=%SERVER_DIR%\.env.example"
set "VENV_DIR=%PROJECT_ROOT%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"
set "NPM_CMD=npm.cmd"
set "PYTHON_CMD="
set "SERVER_MONGODB_URI=mongodb://127.0.0.1:27017/nutrilens"
set "MANUAL_SECRETS_REQUIRED=0"

echo ============================================================
echo                 NutriLens One-Click Setup
echo ============================================================
echo.

call :ensure_winget || goto :failure
call :ensure_node || goto :failure
call :ensure_python || goto :failure
call :ensure_mongodb_if_needed || goto :failure
call :ensure_root_env || goto :failure
call :ensure_server_env || goto :failure
call :ensure_virtualenv || goto :failure
call :install_frontend_dependencies || goto :failure
call :install_backend_dependencies || goto :failure
call :install_ngrok || goto :failure
call :install_python_dependencies || goto :failure

echo.
echo ============================================================
echo Setup completed successfully.
echo ============================================================
echo.
echo Installed and verified:
echo   - Node.js / npm
echo   - Frontend dependencies
echo   - Backend dependencies
echo   - Python virtual environment and service dependencies
echo   - Global ngrok command
echo.
echo Generated or preserved:
echo   - %ROOT_ENV_FILE%
echo   - %SERVER_ENV_FILE%
echo.
echo Next steps:
echo   1. Run server\start_all.bat to launch the app stack.
if "%MANUAL_SECRETS_REQUIRED%"=="1" (
  echo   2. Fill in Azure and Groq values in the .env files before using OCR or coach features.
) else (
  echo   2. Review the .env files if you need custom API or database settings.
)
echo.
goto :done

:failure
echo.
echo Setup did not finish.
echo Review the error message above, fix it, and rerun setup.bat.
echo.
set "EXIT_CODE=1"
goto :done

:done
if not defined EXIT_CODE set "EXIT_CODE=0"
if "%NO_PAUSE%"=="0" pause
exit /b %EXIT_CODE%

:ensure_winget
where.exe winget >nul 2>&1
if errorlevel 1 (
  echo [ERROR] winget is required for one-click prerequisite installation.
  echo         Install Microsoft App Installer from the Microsoft Store, then rerun setup.bat.
  exit /b 1
)
echo [OK] winget is available.
exit /b 0

:ensure_node
where.exe node >nul 2>&1
if errorlevel 1 (
  echo [INFO] Node.js was not found. Installing Node.js LTS...
  call :install_winget_package OpenJS.NodeJS.LTS "Node.js LTS" || exit /b 1
)

if exist "%ProgramFiles%\nodejs\npm.cmd" (
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)

call "%NPM_CMD%" --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is still unavailable after Node.js setup.
  exit /b 1
)

echo [OK] Node.js and npm are ready.
exit /b 0

:ensure_python
call :find_python
if not defined PYTHON_CMD (
  echo [INFO] Python was not found. Installing Python 3.11...
  call :install_winget_package Python.Python.3.11 "Python 3.11" || exit /b 1
  call :find_python
)

if not defined PYTHON_CMD (
  echo [ERROR] Python could not be located after installation.
  exit /b 1
)

"%PYTHON_CMD%" --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python is present but could not be executed.
  exit /b 1
)

echo [OK] Python is ready.
exit /b 0

:ensure_mongodb_if_needed
if exist "%SERVER_ENV_FILE%" (
  echo [OK] Existing server .env found. Preserving current database settings.
  exit /b 0
)

where.exe mongod >nul 2>&1
if not errorlevel 1 (
  echo [OK] MongoDB command is already installed.
  exit /b 0
)

sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  echo [OK] MongoDB service is already installed.
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Service -Name 'MongoDB' -ErrorAction Stop } catch { }" >nul 2>&1
  exit /b 0
)

echo [INFO] No server .env detected, so setup will bootstrap a local MongoDB default.
echo [INFO] Installing MongoDB Community Server...
winget install --id MongoDB.Server --exact --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
if errorlevel 1 (
  echo [WARN] MongoDB could not be installed automatically.
  echo        The generated server .env will use a placeholder Atlas URI instead.
  set "SERVER_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutrilens?retryWrites=true&w=majority"
  set "MANUAL_SECRETS_REQUIRED=1"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Service -Name 'MongoDB' -ErrorAction Stop } catch { }" >nul 2>&1
echo [OK] MongoDB installation completed.
exit /b 0

:ensure_root_env
if exist "%ROOT_ENV_FILE%" (
  echo [OK] Frontend .env already exists.
  exit /b 0
)

copy /Y "%ROOT_ENV_EXAMPLE%" "%ROOT_ENV_FILE%" >nul
if errorlevel 1 (
  echo [ERROR] Could not create %ROOT_ENV_FILE%.
  exit /b 1
)

set "MANUAL_SECRETS_REQUIRED=1"
echo [OK] Created frontend .env from template.
exit /b 0

:ensure_server_env
if exist "%SERVER_ENV_FILE%" (
  echo [OK] Backend .env already exists.
  exit /b 0
)

for /f "usebackq delims=" %%S in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Convert]::ToHexString((1..32 ^| ForEach-Object { Get-Random -Maximum 256 }))"`) do set "JWT_SECRET=%%S"

if not defined JWT_SECRET (
  echo [ERROR] Could not generate a JWT secret for server .env.
  exit /b 1
)

> "%SERVER_ENV_FILE%" (
  echo PORT=3000
  echo NODE_ENV=development
  echo MONGODB_URI=!SERVER_MONGODB_URI!
  echo JWT_SECRET=!JWT_SECRET!
  echo PYTHON_SERVICE_URL=http://localhost:5000
  echo GROQ_API_KEY=
)

if errorlevel 1 (
  echo [ERROR] Could not create %SERVER_ENV_FILE%.
  exit /b 1
)

set "MANUAL_SECRETS_REQUIRED=1"
echo [OK] Created backend .env with local development defaults.
exit /b 0

:ensure_virtualenv
if exist "%VENV_PYTHON%" (
  echo [OK] Python virtual environment already exists.
  exit /b 0
)

echo [INFO] Creating Python virtual environment...
"%PYTHON_CMD%" -m venv "%VENV_DIR%"
if errorlevel 1 (
  echo [ERROR] Failed to create the Python virtual environment.
  exit /b 1
)

echo [OK] Created Python virtual environment.
exit /b 0

:install_frontend_dependencies
echo [INFO] Installing frontend dependencies...
pushd "%PROJECT_ROOT%"
call "%NPM_CMD%" install
set "RESULT=%ERRORLEVEL%"
popd
if not "%RESULT%"=="0" (
  echo [ERROR] Frontend npm install failed.
  exit /b 1
)

echo [OK] Frontend dependencies are installed.
exit /b 0

:install_backend_dependencies
echo [INFO] Installing backend dependencies...
pushd "%SERVER_DIR%"
call "%NPM_CMD%" install
set "RESULT=%ERRORLEVEL%"
popd
if not "%RESULT%"=="0" (
  echo [ERROR] Backend npm install failed.
  exit /b 1
)

echo [OK] Backend dependencies are installed.
exit /b 0

:install_ngrok
echo [INFO] Ensuring ngrok is available globally...
call "%NPM_CMD%" install -g ngrok
if errorlevel 1 (
  echo [ERROR] Global ngrok installation failed.
  exit /b 1
)

echo [OK] ngrok is installed for launcher use.
exit /b 0

:install_python_dependencies
echo [INFO] Installing Python service dependencies...
"%VENV_PYTHON%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo [ERROR] Failed to upgrade pip tooling in the virtual environment.
  exit /b 1
)

"%VENV_PYTHON%" -m pip install -r "%PYTHON_SERVICE_DIR%\requirements.txt" pytest
if errorlevel 1 (
  echo [ERROR] Failed to install Python service dependencies.
  exit /b 1
)

echo [OK] Python service dependencies are installed.
exit /b 0

:find_python
set "PYTHON_CMD="
for %%P in (
  "%LocalAppData%\Programs\Python\Python313\python.exe"
  "%LocalAppData%\Programs\Python\Python312\python.exe"
  "%LocalAppData%\Programs\Python\Python311\python.exe"
  "%ProgramFiles%\Python313\python.exe"
  "%ProgramFiles%\Python312\python.exe"
  "%ProgramFiles%\Python311\python.exe"
) do (
  if exist "%%~fP" (
    set "PYTHON_CMD=%%~fP"
    exit /b 0
  )
)

for /f "delims=" %%P in ('where.exe python 2^>nul') do (
  set "PYTHON_CMD=%%P"
  exit /b 0
)

exit /b 0

:install_winget_package
winget install --id "%~1" --exact --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo [ERROR] Failed to install %~2.
  exit /b 1
)
exit /b 0