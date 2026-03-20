# NestJS Chat App — Real-Time Messaging Service

## Project Overview

A real-time chat application built with **NestJS**, **Socket.IO**, and **MongoDB**. Supports multiple rooms, JWT-based connection authentication, message history, presence tracking, and full CRUD for messages — all driven by WebSocket events.

## Resume Description

> **Real-Time Chat Service** — Architected and implemented a production-ready real-time messaging service using NestJS framework with WebSocket support via Socket.IO. Designed event-driven gateway with room-based messaging, user presence tracking (online/offline status), and persistent message history stored in MongoDB with Mongoose schemas. Applied JWT authentication at the WebSocket handshake level to secure all socket connections. Leveraged NestJS's dependency injection, decorators, and modular architecture to keep the codebase maintainable and testable. Achieved comprehensive unit test coverage with NestJS Testing module and Jest mocks.

## Tech Stack

| Technology | Purpose |
|---|---|
| NestJS | Framework with DI, decorators, modules |
| Socket.IO | WebSocket server and namespace routing |
| MongoDB + Mongoose | Message and user persistence |
| JWT + Passport | Connection authentication |
| Jest + @nestjs/testing | Unit testing |
| class-validator | DTO validation |
| TypeScript | Type safety |

## Architecture

```
src/
├── auth/
│   ├── dto/           # RegisterDto, LoginDto
│   ├── guards/        # JwtAuthGuard
│   ├── strategies/    # JwtStrategy (Passport)
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
├── chat/
│   ├── dto/           # SendMessageDto, JoinRoomDto
│   ├── schemas/       # Message schema
│   ├── chat.service.ts   # DB operations
│   ├── chat.gateway.ts   # WebSocket event handlers
│   └── chat.module.ts
├── users/
│   ├── schemas/       # User schema
│   ├── users.service.ts
│   └── users.module.ts
├── app.module.ts
└── main.ts
```

## WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `room:join` | `{ room: string }` | Join a chat room |
| `room:leave` | `{ room: string }` | Leave a chat room |
| `message:send` | `{ content, room }` | Send a message to a room |
| `message:delete` | `{ messageId, room }` | Delete own message |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room:history` | `{ room, messages[] }` | Message history on join |
| `room:user_joined` | `{ userId, name, room }` | User joined notification |
| `room:user_left` | `{ userId, name, room }` | User left notification |
| `message:new` | `Message` | New message broadcast |
| `message:deleted` | `{ messageId }` | Message deleted broadcast |
| `user:online` | `{ userId, name }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |

## Getting Started

```bash
npm install
cp .env.example .env
npm run start:dev

# Run tests
npm test
```

## Connecting via Socket.IO

```js
const socket = io('http://localhost:3001/chat', {
  auth: { token: '<your-jwt-token>' }
});

socket.emit('room:join', { room: 'general' });
socket.on('message:new', (msg) => console.log(msg));
socket.emit('message:send', { room: 'general', content: 'Hello!' });
```
