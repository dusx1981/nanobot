# Nanobot 模块功能详述

## 目录

1. [Agent 核心模块](#1-agent-核心模块)
2. [工具模块](#2-工具模块)
3. [通道模块](#3-通道模块)
4. [LLM 提供商模块](#4-llm-提供商模块)
5. [消息总线模块](#5-消息总线模块)
6. [定时任务模块](#6-定时任务模块)
7. [会话管理模块](#7-会话管理模块)
8. [配置模块](#8-配置模块)
9. [WhatsApp 桥接模块](#9-whatsapp-桥接模块)

---

## 1. Agent 核心模块

### 1.1 AgentLoop - Agent 核心循环

**文件**: `nanobot/agent/loop.py`

**核心职责**:
- 协调整个 Agent 的运行流程
- 管理消息接收、处理和响应
- 控制 LLM 调用和工具执行循环
- 处理子代理任务调度

**初始化参数**:
```python
AgentLoop(
    bus: MessageBus,                    # 消息总线
    provider: LLMProvider,              # LLM 提供商
    workspace: Path,                    # 工作目录
    model: str | None = None,           # 模型名称
    max_iterations: int = 20,           # 最大工具调用次数
    brave_api_key: str | None = None,   # Brave API 密钥
    exec_config: ExecToolConfig | None = None,  # Shell 执行配置
    cron_service: CronService | None = None,    # 定时任务服务
    restrict_to_workspace: bool = False,        # 限制在工作目录
    session_manager: SessionManager | None = None,  # 会话管理器
)
```

**核心流程**:
1. `run()` - 启动主循环，持续消费入站消息
2. `_process_message()` - 处理普通用户消息
3. `_process_system_message()` - 处理系统消息（如子代理完成通知）
4. 工具调用循环 - 反复调用 LLM 直到没有工具调用或达到最大迭代次数

**工具注册**:
```python
# 在 __init__ 中注册所有工具
self.tools = ToolRegistry()
self.tools.register(ReadFileTool(allowed_dir=self.workspace))
self.tools.register(WriteFileTool(allowed_dir=self.workspace))
self.tools.register(EditFileTool(allowed_dir=self.workspace))
self.tools.register(ListDirTool(allowed_dir=self.workspace))
self.tools.register(ExecTool(config=self.exec_config))
self.tools.register(WebSearchTool(api_key=self.brave_api_key))
self.tools.register(WebFetchTool())
self.tools.register(MessageTool(self.bus))
self.tools.register(SpawnTool(self.subagent_manager))
if self.cron_service:
    self.tools.register(CronTool(self.cron_service))
```

---

### 1.2 ContextBuilder - 上下文构建器

**文件**: `nanobot/agent/context.py`

**核心职责**:
- 构建 Agent 的系统提示词
- 整合历史消息、技能和记忆
- 生成符合 LLM 要求的消息格式

**Bootstrap 文件系统**:
```
workspace/
├── AGENTS.md      # Agent 指令（最高优先级）
├── SOUL.md        # Agent 个性定义
├── USER.md        # 用户信息
├── TOOLS.md       # 工具说明
└── IDENTITY.md    # 身份定义
```

**核心方法**:
- `build_system_prompt(skill_names)` - 构建系统提示
- `build_messages(history, current_message, ...)` - 构建完整消息列表
- `add_tool_result(messages, tool_call_id, tool_name, result)` - 添加工具结果
- `add_assistant_message(messages, content, tool_calls)` - 添加助手消息

**提示词构成**:
1. 基础身份提示
2. Bootstrap 文件内容（按优先级）
3. 记忆上下文（最近 7 天 + 长期记忆）
4. 技能说明（XML 格式）

---

### 1.3 SkillsLoader - 技能加载器

**文件**: `nanobot/agent/skills.py`

**核心职责**:
- 发现和加载技能文件（SKILL.md）
- 解析技能元数据（frontmatter）
- 管理技能依赖和可用性

**技能优先级**:
- Workspace 技能 (`workspace/skills/`) > 内置技能 (`nanobot/skills/`)

**技能格式**:
```markdown
---
name: example-skill
description: 示例技能
always: false
requires: [other-skill]
---

# 技能内容
...
```

**核心方法**:
- `list_skills(filter_unavailable=True)` - 列出可用技能
- `load_skill(name)` - 加载指定技能
- `load_skills_for_context(skill_names)` - 加载技能到上下文
- `get_always_skills()` - 获取标记为 always=true 的技能
- `build_skills_summary()` - 构建 XML 格式的技能摘要

**内置技能**:
- `filesystem` - 文件系统操作
- `heartbeat` - 心跳任务管理
- `memory` - 记忆系统
- `time` - 时间和日期
- `web` - Web 搜索和获取
- `spawn` - 子代理管理

---

### 1.4 SubagentManager - 子代理管理器

**文件**: `nanobot/agent/subagent.py`

**核心职责**:
- 管理后台子代理任务
- 在独立线程中执行耗时操作
- 向主代理报告执行结果

**子代理限制**:
- 最大迭代次数: 15（主代理为 20）
- 无 `message` 工具（不能直接发送消息）
- 无 `spawn` 工具（不能递归生成子代理）
- 任务完成后通过系统消息通知主代理

**核心方法**:
- `spawn(task, label, origin_channel, origin_chat_id)` - 生成子代理
- `get_running_count()` - 获取正在运行的子代理数量

**执行流程**:
1. 创建独立的 AgentLoop 实例（工具配置相同但限制更多）
2. 在独立线程中运行
3. 完成后将结果作为系统消息发送给主代理

---

### 1.5 MemoryStore - 记忆存储

**文件**: `nanobot/agent/memory.py`

**核心职责**:
- 管理每日笔记和长期记忆
- 提供记忆上下文给 Agent
- 支持时间范围查询

**存储结构**:
```
workspace/memory/
├── MEMORY.md              # 长期记忆
├── 2025-02-10.md          # 今日笔记
├── 2025-02-09.md          # 昨日笔记
└── ...
```

**核心方法**:
- `get_today_file()` - 获取今日记忆文件路径
- `read_today()` / `append_today(content)` - 读取/追加今日笔记
- `read_long_term()` / `write_long_term(content)` - 长期记忆
- `get_recent_memories(days=7)` - 获取最近 N 天的记忆
- `get_memory_context()` - 获取格式化的记忆上下文

---

## 2. 工具模块

### 2.1 Tool - 工具基类

**文件**: `nanobot/agent/tools/base.py`

**抽象类定义**:
```python
class Tool(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...
    
    @property
    @abstractmethod
    def description(self) -> str: ...
    
    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]: ...
    
    @abstractmethod
    async def execute(self, **kwargs: Any) -> str: ...
```

**参数验证**:
- `validate_params(params)` - JSON Schema 参数验证
- 支持类型检查、范围验证、枚举验证、嵌套对象验证

**OpenAI 格式转换**:
- `to_schema()` - 转换为 OpenAI function calling 格式

---

### 2.2 ToolRegistry - 工具注册表

**文件**: `nanobot/agent/tools/registry.py`

**核心职责**:
- 动态注册和注销工具
- 工具查找和执行
- 生成工具定义列表

**核心方法**:
- `register(tool)` - 注册工具
- `unregister(name)` - 注销工具
- `get(name)` - 获取工具
- `has(name)` - 检查工具是否存在
- `get_definitions()` - 获取所有工具定义
- `execute(name, params)` - 执行指定工具

---

### 2.3 文件系统工具 (filesystem.py)

| 工具 | 功能 | 参数 |
|------|------|------|
| ReadFileTool | 读取文件内容 | `path: str` |
| WriteFileTool | 写入文件 | `path: str, content: str` |
| EditFileTool | 编辑文件 | `path: str, old_string: str, new_string: str` |
| ListDirTool | 列出目录 | `path: str` |

**安全特性**:
- `allowed_dir` - 限制允许访问的目录
- `restrict_to_workspace` - 限制在工作空间内

**EditFileTool 要求**:
- `old_string` 必须精确匹配（包括缩进和换行）
- 如果不匹配，返回错误提示

---

### 2.4 ExecTool - Shell 执行工具

**文件**: `nanobot/agent/tools/shell.py`

**功能**: 执行 shell 命令

**安全特性**:
- **危险命令拦截**: rm -rf, format, dd, shutdown, mkfs, fdisk 等
- **超时控制**: 默认 60 秒
- **允许/拒绝模式**: 可配置允许和拒绝的命令模式
- **路径限制**: 当 `restrict_to_workspace=true` 时检测路径遍历

**配置** (ExecToolConfig):
```python
ExecToolConfig(
    timeout: int = 60,                      # 超时秒数
    allow_all: bool = False,               # 是否允许所有命令
    allowed_patterns: list[str] = [],      # 允许的模式列表
    denied_patterns: list[str] = [],       # 拒绝的模式列表
)
```

---

### 2.5 Web 工具 (web.py)

#### WebSearchTool - 网页搜索
- **API**: Brave Search API
- **参数**: `query: str, count: int = 5`
- **返回**: 搜索结果列表（标题、URL、摘要）

#### WebFetchTool - 网页获取
- **功能**: 获取网页内容并提取正文
- **参数**: `url: str, max_chars: int = 50000`
- **解析**: 使用 Readability 提取正文，转换为 Markdown

---

### 2.6 MessageTool - 消息工具

**文件**: `nanobot/agent/tools/message.py`

**功能**: 向用户发送消息

**参数**:
- `content: str` - 消息内容
- `channel: str` - 通道名称（可选，默认当前通道）
- `chat_id: str` - 聊天 ID（可选，默认当前聊天）

**上下文设置**:
- `set_context(channel, chat_id)` - 设置当前消息上下文

---

### 2.7 SpawnTool - 子代理工具

**文件**: `nanobot/agent/tools/spawn.py`

**功能**: 生成后台子代理执行复杂任务

**参数**:
- `task: str` - 任务描述
- `label: str` - 任务标签（用于识别）

**限制**:
- 子代理不能直接发送消息给用户
- 子代理不能生成新的子代理
- 子代理有最大迭代次数限制

---

### 2.8 CronTool - 定时任务工具

**文件**: `nanobot/agent/tools/cron.py`

**功能**: 调度提醒和定时任务

**操作类型**:
- `add` - 添加任务
  - `every_seconds: int` - 每隔 N 秒执行
  - `cron_expr: str` - Cron 表达式
- `list` - 列出所有任务
- `remove` - 移除任务（通过 name 或 index）

**参数**:
- `operation: str` - 操作类型
- `name: str` - 任务名称
- `message: str` - 任务消息内容
- `schedule: object` - 调度配置

---

## 3. 通道模块

### 3.1 BaseChannel - 通道基类

**文件**: `nanobot/channels/base.py`

**抽象类定义**:
```python
class BaseChannel(ABC):
    def __init__(self, allowed_users: list[str] | None = None): ...
    
    @abstractmethod
    async def start(self) -> None: ...
    
    @abstractmethod
    async def stop(self) -> None: ...
    
    @abstractmethod
    async def send(self, msg: OutboundMessage) -> None: ...
    
    def is_allowed(self, sender_id: str) -> bool: ...
```

**消息处理**:
- `_handle_message(...)` - 处理入站消息并转发到消息总线

---

### 3.2 ChannelManager - 通道管理器

**文件**: `nanobot/channels/manager.py`

**核心职责**:
- 初始化和启动所有启用的通道
- 协调出站消息分发
- 管理通道生命周期

**初始化流程**:
1. 根据配置初始化启用的通道
2. 启动所有通道
3. 启动出站消息调度器（后台任务）

**通道配置**:
```python
ChannelsConfig(
    whatsapp: WhatsAppConfig | None = None
    telegram: TelegramConfig | None = None
    discord: DiscordConfig | None = None
    feishu: FeishuConfig | None = None
)
```

---

### 3.3 TelegramChannel - Telegram 通道

**文件**: `nanobot/channels/telegram.py`

**技术**: python-telegram-bot (长轮询)

**特性**:
- **命令支持**: /start, /reset, /help
- **媒体处理**: 图片、语音、文档
- **语音转文字**: 使用 Groq Whisper API
- **打字指示器**: 显示输入状态
- **Markdown 转换**: Telegram HTML 格式

**消息格式转换**:
- Markdown → Telegram HTML
- 代码块保留格式

---

### 3.4 DiscordChannel - Discord 通道

**文件**: `nanobot/channels/discord.py`

**技术**: Discord Gateway WebSocket

**特性**:
- **Gateway 连接**: WebSocket 心跳管理
- **附件下载**: 支持文件附件
- **打字指示器**: 显示输入状态
- **速率限制**: 自动处理 Discord 速率限制

**消息处理**:
- 过滤机器人消息
- 处理附件 URL

---

### 3.5 FeishuChannel - 飞书通道

**文件**: `nanobot/channels/feishu.py`

**技术**: lark-oapi SDK, WebSocket 长连接

**特性**:
- **WebSocket 事件**: 实时消息监听
- **消息去重**: 最近 500 条消息 ID 缓存
- **消息反应**: 点赞功能
- **卡片消息**: Markdown 表格转飞书卡片
- **群聊支持**: @提及处理

**消息格式**:
- 支持普通文本和富文本卡片
- 表格自动转换为卡片格式

---

### 3.6 WhatsAppChannel - WhatsApp 通道

**文件**: `nanobot/channels/whatsapp.py`

**技术**: WebSocket 连接到 Node.js Bridge

**架构**:
```
WhatsAppChannel (Python)  ←──WebSocket──→  BridgeServer (Node.js)  ←──Baileys──→  WhatsApp
```

**职责**:
- 连接到本地 bridge WebSocket (ws://localhost:3001)
- 接收来自 bridge 的消息
- 发送消息到 bridge

---

## 4. LLM 提供商模块

### 4.1 LLMProvider - 提供商基类

**文件**: `nanobot/providers/base.py`

**数据类**:
```python
@dataclass
class LLMResponse:
    content: str | None
    tool_calls: list[ToolCallRequest] | None
    usage: dict[str, Any] | None

@dataclass
class ToolCallRequest:
    id: str
    name: str
    arguments: dict[str, Any]
```

**抽象类定义**:
```python
class LLMProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, Any]],
        model: str | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> LLMResponse: ...
    
    @abstractmethod
    def get_default_model(self) -> str: ...
```

---

### 4.2 LiteLLMProvider - LiteLLM 提供商

**文件**: `nanobot/providers/litellm_provider.py`

**支持的提供商**:
- OpenRouter
- Anthropic (Claude)
- OpenAI (GPT)
- Google (Gemini)
- DeepSeek
- Zhipu AI (GLM)
- DashScope (通义千问)
- Moonshot (Kimi)
- Groq
- vLLM / 自定义端点
- AiHubMix

**模型名称格式**:
```
{provider}/{model}
# 例如:
openrouter/anthropic/claude-3-opus
anthropic/claude-3-sonnet-20240229
openai/gpt-4-turbo
deepseek/deepseek-chat
```

**配置**:
```python
ProviderConfig(
    api_key: str
    api_base: str | None = None
    extra_headers: dict[str, str] | None = None
)
```

---

### 4.3 GroqTranscriptionProvider - 语音转文字

**文件**: `nanobot/providers/transcription.py`

**功能**: 使用 Groq Whisper API 进行语音转文字

**方法**:
- `transcribe(audio_bytes, filename)` - 转录音频

---

## 5. 消息总线模块

### 5.1 Events - 消息事件

**文件**: `nanobot/bus/events.py`

**入站消息**:
```python
@dataclass
class InboundMessage:
    content: str                    # 消息内容
    sender_id: str                  # 发送者 ID
    sender_name: str                # 发送者名称
    channel: str                    # 通道名称
    chat_id: str                    # 聊天 ID
    chat_type: str                  # 聊天类型 (private/group)
    timestamp: datetime             # 时间戳
    message_id: str | None = None   # 消息 ID
    reply_to: str | None = None     # 回复的消息 ID
    media: list[MediaAttachment] | None = None  # 媒体附件
```

**出站消息**:
```python
@dataclass
class OutboundMessage:
    content: str                    # 消息内容
    channel: str                    # 目标通道
    chat_id: str                    # 目标聊天 ID
    reply_to: str | None = None     # 回复的消息 ID
    media: list[MediaAttachment] | None = None  # 媒体附件
```

---

### 5.2 MessageBus - 消息总线

**文件**: `nanobot/bus/queue.py`

**核心职责**:
- 异步消息队列管理
- 解耦通道和 Agent 核心
- 支持入站和出站消息

**实现**:
- 使用 `asyncio.Queue` 实现
- 入站队列和出站队列分离

**核心方法**:
- `publish_inbound(msg)` - 发布入站消息
- `consume_inbound()` - 消费入站消息
- `publish_outbound(msg)` - 发布出站消息
- `consume_outbound()` - 消费出站消息

---

## 6. 定时任务模块

### 6.1 Cron Types - 类型定义

**文件**: `nanobot/cron/types.py`

**调度定义**:
```python
@dataclass
class CronSchedule:
    at: datetime | None = None           # 指定时间执行一次
    every: int | None = None             # 每隔 N 秒执行
    cron_expr: str | None = None         # Cron 表达式
```

**任务定义**:
```python
@dataclass
class CronJob:
    id: str                              # 任务 ID
    name: str                            # 任务名称
    schedule: CronSchedule               # 调度配置
    payload: CronPayload                 # 执行内容
    enabled: bool = True                 # 是否启用
    created_at: datetime                 # 创建时间
    last_run: datetime | None = None     # 上次执行时间
    next_run: datetime | None = None     # 下次执行时间
```

---

### 6.2 CronService - 定时任务服务

**文件**: `nanobot/cron/service.py`

**核心职责**:
- 管理和调度定时任务
- 持久化任务状态
- 触发任务执行

**核心方法**:
- `start()` - 启动服务，加载任务并开始调度
- `add_job(name, schedule, message, deliver, channel, to)` - 添加任务
- `list_jobs(include_disabled=False)` - 列出任务
- `remove_job(job_id)` - 移除任务
- `run_job(job_id, force=False)` - 手动执行任务

**调度逻辑**:
- 使用 `croniter` 库解析 Cron 表达式
- 每秒检查一次是否有任务需要执行
- 支持 `at`（一次）、`every`（间隔）、`cron_expr`（Cron）三种模式

---

## 7. 会话管理模块

### 7.1 Session - 会话

**文件**: `nanobot/session/manager.py`

**会话结构**:
```python
@dataclass
class Session:
    key: str                           # 会话键 (channel:chat_id)
    messages: list[dict]               # 消息列表
    metadata: dict                     # 元数据
    created_at: datetime               # 创建时间
    updated_at: datetime               # 更新时间
```

**存储格式** (JSONL):
```jsonl
{"metadata": {...}, "created_at": "..."}
{"role": "user", "content": "...", "timestamp": "..."}
{"role": "assistant", "content": "...", "timestamp": "..."}
```

---

### 7.2 SessionManager - 会话管理器

**文件**: `nanobot/session/manager.py`

**核心职责**:
- 管理对话历史和会话状态
- 持久化会话数据
- 支持会话列表和清理

**存储位置**: `workspace/sessions/{key}.jsonl`

**核心方法**:
- `get_or_create(key)` - 获取或创建会话
- `save(session)` - 保存会话到磁盘
- `delete(key)` - 删除会话
- `list_sessions()` - 列出所有会话
- `get_history(key, limit=50)` - 获取会话历史

**历史管理**:
- 默认保留最近 50 条消息
- 超过限制时自动截断

---

## 8. 配置模块

### 8.1 Config Schema - 配置模式

**文件**: `nanobot/config/schema.py`

**配置结构**:
```python
class Config(BaseModel):
    agents: AgentsConfig
    channels: ChannelsConfig
    providers: ProvidersConfig
    gateway: GatewayConfig | None = None
    tools: ToolsConfig | None = None
```

**Agents 配置**:
```python
class AgentDefaults(BaseModel):
    workspace: Path = Path("./workspace")
    model: str = "openrouter/anthropic/claude-3.5-sonnet"
    max_tokens: int = 4096
    temperature: float = 0.7
    max_tool_iterations: int = 20
```

**通道配置**:
```python
class TelegramConfig(BaseModel):
    enabled: bool = False
    token: str
    allowed_users: list[str] | None = None
```

**工具配置**:
```python
class ToolsConfig(BaseModel):
    web: WebToolsConfig | None = None
    exec: ExecToolConfig | None = None
    restrict_to_workspace: bool = False
```

---

### 8.2 Config Loader - 配置加载器

**文件**: `nanobot/config/loader.py`

**核心职责**:
- 加载和保存配置
- 支持 YAML 格式
- 大小写转换（camelCase ↔ snake_case）

**核心函数**:
- `load_config(config_path)` - 加载配置文件
- `save_config(config, config_path)` - 保存配置到文件
- `get_config_path()` - 获取默认配置路径

**配置文件路径**: `workspace/config.yaml`

---

## 9. WhatsApp 桥接模块

### 9.1 Bridge Server - 桥接服务器

**文件**: `bridge/src/server.ts`

**核心职责**:
- WebSocket 服务器
- 处理 Python-Node.js 通信

**端口**: 3001 (默认)

**协议**:
```typescript
// 接收消息
interface IncomingMessage {
    type: 'send';
    jid: string;
    content: string;
}

// 发送消息
interface OutgoingMessage {
    type: 'message';
    from: string;
    content: string;
    timestamp: number;
}
```

---

### 9.2 WhatsApp Client - WhatsApp 客户端

**文件**: `bridge/src/whatsapp.ts`

**技术**: @whiskeysockets/baileys

**功能**:
- WhatsApp Web 协议处理
- QR 码认证
- 消息收发
- 媒体处理

**认证存储**: `~/.nanobot/whatsapp-auth/`

---

### 9.3 入口文件

**文件**: `bridge/src/index.ts`

**职责**:
- 环境变量读取
- BridgeServer 启动

**环境变量**:
- `BRIDGE_PORT` - 桥接端口 (默认 3001)
- `AUTH_DIR` - 认证存储目录 (默认 ~/.nanobot/whatsapp-auth)

---

## 附录：模块索引

| 模块 | 文件路径 | 核心类 |
|------|----------|--------|
| Agent Loop | `nanobot/agent/loop.py` | `AgentLoop` |
| Context Builder | `nanobot/agent/context.py` | `ContextBuilder` |
| Skills | `nanobot/agent/skills.py` | `SkillsLoader` |
| Subagent | `nanobot/agent/subagent.py` | `SubagentManager` |
| Memory | `nanobot/agent/memory.py` | `MemoryStore` |
| Tool Base | `nanobot/agent/tools/base.py` | `Tool` |
| Tool Registry | `nanobot/agent/tools/registry.py` | `ToolRegistry` |
| File Tools | `nanobot/agent/tools/filesystem.py` | `ReadFileTool`, `WriteFileTool`, `EditFileTool`, `ListDirTool` |
| Shell Tool | `nanobot/agent/tools/shell.py` | `ExecTool` |
| Web Tools | `nanobot/agent/tools/web.py` | `WebSearchTool`, `WebFetchTool` |
| Message Tool | `nanobot/agent/tools/message.py` | `MessageTool` |
| Spawn Tool | `nanobot/agent/tools/spawn.py` | `SpawnTool` |
| Cron Tool | `nanobot/agent/tools/cron.py` | `CronTool` |
| Base Channel | `nanobot/channels/base.py` | `BaseChannel` |
| Channel Manager | `nanobot/channels/manager.py` | `ChannelManager` |
| Telegram | `nanobot/channels/telegram.py` | `TelegramChannel` |
| Discord | `nanobot/channels/discord.py` | `DiscordChannel` |
| Feishu | `nanobot/channels/feishu.py` | `FeishuChannel` |
| WhatsApp | `nanobot/channels/whatsapp.py` | `WhatsAppChannel` |
| LLM Base | `nanobot/providers/base.py` | `LLMProvider` |
| LiteLLM | `nanobot/providers/litellm_provider.py` | `LiteLLMProvider` |
| Transcription | `nanobot/providers/transcription.py` | `GroqTranscriptionProvider` |
| Events | `nanobot/bus/events.py` | `InboundMessage`, `OutboundMessage` |
| Message Bus | `nanobot/bus/queue.py` | `MessageBus` |
| Cron Types | `nanobot/cron/types.py` | `CronJob`, `CronSchedule` |
| Cron Service | `nanobot/cron/service.py` | `CronService` |
| Session | `nanobot/session/manager.py` | `Session`, `SessionManager` |
| Config Schema | `nanobot/config/schema.py` | `Config` |
| Config Loader | `nanobot/config/loader.py` | `load_config`, `save_config` |
| Bridge Server | `bridge/src/server.ts` | `BridgeServer` |
| WhatsApp Client | `bridge/src/whatsapp.ts` | `WhatsAppClient` |
