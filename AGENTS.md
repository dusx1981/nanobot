# AGENTS.md

Instructions for AI agents working on the nanobot codebase.

## Project Overview

nanobot is a lightweight AI agent framework written in Python with a TypeScript/JavaScript bridge for WhatsApp integration. It supports multiple channels (Telegram, Discord, Feishu, WhatsApp) and uses LiteLLM for LLM provider abstraction.

## Build / Lint / Test Commands

### Python (Main Project)

```bash
# Install dependencies (development)
pip install -e ".[dev]"

# Run all tests
pytest

# Run a single test file
pytest tests/test_tool_validation.py

# Run a specific test function
pytest tests/test_tool_validation.py::test_validate_params_missing_required

# Run with verbose output
pytest -v

# Lint with ruff
ruff check nanobot/
ruff check --fix nanobot/

# Format with ruff
ruff format nanobot/
```

### TypeScript Bridge (WhatsApp)

```bash
cd bridge/

# Install dependencies
npm install

# Build
npm run build

# Development (build + run)
npm run dev

# Start (requires build first)
npm run start
```

## Code Style Guidelines

### Python

#### Imports
- Use absolute imports with full module path: `from nanobot.agent.tools.base import Tool`
- Group imports: stdlib → third-party → local (separated by blank lines)
- Use `from __future__ import annotations` if needed for forward references

#### Type Hints
- Use Python 3.11+ syntax: `str | None` instead of `Optional[str]`
- Use `dict[str, Any]` instead of `Dict[str, Any]`
- Always type hint function parameters and return types
- Use `Any` from `typing` for dynamic types

#### Naming Conventions
- Classes: `PascalCase` (e.g., `AgentLoop`, `ToolRegistry`)
- Functions/variables: `snake_case` (e.g., `validate_params`, `tool_registry`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_ITERATIONS`)
- Private methods/attributes: `_leading_underscore`
- Abstract base classes: Suffix with base concept (e.g., `Tool`, `LLMProvider`)

#### Code Formatting
- Line length: 100 characters (configured in pyproject.toml)
- Use double quotes for strings
- Two blank lines between top-level definitions
- One blank line between methods in a class

#### Error Handling
- Use exceptions for exceptional cases, not control flow
- Use loguru's `logger` for logging (already imported in most modules)
- Validate inputs early, fail fast with descriptive messages

#### Async Patterns
- Use `async`/`await` for I/O operations
- Use `asyncio` utilities for concurrency
- Test async functions with `pytest-asyncio` (mode: auto)

### TypeScript (Bridge)

#### Style
- Target: ES2022, Module: ESNext
- Strict mode enabled
- Use `const`/`let`, avoid `var`
- Prefer explicit types over implicit

#### Naming
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Interfaces: `PascalCase` with descriptive names

## Project Structure

```
nanobot/               # Main Python package
├── agent/             # Core agent logic
│   ├── tools/         # Tool implementations
│   ├── loop.py        # Main agent loop
│   ├── context.py     # Context building
│   └── skills.py      # Skill management
├── channels/          # Communication channels (Telegram, Discord, etc.)
├── providers/         # LLM provider abstractions
├── config/            # Configuration loading
├── cli/               # Command-line interface
├── bus/               # Message bus for events
├── cron/              # Cron job service
├── session/           # Session management
└── utils/             # Utility functions

bridge/                # WhatsApp bridge (TypeScript)
├── src/               # Source files
├── dist/              # Compiled output
└── package.json       # Node dependencies

tests/                 # Python tests
workspace/             # User workspace (not committed)
```

## Testing

- Tests are in `tests/` directory
- Use pytest with asyncio support
- Test files named `test_*.py`
- Test functions named `test_*`
- Use descriptive test names that explain what is being tested

## Configuration

- User config stored in workspace directory
- Config schema in `nanobot/config/schema.py`
- Use pydantic-settings for environment variable support

## Adding New Tools

1. Create tool class inheriting from `Tool` in `nanobot/agent/tools/`
2. Implement required properties: `name`, `description`, `parameters`
3. Implement `execute` method
4. Register in `ToolRegistry` in `nanobot/agent/loop.py`

## Security Notes

- Never log API keys or secrets
- Use `ExecToolConfig` to restrict shell command execution
- Workspace can be restricted with `restrict_to_workspace` flag
- Validate all tool parameters using JSON Schema
