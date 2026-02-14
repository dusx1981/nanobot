# Nanobot 系统架构文档

## 1. 系统概述

Nanobot 是一个轻量级 AI Agent 框架，使用 Python 编写，支持多通道（Telegram、Discord、Feishu、WhatsApp）通信，通过 LiteLLM 实现多 LLM 提供商支持。

## 2. 模块总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI 入口层                                  │
│                          (nanobot/cli/commands.py)                      │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            核心服务层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ ChannelManager│  │  AgentLoop   │  │ CronService  │  │  Heartbeat  │  │
│  │  (通道管理)   │  │  (Agent核心)  │  │ (定时任务)   │  │ (心跳检测)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
└─────────┼─────────────────┼─────────────────┼────────────────┼─────────┘
          │                 │                 │                │
          ▼                 ▼                 ▼                ▼
   ┌────────────┐    ┌────────────┐    ┌────────────┐   ┌────────────┐
   │  通道层     │    │  工具层     │    │ 任务存储    │   │ HEARTBEAT  │
   │ (Channels) │    │ (Tools)    │    │  (Jobs)    │   │    .md     │
   └────────────┘    └────────────┘    └────────────┘   └────────────┘
```

## 3. 模块详细说明

### 3.1 Agent 核心模块 (nanobot/agent/)

#### 3.1.1 Agent Loop (loop.py)
- **核心类**: `AgentLoop`
- **功能**: 核心处理引擎，协调消息处理、LLM 调用和工具执行
- **关键方法**:
  - `run()` - 主循环，从消息总线消费消息
  - `_process_message(msg)` - 处理单个入站消息
  - `_process_system_message(msg)` - 处理系统消息
- **依赖**: MessageBus, LLMProvider, ContextBuilder, ToolRegistry, SubagentManager, SessionManager

#### 3.1.2 Context Builder (context.py)
- **核心类**: `ContextBuilder`
- **功能**: 构建 Agent 提示词（系统提示 + 消息历史）
- **Bootstrap 文件优先级**:
  1. `AGENTS.md` - Agent 指令
  2. `SOUL.md` - Agent 个性
  3. `USER.md` - 用户信息
  4. `TOOLS.md` - 工具说明
  5. `IDENTITY.md` - 身份定义

#### 3.1.3 Skills (skills.py)
- **核心类**: `SkillsLoader`
- **功能**: 加载和管理 Agent 技能（SKILL.md 文件）
- **方法**: `list_skills()`, `load_skill()`, `build_skills_summary()`
- **优先级**: Workspace 技能 > 内置技能

#### 3.1.4 Subagent (subagent.py)
- **核心类**: `SubagentManager`
- **功能**: 管理后台子代理执行（用于复杂/耗时任务）
- **限制**: 最多 15 次迭代，无 message 工具，不能递归生成

#### 3.1.5 Memory (memory.py)
- **核心类**: `MemoryStore`
- **功能**: 持久化记忆系统（每日笔记 + 长期记忆）
- **存储**:
  - `workspace/memory/MEMORY.md` - 长期记忆
  - `workspace/memory/YYYY-MM-DD.md` - 每日笔记

### 3.2 工具模块 (nanobot/agent/tools/)

#### 3.2.1 Base Tool (base.py)
- **核心类**: `Tool` (ABC)
- **功能**: 所有工具的抽象基类
- **属性**: `name`, `description`, `parameters`
- **方法**: `execute()`, `validate_params()`, `to_schema()`

#### 3.2.2 Tool Registry (registry.py)
- **核心类**: `ToolRegistry`
- **功能**: 动态工具注册和执行
- **方法**: `register()`, `unregister()`, `execute()`, `get_definitions()`

#### 3.2.3 具体工具实现

| 工具 | 文件 | 功能 | 安全特性 |
|------|------|------|----------|
| ReadFileTool | filesystem.py | 读取文件 | allowed_dir 限制 |
| WriteFileTool | filesystem.py | 写入文件 | 自动创建父目录 |
| EditFileTool | filesystem.py | 编辑文件 | 精确匹配要求 |
| ListDirTool | filesystem.py | 列出目录 | - |
| ExecTool | shell.py | 执行 shell | 危险命令拦截、超时控制 |
| WebSearchTool | web.py | 网页搜索 | Brave API |
| WebFetchTool | web.py | 网页内容提取 | Readability 解析 |
| MessageTool | message.py | 发送消息 | 通道上下文 |
| SpawnTool | spawn.py | 生成子代理 | 子代理限制 |
| CronTool | cron.py | 调度定时任务 | - |

### 3.3 通道模块 (nanobot/channels/)

#### 3.3.1 Base Channel (base.py)
- **核心类**: `BaseChannel` (ABC)
- **功能**: 所有聊天通道的抽象基类
- **方法**: `start()`, `stop()`, `send()`, `is_allowed()`

#### 3.3.2 Channel Manager (manager.py)
- **核心类**: `ChannelManager`
- **功能**: 协调管理所有聊天通道
- **支持通道**: Telegram、WhatsApp、Discord、Feishu

#### 3.3.3 具体通道实现

| 通道 | 文件 | 技术 | 特性 |
|------|------|------|------|
| Telegram | telegram.py | python-telegram-bot | 命令、媒体、语音转文字 |
| Discord | discord.py | Discord Gateway | WebSocket、附件、速率限制 |
| Feishu | feishu.py | lark-oapi | WebSocket、消息去重、卡片 |
| WhatsApp | whatsapp.py | WebSocket Bridge | 连接 Node.js bridge |

### 3.4 LLM 提供商模块 (nanobot/providers/)

#### 3.4.1 Base Provider (base.py)
- **核心类**: `LLMProvider` (ABC), `LLMResponse`, `ToolCallRequest`
- **功能**: LLM 提供商抽象接口

#### 3.4.2 LiteLLM Provider (litellm_provider.py)
- **核心类**: `LiteLLMProvider`
- **支持**: OpenRouter, Anthropic, OpenAI, Google, DeepSeek, Zhipu AI, DashScope, Moonshot, Groq, vLLM, AiHubMix

#### 3.4.3 Transcription (transcription.py)
- **核心类**: `GroqTranscriptionProvider`
- **功能**: Groq Whisper API 语音转文字

### 3.5 消息总线模块 (nanobot/bus/)

#### 3.5.1 Events (events.py)
- **数据类**: `InboundMessage`, `OutboundMessage`
- **功能**: 定义入站和出站消息结构

#### 3.5.2 Message Bus (queue.py)
- **核心类**: `MessageBus`
- **功能**: 异步消息队列，解耦通道和 Agent 核心
- **方法**: `publish_inbound()`, `consume_inbound()`, `publish_outbound()`, `consume_outbound()`

### 3.6 定时任务模块 (nanobot/cron/)

#### 3.6.1 Types (types.py)
- **数据类**: `CronSchedule`, `CronPayload`, `CronJobState`, `CronJob`, `CronStore`

#### 3.6.2 Service (service.py)
- **核心类**: `CronService`
- **功能**: 管理和执行定时任务
- **方法**: `add_job()`, `list_jobs()`, `remove_job()`, `run_job()`

### 3.7 会话管理模块 (nanobot/session/)

#### 3.7.1 Manager (manager.py)
- **核心类**: `Session`, `SessionManager`
- **功能**: 管理对话历史和会话状态
- **存储**: JSONL 格式（每行一条消息，首行为元数据）
- **方法**: `get_or_create()`, `save()`, `delete()`, `list_sessions()`

### 3.8 配置模块 (nanobot/config/)

#### 3.8.1 Schema (schema.py)
- **配置层次**:
  - `Config` (Root)
    - `AgentsConfig` - Agent 默认设置
    - `ChannelsConfig` - 各通道配置
    - `ProvidersConfig` - LLM 提供商配置
    - `GatewayConfig` - 网关配置
    - `ToolsConfig` - 工具配置

#### 3.8.2 Loader (loader.py)
- **功能**: 配置加载和保存
- **特性**: 支持 camelCase 和 snake_case 转换

### 3.9 WhatsApp 桥接 (bridge/)

- **技术**: TypeScript, @whiskeysockets/baileys
- **架构**: Node.js WebSocket 桥接 Python Agent
- **组件**:
  - `index.ts` - 入口点
  - `server.ts` - WebSocket 服务器
  - `whatsapp.ts` - WhatsApp Web 协议处理

## 4. 模块关系图

```
                              ┌─────────────┐
                              │   CLI Entry │
                              └──────┬──────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Core Services                              │
│                                                                   │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│   │   Gateway   │────▶│  AgentLoop  │◀────│ CronService │        │
│   │   Command   │     │             │     │             │        │
│   └─────────────┘     └──────┬──────┘     └─────────────┘        │
│                              │                                     │
└──────────────────────────────┼────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  Channel    │    │   Tools     │    │   Session   │
    │  Manager    │    │  Registry   │    │   Manager   │
    └──────┬──────┘    └──────┬──────┘    └─────────────┘
           │                  │
     ┌─────┴─────┐     ┌─────┴─────┐
     │           │     │           │
     ▼           ▼     ▼           ▼
┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐
│Telegram│ │Discord │ │ File │ │Shell │
└────────┘ └────────┘ └──────┘ └──────┘
┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐
│ Feishu │ │WhatsApp│ │ Web  │ │Spawn │
└────────┘ └────────┘ └──────┘ └──────┘
```

## 5. 数据流

### 5.1 入站消息流
```
Channel → BaseChannel._handle_message() → MessageBus.publish_inbound()
      → AgentLoop.run() → AgentLoop._process_message()
```

### 5.2 Agent 处理流
```
_process_message() → SessionManager.get_or_create()
   → ContextBuilder.build_messages() → LLMProvider.chat()
   → ToolRegistry.execute() → 循环直到无工具调用
```

### 5.3 出站消息流
```
AgentLoop → MessageBus.publish_outbound()
      → ChannelManager._dispatch_outbound() → Channel.send()
```

### 5.4 子代理流
```
SpawnTool.execute() → SubagentManager.spawn() → _run_subagent()
   → _announce_result() → MessageBus.publish_inbound(system)
```

## 6. 设计模式

1. **插件架构**: Channels 通过 BaseChannel 抽象实现插件化
2. **消息总线**: 解耦通道和 Agent 核心
3. **工具注册表**: 动态工具注册和执行
4. **渐进式技能加载**: 技能按需加载到上下文
5. **会话隔离**: 每个 channel:chat_id 有独立会话
6. **子代理模式**: 后台任务异步执行，完成后通知主代理
7. **桥接模式**: WhatsApp 通过 TypeScript bridge 实现
