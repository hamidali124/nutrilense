@echo off
REM Start the Python NutriScore API service

if not defined ENABLE_VECTOR_KB set "ENABLE_VECTOR_KB=true"
if not defined PRELOAD_MODELS set "PRELOAD_MODELS=true"

set "PROJECT_ROOT=%~dp0..\.."

cd /d "%~dp0"
if exist "%PROJECT_ROOT%\.venv\Scripts\python.exe" (
	"%PROJECT_ROOT%\.venv\Scripts\python.exe" nutriscore_api.py
) else (
	python nutriscore_api.py
)

