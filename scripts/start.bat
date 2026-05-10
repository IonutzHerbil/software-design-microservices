@echo off
echo Starting Microservices...

start "Recommendation Service" cmd /k "node ..\services\recommendation.js"
timeout /t 1 /nobreak > nul

start "Movie Service" cmd /k "node ..\services\movie.js"
timeout /t 1 /nobreak > nul

start "API Gateway" cmd /k "node ..\services\gateway.js"

echo All services started.
echo  Gateway:  http://localhost:3000
echo  Movie Service:  http://localhost:3001
echo  Rec Service:  http://localhost:3002
