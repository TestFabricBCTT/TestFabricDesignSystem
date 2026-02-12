@echo off
echo ===================================================================
echo   AGENT FACTORY DEMO — Starting all services
echo   Fase 1 + Fase 2 Full Stack
echo ===================================================================
echo.

REM 1. Docker (Nginx + SonarQube + Keycloak)
echo [1/8] Starting Docker containers (Nginx + SonarQube + Keycloak)...
cd /d %~dp0Test-BCTT-Agent-Factory-MCPServer\mcp-server
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Docker compose failed. Is Docker Desktop running?
    echo        Continuing without Docker services...
)
timeout /t 5 >nul

REM 2. Core API + Socket.IO
echo [2/8] Starting Core API + Socket.IO (port 4001)...
start "Core API" cmd /c "cd /d %~dp0TestAgentFactoryCore && npm start"
timeout /t 3 >nul

REM 3. Core Backoffice (React SPA)
echo [3/8] Starting Core Backoffice (port 4002)...
start "Core Backoffice" cmd /c "cd /d %~dp0TestAgentFactoryCore && npm run dev:backoffice"
timeout /t 2 >nul

REM 4. Middleware API Gateway
echo [4/8] Starting Middleware API Gateway (port 4010)...
start "Middleware" cmd /c "cd /d %~dp0TestAgentFactoryMiddleware && npm start"
timeout /t 2 >nul

REM 5. DigitalChannels BFF
echo [5/8] Starting DigitalChannels BFF (port 4020)...
start "DC BFF" cmd /c "cd /d %~dp0TestAgentFactoryDigitalChannels\bff && npm start"
timeout /t 2 >nul

REM 6. DigitalChannels Frontend
echo [6/8] Starting DigitalChannels Frontend (port 5173)...
start "DC Frontend" cmd /c "cd /d %~dp0TestAgentFactoryDigitalChannels\frontend && npx vite --port 5173 --host"
timeout /t 2 >nul

REM 7. MCP API Server
echo [7/8] Starting MCP API Server (port 3001)...
start "MCP Server" cmd /c "cd /d %~dp0Test-BCTT-Agent-Factory-MCPServer\mcp-server && npm run start:api"
timeout /t 2 >nul

REM 8. Workshop Agent Factory UI
echo [8/8] Starting Workshop Agent Factory (port 3000)...
start "Workshop" cmd /c "cd /d %~dp0Test-BCTT-Agent-Factory-MCPServer\workshop-agent-factory && npm run dev"
timeout /t 3 >nul

echo.
echo ===================================================================
echo   All services started!
echo ===================================================================
echo.
echo   Workshop:         http://workshop.DCsCreatedbyAI.pt    (port 3000)
echo   DigitalChannels:  http://www.DCsCreatedbyAI.pt         (port 5173)
echo   Backoffice:       http://backoffice.DCsCreatedbyAI.pt  (port 4002)
echo   API Gateway:      http://api.DCsCreatedbyAI.pt         (port 4010)
echo   SonarQube:        http://sonarqube.DCsCreatedbyAI.pt   (port 9000)
echo   Keycloak:         http://auth.DCsCreatedbyAI.pt        (port 8080)
echo.
echo   Fix Preview:      http://fix.DCsCreatedbyAI.pt         (port 5174, when active)
echo.
echo   Credentials:
echo     Client:    joao@exemplo.pt / demo1234
echo     Admin:     admin@bctt.pt / admin1234
echo     Keycloak:  admin / admin1234
echo     SonarQube: admin / sonar1234 (after first setup)
echo.
pause
