# AGENTS.md

Instructions for AI agents working on the nanobot codebase.

## Project Overview

nanobot is a lightweight AI agent framework written in Python with a TypeScript/JavaScript bridge for WhatsApp integration. It supports multiple channels and uses LiteLLM for LLM provider abstraction.

## Build / Lint / Test Commands

### Python

```bash
# Install dependencies (development)
pip install -e ".[dev]"

# Run all tests
pytest

# Run a single test file
pytest tests/test_tool_validation.py

# Run a specific test function
pytest tests/test_tool_validation.py::test_validate_params_missing_required

# Run tests matching a pattern
pytest -k "test_memory"

# Run with verbose output
pytest -v

# Lint with ruff (check only)
ruff check nanobot/

# Lint with ruff (auto-fix)
ruff check --fix nanobot/

# Format with ruff
ruff format nanobot/
```

### TypeScript Bridge (WhatsApp)

```bash
cd bridge/
npm install
npm run build    # Build
npm run dev      # Build + run
npm run start    # Run (requires build)
```

## Code Style Guidelines

### Python

**Imports**: Use absolute imports (`from nanobot.agent.tools.base import Tool`). Group: stdlib → third-party → local (blank lines between). Use `from __future__ import annotations`.

**Type Hints (Python 3.11+)**: Use union syntax: `str | None`, `dict[str, Any]`. Always type hint parameters and return types. Use `Any` for dynamic types.

**Naming**: Classes: `PascalCase` (e.g., `AgentLoop`). Functions/variables: `snake_case`. Constants: `UPPER_SNAKE_CASE`. Private: `_leading_underscore`. Abstract bases: suffix with base concept (`Tool`, `LLMProvider`).

**Formatting**: Line length: 100 chars (configured in pyproject.toml). Use double quotes. Two blank lines between top-level definitions, one between class methods. Docstrings: Google style (summary line + detailed description).

**Error Handling**: Use exceptions for exceptional cases. Use loguru's `logger`. Validate inputs early, fail fast with descriptive messages. Never swallow exceptions silently—always log or re-raise with context.

**Async**: Use `async`/`await` for I/O. Use `asyncio` utilities. Test with `pytest-asyncio` (mode: auto in pyproject.toml).

### TypeScript (Bridge)

Target: ES2022, Module: ESNext. Strict mode enabled. Use `const`/`let`, avoid `var`. Prefer explicit types over implicit. Classes: `PascalCase`, functions: `camelCase`.

## Project Structure

```
nanobot/               # Main Python package
├── agent/             # Core agent logic
│   ├── tools/         # Tool implementations (Tool base class)
│   ├── loop.py        # Main agent loop
│   ├── context.py     # Context building
│   ├── memory.py      # Memory/consolidation
│   ├── skills.py      # Skill management
│   └── subagent.py    # Subagent handling
├── channels/          # Communication channels
│   ├── telegram.py    # Telegram bot support
│   ├── discord.py     # Discord bot support
│   ├── feishu.py      # Feishu/Lark support
│   ├── slack.py       # Slack bot support
│   ├── dingtalk.py    # DingTalk support
│   ├── email.py       # Email channel support
│   ├── qq.py          # QQ/Botpy support
│   ├── mochat.py      # MoChat support
│   └── whatsapp.py   # WhatsApp (via bridge)
├── providers/         # LLM providers
│   ├── litellm_provider.py    # LiteLLM abstraction
│   ├── custom_provider.py      # Custom provider
│   ├── openai_codex_provider.py # OpenAI Codex
│   └── registry.py             # Provider registry
├── config/            # Configuration
│   ├── schema.py     # Config schema (pydantic)
│   └── loader.py     # Config loader
├── cli/              # CLI commands (typer)
├── bus/              # Message bus
│   ├── events.py     # Event definitions
│   └── queue.py      # Queue handling
├── cron/             # Cron service
├── session/          # Session management
├── heartbeat/        # Periodic task service
└── utils/            # Utilities

bridge/                # WhatsApp bridge (TypeScript)
tests/                 # Python tests
workspace/             # User workspace (not committed)
```

## Testing

Tests in `tests/`, named `test_*.py`. Use pytest with asyncio support (configured in pyproject.toml). Test functions: `test_*`. Run specific tests: `pytest tests/test_file.py::test_function`. Run matching patterns: `pytest -k "test_memory"`. Use `pytest -v` for verbose output to see which tests pass/fail.

## Message Bus

The `nanobot/bus/` module provides event-driven communication. Use `events.py` to define event types and `queue.py` for async queue handling. Channels and agents communicate through the bus—avoid direct imports between channels.

## Templates & Skills

Templates in `nanobot/templates/` define agent behavior:
- `SOUL.md` - Core personality and system prompt
- `USER.md` - User-specific instructions
- `TOOLS.md` - Available tools configuration
- `MEMORY.md` - Persistent memory (loaded on startup)
- `HEARTBEAT.md` - Periodic tasks checked every 30 minutes

Skills in `nanobot/skills/` provide specialized capabilities with their own `SKILL.md` defining how to use them.

## Configuration

User config in workspace directory. Config schema: `nanobot/config/schema.py`. Use pydantic-settings for environment variable support. Loader: `nanobot/config/loader.py`. Environment variables override file-based config.

## Adding New Components

**Tools**: Inherit from `Tool` in `nanobot/agent/tools/`. Implement: `name` (str property), `description` (str property), `parameters` (JSON Schema dict property), `execute` (async method). Register in `ToolRegistry` in `nanobot/agent/loop.py`.

**Channels**: Inherit from `Channel` in `nanobot/channels/base.py`. Implement `send()`, `start()`, etc. Register in `ChannelManager` in `nanobot/channels/manager.py`.

**Providers**: Inherit from `LLMProvider` in `nanobot/providers/base.py`. Implement `complete()`, `stream()` methods. Register in provider registry in `nanobot/providers/registry.py`.

## Security Notes

Never log API keys/secrets. Use `ExecToolConfig` to restrict shell execution. Workspace can be restricted with `restrict_to_workspace`. Validate all tool parameters using JSON Schema.

## Verification Commands

Before claiming work is complete, always run:
- `ruff check nanobot/` - lint check
- `ruff format --check nanobot/` - formatting check  
- `pytest` - all tests pass
