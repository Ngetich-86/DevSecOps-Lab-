# Security Scanning: Trivy and SonarQube

This project integrates container and source scanning with Trivy, and code quality/SAST analysis with SonarQube.

## 1) Services via Docker Compose

- Bring up stack (Postgres/Redis/App/Prometheus/Grafana/Jenkins/SonarQube):

```bash
docker-compose up -d
```

- URLs:
  - Jenkins: http://localhost:8080
  - SonarQube: http://localhost:9000 (default admin/admin)
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001 (admin/admin)

- Check containers:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 2) SonarQube Setup

1. Login to SonarQube (admin/admin) and change the password.
2. Create a token: My Account → Security → Generate Token (e.g., `jenkins-token`).
3. In Jenkins: Manage Jenkins → Credentials → System → Global → Add Credentials → Secret text
   - Secret: <your sonar token>
   - ID: `sonar-token`
4. Pipeline uses scanner container with env `SONAR_HOST_URL=http://localhost:9000`.

Sonar scanner settings in `Jenkinsfile`:
- Project key/name: `DevSecOps-TaskManager`
- Sources: `./src`
- Tests: `./__tests__`
- Coverage: `coverage/lcov.info`

## 3) Trivy Scans

Trivy runs in two ways from the pipeline:

- Filesystem/IaC/Dependencies:
```bash
trivy fs --exit-code 0 --severity HIGH,CRITICAL --scanners vuln,config .
```
- Docker image:
```bash
trivy image --exit-code 0 --severity HIGH,CRITICAL devsecops-taskmanager-app:${BUILD_NUMBER}
```

If Trivy is not installed on the Jenkins node, the pipeline skips gracefully. To install locally (Linux):

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
trivy --version
```

## 4) Run the Pipeline

- Ensure services are up:
```bash
docker-compose up -d jenkins sonarqube
```
- Open Jenkins and run the `taskmanager-pipeline` job.
- After the run, view Sonar results at http://localhost:9000.

## 5) Troubleshooting

- SonarQube takes ~1-2 minutes on first start. Check logs:
```bash
docker logs -f taskmanager-sonarqube
```
- If Jenkins can’t reach SonarQube, verify `SONAR_HOST_URL` and the `sonar-token` credential in Jenkins.
- If Trivy is unavailable on the Jenkins node, install it or run scans from a containerized step.
