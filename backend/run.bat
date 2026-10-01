@echo off
echo Starting FastAPI DHRUV Server...
D:\Anaconda\envs\sih2026\python.exe -m uvicorn main:app --reload --port 5001
pause