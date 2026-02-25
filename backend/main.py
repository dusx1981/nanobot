from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import json
from datetime import datetime, timezone

from backend.providers import router as providers_router
from backend.channels import router as channels_router
from backend.templates import router as templates_router

app = FastAPI(title="Nanobot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(providers_router)
app.include_router(channels_router)
app.include_router(templates_router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Nanobot API"}


@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(2)
            await websocket.send_json(
                {
                    "level": "INFO",
                    "message": "System running",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    except Exception:
        pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
