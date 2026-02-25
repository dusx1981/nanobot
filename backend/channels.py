
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/channels", tags=["channels"])


class Channel(BaseModel):
    id: str
    name: str  # telegram, discord, slack, etc.
    enabled: bool
    config: dict = {}


channels_db: dict[str, Channel] = {}


@router.get("/")
async def list_channels():
    return list(channels_db.values())


@router.post("/{channel_id}/toggle")
async def toggle_channel(channel_id: str, enabled: bool):
    if channel_id in channels_db:
        channels_db[channel_id].enabled = enabled
        return channels_db[channel_id]
    raise HTTPException(status_code=404, detail="not_found")
