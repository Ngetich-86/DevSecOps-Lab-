# Docker Guide

This document explains how to containerize, run, monitor, and deploy the DevSecOps-TaskManager using Docker and Docker Compose across local, staging, and production environments.

## Overview

- App container built from `Dockerfile` (Node.js 20 + pnpm + dumb-init)
- Orchestrated with `docker-compose.yml` (Postgres, Redis, App, Prometheus, Grafana, Jenkins)
- Staging and production overrides: `docker-compose.staging.yml`, `docker-compose.prod.yml`
- Health and metrics:
  - App health: GET `/health`
  - Prometheus metrics: GET `/metrics`
- Monitoring stack: Prometheus (`prometheus.yml`), Grafana provisioning (`grafana/provisioning/...`)

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2
- Internet access to pull base images

Optional for CI/CD and scans:
- Trivy installed locally (for image and filesystem scans)
- Access to a container registry

## Images and Build

The `Dockerfile` uses a multi-stage approach:
- Installs dependencies with pnpm in a separate layer
- Runs the app using `tsx` without a separate build step
- Adds a healthcheck that executes `healthcheck.ts`

Ports:
- App: 3000 (mapped to host 3000)
- Postgres: 5432
- Redis: 6379
- Prometheus: 9090
- Grafana: 3001 (host) → 3000 (container)
- Jenkins: 8080 (and 50000 for agents)

## Compose Services (local)

Defined in `docker-compose.yml`:
- `postgres` (image: `postgres:15-alpine`) with volume `postgres_data`
- `redis` (image: `redis:7-alpine`)
- `app` (built from local `Dockerfile`)
  - Env:
    - `DATABASE_URL=postgresql://taskuser:taskpassword@postgres:5432/taskdb`
    - `REDIS_URL=redis://redis:6379`
    - `PORT=3000`
    - `JWT_SECRET` (change for real usage)
  - Healthcheck runs `./node_modules/.bin/tsx healthcheck.ts`
  - Command runs `./node_modules/.bin/tsx src/index.ts`
- `prometheus` using `./prometheus.yml` and volume `prometheus_data`
- `grafana` with provisioning mounted and volume `grafana_data`
- `jenkins` built from `./jenkins/Dockerfile` with volume `jenkins_data`

Volumes:
- `postgres_data`, `grafana_data`, `prometheus_data`, `jenkins_data`

Network:
- `app-network` (bridge)

## Quick Start (local)

```bash
# 1. Set up environment variables
cp .env.example .env
# Edit .env with your preferred values

# 2. Start all core services (db, cache, app, monitoring, jenkins)
docker compose up -d

# 3. View logs for the app
docker compose logs -f app

# 4. Stop and remove containers (preserves volumes)
docker compose down

# 5. Stop, remove containers and volumes (data loss!)
docker compose down -v
```

**Using .env file:**
Docker Compose automatically loads `.env` files from the project root. You can override any environment variable defined in the compose files by setting it in your `.env` file.

Access:
- App: http://localhost:3000 (health at `/health`, metrics at `/metrics`)
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin by default)
- Jenkins: http://localhost:8080

## Environment Variables

The app consumes typical env vars via Compose:
- `DATABASE_URL` → Postgres DSN
- `REDIS_URL` → Redis connection string
- `JWT_SECRET` → Change in all environments
- `PORT` → App port (defaults to 3000 in container)

**Environment Setup:**
1. Copy `.env.example` to `.env` for local development:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your actual values (especially `JWT_SECRET` and `POSTGRES_PASSWORD`)
3. For staging/production, use environment-specific values when templating overrides

**Key Variables:**
- `JWT_SECRET`: Must be changed from default in all environments
- `POSTGRES_PASSWORD`: Database password (use strong passwords in production)
- `DOCKER_IMAGE_TAG`: Image tag for deployment (e.g., `your-registry.com/app:1.0.0`)
- `NODE_ENV`: Environment mode (`development`, `staging`, `production`)

## Healthchecks and Readiness

- App has an internal healthcheck in the `Dockerfile` and in `docker-compose.yml`
- Postgres and Redis include healthchecks; app depends on them with `condition: service_healthy`

Validate health:
```bash
curl -s http://localhost:3000/health
```

## Monitoring Stack

Prometheus configuration:
- `prometheus.yml` scrapes the app at `app:3000/metrics` and Prometheus itself

Grafana provisioning:
- `grafana/provisioning/datasources/prometheus.yml` points to `http://prometheus:9090`
- Import or place dashboards under `grafana/dashboards/`

Start only monitoring:
```bash
# If app is already running, ensure prometheus and grafana are up
docker compose up -d prometheus grafana
```

## Staging and Production

Overrides provide environment-specific knobs. They’re intended to be merged with the base compose file.

- `docker-compose.staging.yml`
  - Sets `NODE_ENV=staging`
  - Uses `image: ${DOCKER_IMAGE_TAG:-devsecops-taskmanager-app:latest}`
  - Restarts services `unless-stopped`

- `docker-compose.prod.yml`
  - Sets `NODE_ENV=production`
  - Uses `image: ${DOCKER_IMAGE_TAG:-devsecops-taskmanager-app:latest}`
  - Defines basic `deploy` resources and `replicas: 2` for the app
  - Externalize `POSTGRES_PASSWORD`, `JWT_SECRET`

Example templating with envsubst (as used in `Jenkinsfile`):
```bash
# Method 1: Using environment variables
export DOCKER_IMAGE_TAG=your-registry.com/devsecops-taskmanager-app:1.0.0
envsubst < docker-compose.staging.yml > docker-compose.staging.override.yml

# Deploy (merge base + override)
docker compose -f docker-compose.yml -f docker-compose.staging.override.yml up -d
```

Production variant:
```bash
# Method 2: Using .env file + envsubst
echo "DOCKER_IMAGE_TAG=your-registry.com/devsecops-taskmanager-app:1.0.0" > .env.prod
echo "POSTGRES_PASSWORD=strong-password" >> .env.prod
echo "JWT_SECRET=super-secret" >> .env.prod

envsubst < docker-compose.prod.yml > docker-compose.prod.override.yml

docker compose -f docker-compose.yml -f docker-compose.prod.override.yml up -d
```

**Alternative: Direct .env usage**
```bash
# Copy and customize environment file
cp .env.example .env.production
# Edit .env.production with production values

# Use with compose (Docker Compose will automatically load .env files)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

## CI/CD Integration (Jenkins)

The root `Jenkinsfile` includes pipeline stages for:
- Install dependencies, lint, type-check, and tests with coverage
- Build and push Docker image to a registry
- Optional security scans (Trivy, Snyk) when available
- Deploy to staging on `develop` and to production on `main`

Relevant snippets in the pipeline:
- Builds image: `${DOCKER_IMAGE}:${DOCKER_TAG}`
- Uses `envsubst` to template `docker-compose.*.yml` into override files
- Deploys via `docker-compose` merging base + override

Ensure credentials:
- Docker registry credentials ID: `docker-registry-credentials`
- Optional `SLACK_WEBHOOK_URL` for notifications

## Security Scanning

Local scans:
```bash
# Filesystem scan (dependencies + IaC)
trivy fs --severity HIGH,CRITICAL --scanners vuln,config .

# Image scan (after build)
docker build -t devsecops-taskmanager-app:local .
trivy image --severity HIGH,CRITICAL devsecops-taskmanager-app:local
```

Hardenings:
- Use non-root user (enabled in `Dockerfile`)
- Keep `JWT_SECRET` and DB passwords out of source control
- Pin image versions and use minimal bases

## Common Operations

```bash
# Rebuild the app image when source changes
docker compose build app && docker compose up -d app

# Tail logs
docker compose logs -f app postgres redis

# Exec into a container
docker compose exec app sh

# PSQL inside Postgres
docker compose exec postgres psql -U taskuser -d taskdb
```

## Troubleshooting

- App container unhealthy
  - Check `docker compose logs app`
  - Verify DB and Redis are healthy/ready
  - Confirm `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

- Grafana cannot see Prometheus
  - Ensure Grafana started after Prometheus
  - Verify datasource file at `grafana/provisioning/datasources/prometheus.yml`

- Port conflicts
  - Stop conflicting processes or change host port mappings in compose

- Jenkins cannot build/push images
  - Ensure Docker socket is mounted and credentials exist
  - Verify `REGISTRY`, `DOCKER_IMAGE`, and credentials ID in `Jenkinsfile`

## File Reference

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.staging.yml`
- `docker-compose.prod.yml`
- `prometheus.yml`
- `grafana/provisioning/datasources/prometheus.yml`
- `Jenkinsfile`
- `.env.example` (environment variables template)

---

For questions or improvements, open an issue or update this doc as your deployment evolves.
