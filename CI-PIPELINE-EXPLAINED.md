# CI Pipeline Explained (GitHub Actions)

This repository uses GitHub Actions to run Continuous Integration (CI) on every push and pull request to `main`/`master`.

## What the pipeline does
- Lints the codebase with ESLint
- Builds the TypeScript project
- Spins up PostgreSQL for tests
- Runs Jest unit tests and integration tests
- Uploads JUnit XML and coverage artifacts

## Triggers
- On push to `main`/`master`
- On pull requests targeting `main`/`master`

## Environment
- Runner: `ubuntu-latest`
- Node: v20
- Package manager: `pnpm`
- Database service: PostgreSQL 16

## Key environment variables
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret-key`
- `DATABASE_URL=postgresql://taskuser:taskpassword@localhost:5432/taskdb_test`

## Services
A PostgreSQL 16 container is started for integration tests with:
- `POSTGRES_USER=taskuser`
- `POSTGRES_PASSWORD=taskpassword`
- `POSTGRES_DB=taskdb_test`

The workflow waits until the DB is healthy using `pg_isready` before proceeding.

## Steps overview
1. Checkout code
2. Setup Node 20 and pnpm (cache enabled)
3. Install dependencies with `pnpm install --frozen-lockfile`
4. Wait for Postgres to be ready
5. Run database migrations: `pnpm migrate`
6. Lint: `pnpm lint`
7. Build: `pnpm build`
8. Run unit tests: `pnpm test:unit` (JUnit report exported)
9. Run integration tests: `pnpm test:integration` (JUnit report exported)
10. Upload artifacts: JUnit XML and coverage report

## Artifacts
- `junit-unit.xml` and `junit-integration.xml`: test results
- `coverage/`: Jest coverage HTML/LCOV

## Notes
- Jest is configured in `jest.config.ts` and test env vars are in `__tests__/setup.ts`.
- If you add new migrations, ensure `pnpm migrate` can run headlessly in CI.
- To add more jobs (e.g., Docker build, Trivy scan, SonarQube), create additional jobs or steps in `.github/workflows/ci.yml`.
