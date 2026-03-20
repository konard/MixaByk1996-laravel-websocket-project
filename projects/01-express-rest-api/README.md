# Express REST API — Product Catalog Service

## Project Overview

A production-ready RESTful API built with **Node.js** and **Express.js** featuring JWT authentication, MongoDB data persistence, Redis caching, and comprehensive test coverage with Jest.

## Resume Description

> **Product Catalog REST API** — Designed and implemented a scalable REST API with Express.js and MongoDB (Mongoose ODM) for a product catalog service. Integrated Redis for read-through caching to reduce database load by up to 80% on high-traffic list endpoints. Implemented JWT-based authentication with role-based access control (RBAC). Applied security hardening with Helmet, CORS policies, and rate limiting. Achieved 90%+ test coverage using Jest and Supertest with both unit and integration tests. Structured code using layered architecture (controllers, services, middleware).

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express.js | HTTP server and routing |
| MongoDB + Mongoose | Data persistence with schema validation |
| Redis | Read-through caching with TTL and pattern invalidation |
| JWT + bcryptjs | Authentication and password hashing |
| Jest + Supertest | Unit and integration testing |
| Helmet + CORS | Security headers |
| express-rate-limit | API rate limiting |
| Winston | Structured logging |
| Joi | Request validation |

## Architecture

```
src/
├── config/           # Database and Redis connection setup
├── controllers/      # Request handlers (auth, products)
├── middleware/       # Auth, validation, error handling
├── models/           # Mongoose schemas (User, Product)
├── routes/           # Express routers
├── services/         # Business logic (cache service)
├── utils/            # Logger
└── __tests__/
    ├── unit/         # Unit tests with mocks
    └── integration/  # Integration tests with supertest
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user (auth required) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (paginated, cached) |
| GET | `/api/products/:id` | Get product by ID (cached) |
| POST | `/api/products` | Create product (auth required) |
| PUT | `/api/products/:id` | Update product (owner/admin) |
| DELETE | `/api/products/:id` | Delete product (owner/admin) |

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server (requires MongoDB and Redis)
npm run dev

# Run tests
npm test
```

## Key Features

- **JWT Authentication** with configurable expiry and role-based authorization
- **Redis Caching** with per-route TTL, key invalidation, and a `wrap()` helper for easy cache-aside pattern
- **Input Validation** with Joi schemas on all write endpoints
- **Pagination** on list endpoints with total count and page metadata
- **Full-text Search** via MongoDB text indexes
- **Centralized Error Handling** with Mongoose error normalization
- **Structured Logging** with Winston (JSON in production, colored console in development)
