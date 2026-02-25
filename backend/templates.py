from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/templates", tags=["templates"])

TEMPLATE_FILES = ["SOUL.md", "USER.md", "TOOLS.md", "MEMORY.md", "HEARTBEAT.md"]


class TemplateContent(BaseModel):
    name: str
    content: str


@router.get("/")
async def list_templates():
    return TEMPLATE_FILES


@router.get("/{name}")
async def get_template(name: str):
    if name not in TEMPLATE_FILES:
        raise HTTPException(status_code=404, detail="Template not found")
    template_path = f"/projects/nanobot/nanobot/templates/{name}"
    try:
        with open(template_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        content = ""
    return {"name": name, "content": content}


@router.put("/{name}")
async def update_template(name: str, data: TemplateContent):
    if name not in TEMPLATE_FILES:
        raise HTTPException(status_code=404, detail="Template not found")
    template_path = f"/projects/nanobot/nanobot/templates/{name}"
    with open(template_path, "w") as f:
        f.write(data.content)
    return {"status": "saved", "name": name}
