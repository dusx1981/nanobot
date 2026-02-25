from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/providers", tags=["providers"])


class Provider(BaseModel):
    id: str
    name: str
    provider_type: str  # litellm, custom, openai_codex
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


# In-memory storage (replace with actual nanobot config)
providers_db: dict[str, Provider] = {}


@router.get("/")
async def list_providers():
    return list(providers_db.values())


@router.post("/")
async def add_provider(provider: Provider):
    providers_db[provider.id] = provider
    return provider


@router.delete("/{provider_id}")
async def delete_provider(provider_id: str):
    if provider_id in providers_db:
        del providers_db[provider_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail={"status": "not_found"})
