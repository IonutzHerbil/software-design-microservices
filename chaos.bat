@echo off
echo ================================
echo  Chaos Mode Selector
echo ================================
echo.
echo 1. Default chaos  (30%% failures + 3-10s jitter)
echo 2. Latency only  (0%% failures + 4-6s jitter)
echo 3. Failures only  (100%% failures, no jitter)
echo 4. No chaos  (normal mode)
echo.
set /p choice="Pick a scenario (1-4): "

echo Stopping current Recommendation Service...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3002" ^| find "LISTENING"') do taskkill /f /pid %%a > nul 2>&1
timeout /t 1 /nobreak > nul

if "%choice%"=="1" (
  start "Recommendation Service [CHAOS DEFAULT]" cmd /k "set CHAOS_MODE=true& set CHAOS_FAILURE_RATE=0.3& set CHAOS_MIN_JITTER=3000& set CHAOS_MAX_JITTER=10000& node recommendation.js"
)
if "%choice%"=="2" (
  start "Recommendation Service [LATENCY ONLY]" cmd /k "set CHAOS_MODE=true& set CHAOS_FAILURE_RATE=0& set CHAOS_MIN_JITTER=4000& set CHAOS_MAX_JITTER=6000& node recommendation.js"
)
if "%choice%"=="3" (
  start "Recommendation Service [FAILURES ONLY]" cmd /k "set CHAOS_MODE=true& set CHAOS_FAILURE_RATE=1& set CHAOS_MIN_JITTER=0& set CHAOS_MAX_JITTER=0& node recommendation.js"
)
if "%choice%"=="4" (
  start "Recommendation Service [NORMAL]" cmd /k "node recommendation.js"
)
