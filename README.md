# Bitespeed Identity Reconciliation Service

REST API that identifies and links customer contacts across multiple purchases, even when different emails or phone numbers are used.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker (Recommended)](#docker-recommended)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Identity Reconciliation Logic](#identity-reconciliation-logic)
- [Test Scenarios](#test-scenarios)
- [Database Schema](#database-schema)
- [Scripts](#scripts)

---

## Overview

FluxKart.com uses Bitespeed to track customer identity across purchases. The challenge: customers like Doc Brown use different emails and phone numbers for each order. This service links all those contacts together and always returns a unified, consolidated view of the customer.

**Key behaviours:**

- Creates a new `primary` contact if no match is found
- Creates a `secondary` contact if new info is linked to an existing contact
- Merges two separate contact clusters when a request bridges them, demoting the newer primary to secondary

---

## Tech Stack

| Layer            | Technology              |
| ---------------- | ----------------------- |
| Runtime          | Node.js 20              |
| Framework        | Express.js              |
| Language         | TypeScript              |
| ORM              | Drizzle ORM             |
| Database         | PostgreSQL 16           |
| Validation       | Zod                     |
| Package Manager  | pnpm                    |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
bitespeed-identity/
.
├── Dockerfile
├── README.md
├── docker-compose.yml
├── drizzle
│   └── migrations
│       ├── 0000_chemical_red_hulk.sql
│       └── meta
│           ├── 0000_snapshot.json
│           └── _journal.json
├── drizzle.config.ts
├── nodemon.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── src
│   ├── app.ts
│   ├── db
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── middleware
│   │   └── errorHandler.ts
│   ├── routes
│   │   └── identify.ts
│   ├── services
│   │   └── identity.service.ts
│   ├── types
│   │   └── index.ts
│   ├── utils
│   │   └── logger.ts
│   └── validators
│       └── identify.schema.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

---

### Docker (Recommended)

Runs the full stack (app + postgres) inside Docker with a single command.

```bash
# Build and start everything
docker-compose up --build

# Run in background
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down

# Stop and remove volumes (wipes database)
docker-compose down -v
```

> Migrations run automatically on container startup before the server starts.

---

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-username/bitespeed-identity.git
cd bitespeed-identity

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env

# 4. Start only Postgres in Docker
docker-compose up postgres -d

# 5. Generate and run migrations
pnpm db:generate
pnpm db:migrate

# 6. Start dev server with hot reload
pnpm dev
```

Server runs at **http://localhost:3000**

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitespeed
NODE_ENV=development
```

| Variable       | Description                   | Default       |
| -------------- | ----------------------------- | ------------- |
| `PORT`         | Port the server listens on    | `3000`        |
| `DATABASE_URL` | PostgreSQL connection string  | —             |
| `NODE_ENV`     | `development` or `production` | `development` |

---

## API Reference

### `POST /identify`

Identifies and consolidates a customer contact based on email and/or phone number.

**Request Body**

```json
{
  "email": "string (optional)",
  "phoneNumber": "string | number (optional)"
}
```

> At least one of `email` or `phoneNumber` must be provided.

**Success Response — 200 OK**

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

**Error Response — 400 Validation Error**

```json
{
  "error": "Validation Error",
  "details": [
    {
      "path": "root",
      "message": "At least one of email or phoneNumber must be provided"
    }
  ]
}
```

---

### `GET /health`

Health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2026-02-27T00:00:00.000Z"
}
```

---

## Identity Reconciliation Logic

```
Incoming request (email and/or phoneNumber)
         │
         ▼
  Match existing contacts?
         │
    ┌────┴────┐
   NO        YES
    │         │
    ▼         ▼
 Create    Resolve all primaries
 new       in matched clusters
 primary        │
    │      ┌───┴───┐
    │    ONE    MULTIPLE
    │      │    primaries
    │      │       │
    │      │   Demote newer
    │      │   primaries to
    │      │   secondary
    │      │       │
    │      └───┬───┘
    │          ▼
    │    Any new info
    │    in request?
    │      │
    │   ┌──┴──┐
    │  YES   NO
    │   │     │
    │   ▼     │
    │ Create  │
    │ new     │
    │ secondary│
    │   │     │
    └───┴─────┘
         │
         ▼
  Return consolidated contact
```

---

## Database Schema

```sql
CREATE TYPE link_precedence AS ENUM ('primary', 'secondary');

CREATE TABLE contact (
  id              SERIAL PRIMARY KEY,
  phone_number    TEXT,
  email           TEXT,
  linked_id       INTEGER REFERENCES contact(id) ON DELETE SET NULL,
  link_precedence link_precedence NOT NULL DEFAULT 'primary',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
```

- A **primary** contact has `linked_id = NULL`
- A **secondary** contact has `linked_id` pointing to its primary
- The oldest contact in a cluster is always the primary
- Soft deletes via `deleted_at`

---

## Scripts

```bash
pnpm dev           # Start dev server with hot reload
pnpm build         # Compile TypeScript → dist/
pnpm start         # Run compiled server
pnpm db:generate   # Generate SQL migrations from schema
pnpm db:migrate    # Apply migrations to database
pnpm db:studio     # Open Drizzle Studio (visual DB browser)
```
