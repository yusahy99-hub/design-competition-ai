@echo off
chcp 65001 >nul
echo ========================================
echo   설계공모 AI 서버 시작
echo ========================================
echo.

REM 백엔드 시작
echo [1/2] 백엔드 서버 시작 중...
cd /d "%~dp0backend"
if not exist "venv" (
    echo Python 가상환경 생성 중...
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

if not exist "data" mkdir data

start "Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM 프론트엔드 시작
echo [2/2] 프론트엔드 서버 시작 중...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo 패키지 설치 중...
    npm install
)

start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   서버가 시작되었습니다!
echo   프론트엔드: http://localhost:3000
echo   백엔드 API: http://localhost:8000
echo ========================================
echo.
pause
