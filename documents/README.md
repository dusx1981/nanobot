# Nanobot 文档

本目录包含 Nanobot 系统的详细架构和模块文档。

## 文档列表

### 1. [架构概览](./architecture.md)
系统整体架构、模块总览和数据流说明。

- 系统概述
- 模块总览
- 模块详细说明
- 数据流
- 设计模式

### 2. [模块关系](./module-relationships.md)
详细的模块依赖关系和交互说明。

- 依赖关系图
- 数据流向
- 模块交互矩阵
- 工具调用链
- 启动时序
- 扩展点

### 3. [模块功能详述](./module-functions.md)
每个模块的详细功能说明和 API 参考。

- Agent 核心模块
- 工具模块
- 通道模块
- LLM 提供商模块
- 消息总线模块
- 定时任务模块
- 会话管理模块
- 配置模块
- WhatsApp 桥接模块

## 快速导航

| 如果你想了解... | 查看文档 |
|----------------|----------|
| 系统整体架构 | [architecture.md](./architecture.md) |
| 模块如何协作 | [module-relationships.md](./module-relationships.md) |
| 具体模块功能 | [module-functions.md](./module-functions.md) |
| 添加新通道 | [module-relationships.md#82-添加新通道](./module-relationships.md#82-添加新通道) |
| 添加新工具 | [module-relationships.md#83-添加新工具](./module-relationships.md#83-添加新工具) |
| API 参考 | [module-functions.md](./module-functions.md) |

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLI 入口层                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                           核心服务层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ ChannelManager│  │  AgentLoop   │  │ CronService │           │
│  │  (通道管理)   │  │  (Agent核心) │  │ (定时任务)  │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
   ┌────────────┐    ┌────────────┐    ┌────────────┐
   │  通道层     │    │   工具层    │    │  会话管理   │
   │ (Channels) │    │  (Tools)   │    │ (Session)  │
   └────────────┘    └────────────┘    └────────────┘
```

## 核心数据流

1. **入站消息**: Channel → MessageBus → AgentLoop → LLM → Tools
2. **出站消息**: AgentLoop → MessageBus → ChannelManager → Channel → User
3. **子代理**: SpawnTool → SubagentManager → Background Task → System Message

## 主要技术栈

- **Python 3.11+**: 核心框架
- **LiteLLM**: LLM 提供商抽象
- **asyncio**: 异步编程
- **Pydantic**: 数据验证
- **python-telegram-bot**: Telegram 支持
- **lark-oapi**: 飞书支持
- **@whiskeysockets/baileys**: WhatsApp 协议
- **TypeScript**: WhatsApp Bridge

## 贡献指南

如需添加新功能或修改现有模块，请参考：

1. [模块关系文档](./module-relationships.md) 了解模块交互
2. [模块功能文档](./module-functions.md) 查看具体 API
3. [架构文档](./architecture.md) 理解整体设计
