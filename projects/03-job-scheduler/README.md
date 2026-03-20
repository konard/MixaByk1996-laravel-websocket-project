# Job Scheduler — Distributed Task Execution Engine

## Project Overview

A distributed job scheduling system built with **Node.js**, **node-cron**, **Redis**, and **MongoDB**. Supports CRON-based scheduling, Redis-backed priority queues, concurrent worker processing, automatic retries with dead-letter queue, and multiple job type handlers.

## Resume Description

> **Distributed Job Scheduler** — Designed and implemented a production-grade distributed task execution engine using Node.js with node-cron for CRON expression scheduling, Redis sorted sets as a priority queue for reliable job dispatch, and MongoDB (Mongoose) for persistent job definitions and execution history. Implemented a multi-handler worker pool supporting HTTP webhook execution, email delivery via SMTP, and database data-cleanup jobs. Built retry logic with configurable backoff, dead-letter queue for permanently failed jobs, graceful shutdown, and per-job run history. Achieved 90%+ test coverage with Jest using comprehensive mocks for Redis, MongoDB, and external HTTP calls.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| node-cron | CRON expression parsing and scheduling |
| Redis (sorted sets + lists) | Priority queue and dead-letter queue |
| MongoDB + Mongoose | Job definitions and execution history |
| axios | HTTP webhook handler |
| nodemailer | Email job handler |
| Jest | Unit testing with mocks |
| Winston | Structured logging |

## Architecture

```
src/
├── config/
│   ├── database.js      # MongoDB connection
│   └── redis.js         # Redis client
├── models/
│   └── Job.js           # Job schema (cron, type, payload, runs, status)
├── services/
│   ├── job.service.js   # CRON scheduling, job CRUD
│   └── queue.service.js # Redis queue operations
├── workers/
│   ├── job.worker.js    # Worker poll loop + retry logic
│   └── handlers/
│       ├── index.js         # Handler registry
│       ├── http_request.js  # HTTP webhook handler
│       ├── email.js         # SMTP email handler
│       └── data_cleanup.js  # MongoDB collection cleanup handler
├── utils/logger.js
└── index.js             # Entry point: connects, schedules, starts worker
```

## Job Flow

```
[CRON trigger]
     │
     ▼
job.service → triggerJob()
     │
     ▼
queue.service → enqueue(jobId) → Redis sorted set
     │
     ▼
job.worker → poll() → dequeue() → processJob()
     │
     ├── success → status: completed, save run record
     │
     └── failure → retry (up to maxRetries)
                        │
                        └── max retries exceeded → dead-letter queue
```

## Job Types

| Type | Description | Required Payload |
|------|-------------|-----------------|
| `http_request` | HTTP/HTTPS webhook call | `url`, `method`, `expectedStatus` |
| `email` | Send SMTP email | `to`, `subject`, `text`/`html` |
| `data_cleanup` | Delete old MongoDB documents | `collection`, `olderThanDays` |
| `report_generation` | Generate reports (extensible) | custom |
| `custom_script` | Run sandboxed logic (extensible) | custom |

## Example Job Definitions

```js
// Cleanup old logs every night at 2am
{
  name: "Nightly Log Cleanup",
  type: "data_cleanup",
  cronExpression: "0 2 * * *",
  payload: { collection: "logs", olderThanDays: 30 }
}

// Health check ping every 5 minutes
{
  name: "API Health Check",
  type: "http_request",
  cronExpression: "*/5 * * * *",
  payload: { url: "https://myapi.example.com/health", expectedStatus: 200 }
}

// Weekly report email
{
  name: "Weekly Summary Email",
  type: "email",
  cronExpression: "0 9 * * MON",
  payload: { to: "admin@example.com", subject: "Weekly Report", text: "Your weekly summary..." }
}
```

## Getting Started

```bash
npm install
cp .env.example .env
npm start       # Start scheduler + worker
npm run worker  # Start worker only (separate process)

# Run tests
npm test
```

## Key Features

- **CRON Scheduling** with validation using node-cron
- **Redis Priority Queue** using sorted sets (`ZADD`/`ZPOPMIN`) for efficient O(log N) enqueue/dequeue
- **Dead-Letter Queue** via Redis lists for permanently failed jobs
- **Concurrent Worker** with configurable concurrency (default: 5 parallel jobs)
- **Automatic Retries** with configurable max retries and delay per job
- **Execution History** — last 50 runs stored per job with duration, output, and error info
- **Graceful Shutdown** on SIGTERM/SIGINT
- **Pluggable Handlers** — extend with new job types by adding a handler function
