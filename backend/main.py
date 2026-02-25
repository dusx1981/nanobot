from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.providers import router as providers_router

app = FastAPI(title="Nanobot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(providers_router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Nanobot API"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
