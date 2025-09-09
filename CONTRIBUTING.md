# Contributing to DevSecOps-TaskManager

Thanks for your interest in contributing! This guide will help you get started contributing to the DevSecOps-TaskManager project.

## 🎯 Development Setup

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- Docker & Docker Compose (for local PostgreSQL and optional tooling)

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-username/DevSecOps-TaskManager.git
cd DevSecOps-TaskManager
pnpm install

# 2. Start local services (PostgreSQL)
docker compose up -d

# 3. Configure environment variables
# Create a .env file at the project root with at least:
# JWT_SECRET=your-dev-secret
# DATABASE_URL=postgresql://taskuser:taskpassword@localhost:5432/taskdb

# 4. Run database migrations (Drizzle)
pnpm migrate

# 5. Start development server
pnpm dev
```

### Useful Scripts

```bash
# Lint
pnpm lint
pnpm lint:fix

# Build TypeScript
pnpm build

# Tests (Jest)
pnpm test            # all tests
pnpm test:unit       # unit tests only
pnpm test:integration# integration tests only
pnpm test:coverage   # with coverage

# Drizzle (schema/migrations)
pnpm generate        # generate migrations from schema
pnpm migrate         # run migrations
```

## 🏗️ Architecture Overview

### Project

- **API**: Node.js + Express (TypeScript)
- **ORM**: Drizzle ORM with PostgreSQL
- **Validation**: Zod
- **Observability**: Prometheus metrics + Grafana dashboards
- **Security**: Rate limiting, JWT-based auth
- **CI**: GitHub Actions (lint, build, tests, artifacts)
- **Optional**: Jenkins + SonarQube + Trivy (see docs)

### Directory Highlights

```
src/
├── auth/           # Auth controller/router/service
├── category/       # Category feature
├── tasks/          # Tasks feature
├── drizzle/        # DB, schema, migrations, seed
├── middleware/     # Bearer auth, Prometheus middleware
├── config/         # logger, mailer, queue, rate limiter
├── server.ts       # App bootstrapping
└── index.ts        # Entrypoint
```

## 📋 Team Roles & Responsibilities

- **Leads**: Architecture decisions, code review, coordination
- **Contributors**: Feature development, bug fixes, testing
- **Reviewers**: Code quality, documentation, testing

## 🛠️ Development Workflow

### 1. Pick a Task

- Check GitHub Issues for available tasks
- Comment on the issue to claim it
- Ask questions if anything is unclear

### 2. Branching & Commits

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Commit with clear messages (Conventional Commits)
git commit -m "feat(auth): add refresh token endpoint"
```

Recommended types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

### 3. Local Development

- Keep `pnpm dev` running for hot reload (via nodemon)
- Ensure PostgreSQL is running (via `docker compose up -d`)
- Run `pnpm migrate` when you change the schema in `src/drizzle/schema.ts`
- Maintain code quality: `pnpm lint`
- Add/Update tests for your changes

### 4. Testing

- Unit tests belong under `__tests__/unit/`
- Integration tests belong under `__tests__/integration/`
- CI uses `jest.config.ts` and `__tests__/setup.ts` with a dedicated test DB

```bash
# Start Postgres (if not already)
docker compose up -d

# Run tests
pnpm test
```

## ✅ Pull Request Guidelines

- Ensure your branch is up to date with the default branch
- Pass CI (lint, build, tests)
- Include or update tests for new behavior
- Update documentation (README, docs/, or comments) as needed
- Provide a clear PR description and link related issues
- Screenshots are welcome for any visible changes

## 🧪 CI: GitHub Actions

- Every push/PR to `main`/`master` runs CI defined in `.github/workflows/ci.yml`
- CI steps: install deps, start Postgres service, run migrations, lint, build, run unit & integration tests
- Artifacts: JUnit test reports and coverage
- See `CI-PIPELINE-EXPLAINED.md` for details

## 📝 Code Standards

### TypeScript

- Use strict, explicit types for public APIs
- Prefer interfaces for object contracts
- Meaningful variable names; avoid abbreviations
- Early returns; avoid deep nesting
- Handle errors explicitly; no silent catches

### Linting & Formatting

- Run `pnpm lint` before opening a PR
- Fix issues with `pnpm lint:fix`

### Testing

- Prefer small, focused tests
- Name tests to describe behavior
- Keep unit tests fast and isolated

## 🚀 Deployment (Overview)

- Local dev uses `docker-compose.yml` for PostgreSQL and monitoring stack
- Production/staging examples provided in `docker-compose.*.yml`
- Jenkins/SonarQube/Trivy/Grafana docs are in `docs/`

## 🤝 Communication

- Use GitHub Issues for bugs, features, and questions
- Use Discussions for architectural questions
- Tag maintainers or relevant code owners in PRs when needed

## 📚 Resources

- `README.md` – Project overview
- `docs/` – Docker, Jenkins, Grafana, Trivy & SonarQube guides
- `__tests__/` – Examples of unit and integration tests

## ❓ Questions?

- Open a GitHub Discussion or Issue
- PR comments are welcome if you’re proposing a change

Let’s build something secure and reliable together!
