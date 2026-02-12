@echo off
echo ===================================================================
echo   AGENT FACTORY DEMO — Stopping all services
echo ===================================================================
echo.

echo [1/8] Stopping Workshop...
taskkill /FI "WINDOWTITLE eq Workshop" /F 2>nul

echo [2/8] Stopping MCP Server...
taskkill /FI "WINDOWTITLE eq MCP Server" /F 2>nul

echo [3/8] Stopping DC Frontend...
taskkill /FI "WINDOWTITLE eq DC Frontend" /F 2>nul

echo [4/8] Stopping DC BFF...
taskkill /FI "WINDOWTITLE eq DC BFF" /F 2>nul

echo [5/8] Stopping Middleware...
taskkill /FI "WINDOWTITLE eq Middleware" /F 2>nul

echo [6/8] Stopping Core Backoffice...
taskkill /FI "WINDOWTITLE eq Core Backoffice" /F 2>nul

echo [7/8] Stopping Core API...
taskkill /FI "WINDOWTITLE eq Core API" /F 2>nul

echo [8/8] Stopping Docker containers...
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    cd /d c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\mcp-server
    docker compose down 2>nul
) else (
    echo        Docker Desktop not running — skipping.
)

echo.
echo ===================================================================
echo   All services stopped.
echo ===================================================================
echo.
pause
