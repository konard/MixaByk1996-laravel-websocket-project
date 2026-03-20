# Node.js Portfolio Projects

Three production-ready backend projects demonstrating experience with Node.js, Express.js, NestJS, MongoDB, Redis, Socket.IO, CRON scheduling, and comprehensive testing with Jest.

---

## Projects

### [01 — Express REST API](./01-express-rest-api/)
**REST API with Express.js, MongoDB, Redis caching, and JWT auth**

Layered REST API for a product catalog service. Demonstrates JWT authentication with RBAC, Redis read-through caching with TTL management, Mongoose ODM with text-search indexes, input validation with Joi, centralized error handling, rate limiting, and Jest unit + integration tests with Supertest.

**Stack:** Node.js · Express.js · MongoDB · Mongoose · Redis · JWT · Jest · Supertest · Joi · Helmet · Winston

---

### [02 — NestJS Chat App](./02-nestjs-chat-app/)
**Real-time messaging with NestJS, Socket.IO, MongoDB, and JWT**

Full-featured real-time chat service. Demonstrates NestJS modular architecture with dependency injection, Socket.IO WebSocket gateway with room management, JWT authentication at the WebSocket handshake level, user presence tracking (online/offline), message history with MongoDB, and NestJS Testing with Jest.

**Stack:** NestJS · Socket.IO · MongoDB · Mongoose · JWT · Passport · Jest · TypeScript · class-validator

---

### [03 — Job Scheduler](./03-job-scheduler/)
**Distributed task execution with Node.js, CRON, Redis queue, and MongoDB**

Distributed job scheduling engine with CRON triggers, Redis priority queue, concurrent worker pool, retry logic, dead-letter queue, and pluggable job handlers (HTTP webhooks, email, data cleanup). Demonstrates node-cron, Redis sorted sets for priority queuing, run history, graceful shutdown, and Jest unit tests with full mocking.

**Stack:** Node.js · node-cron · Redis · MongoDB · Mongoose · axios · nodemailer · Jest · Winston

---

## Skills Demonstrated

| Skill | Project(s) |
|-------|-----------|
| Node.js + Express.js | 01 |
| NestJS framework | 02 |
| MongoDB + Mongoose ODM | 01, 02, 03 |
| Redis (caching, queues, pub/sub) | 01, 03 |
| Socket.IO real-time events | 02 |
| CRON job scheduling | 03 |
| JWT authentication | 01, 02 |
| Jest testing (unit + integration) | 01, 02, 03 |
| TypeScript | 02 |
| Winston structured logging | 01, 02, 03 |
| Distributed worker patterns | 03 |
| Dead-letter / retry queues | 03 |
