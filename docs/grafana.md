# Grafana Implementation Guide

This guide provides step-by-step instructions for implementing Grafana monitoring in the DevSecOps TaskManager project.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Implementation Steps](#implementation-steps)
- [Configuration Files](#configuration-files)
- [Running the Setup](#running-the-setup)
- [Accessing Grafana](#accessing-grafana)
- [Dashboard Overview](#dashboard-overview)
- [Troubleshooting](#troubleshooting)

## Overview

This project implements a complete monitoring stack using:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Node.js Application**: Custom metrics via prom-client

The monitoring stack provides insights into:
- HTTP request rates and response times
- Error rates and application health
- System performance metrics
- Custom business metrics

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Basic understanding of monitoring concepts

## Implementation Steps

### Step 1: Install Prometheus Client

The project uses `prom-client` for Node.js metrics collection:

```bash
pnpm install prom-client
```

### Step 2: Create Prometheus Middleware

Create `src/middleware/prometheus.ts` with the following components:

```typescript
import client from 'prom-client';

// Enable default metrics
client.collectDefaultMetrics();

// Create custom metrics
export const errorCount = new client.Counter({
  name: 'error_count',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint'],
});

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to track requests
export const prometheusMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });
  
  next();
};

// Metrics endpoint handler
export const getMetrics = async () => {
  return await client.register.metrics();
};

export const getMetricsContentType = () => {
  return client.register.contentType;
};
```

### Step 3: Integrate Middleware in Server

Add the Prometheus middleware to your Express server (`src/server.ts`):

```typescript
import { prometheusMiddleware, getMetrics, getMetricsContentType } from './middleware/prometheus';
import client from 'prom-client';

// Add middleware
app.use(prometheusMiddleware);

// Add metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await getMetrics());
  } catch (error) {
    res.status(500).end(error);
  }
});
```

### Step 4: Configure Prometheus

Create `prometheus.yml` in the project root:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nodejs-app'
    static_configs:
      - targets: ['app:3000']  # Docker service name
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### Step 5: Configure Docker Compose

Add Prometheus and Grafana services to `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  # Prometheus (monitoring)
  prometheus:
    image: prom/prometheus:latest
    container_name: taskmanager-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - app-network
    restart: unless-stopped

  # Grafana (observability)
  grafana:
    image: grafana/grafana:10.4.6
    container_name: taskmanager-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: false
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  grafana_data:
  prometheus_data:

networks:
  app-network:
    driver: bridge
```

### Step 6: Create Grafana Provisioning

#### 6.1 Create Directory Structure
```bash
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p grafana/dashboards
```

#### 6.2 Configure Prometheus Datasource
Create `grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

#### 6.3 Configure Dashboard Provisioning
Create `grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

#### 6.4 Create Application Dashboard
Create `grafana/dashboards/nodejs-app-dashboard.json` with panels for:
- HTTP Request Rate
- 95th Percentile Response Time
- Error Rate
- Total HTTP Requests

## Configuration Files

### File Structure
```
project-root/
├── prometheus.yml
├── docker-compose.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       └── dashboard.yml
│   └── dashboards/
│       └── nodejs-app-dashboard.json
└── src/
    └── middleware/
        └── prometheus.ts
```

### Key Configuration Points

1. **Port Mapping**:
   - Application: `3000:3000`
   - Prometheus: `9090:9090`
   - Grafana: `3001:3000`

2. **Service Dependencies**:
   - Grafana depends on Prometheus
   - Prometheus scrapes the application

3. **Data Persistence**:
   - Grafana data: `grafana_data` volume
   - Prometheus data: `prometheus_data` volume

## Running the Setup

### 1. Start All Services
```bash
docker-compose up -d
```

### 2. Verify Services are Running
```bash
docker-compose ps
```

Expected output:
```
NAME                     IMAGE                    STATUS
taskmanager-api          taskmanager-api          Up
taskmanager-db           postgres:15-alpine       Up
taskmanager-grafana      grafana/grafana:10.4.6   Up
taskmanager-prometheus   prom/prometheus:latest   Up
taskmanager-redis        redis:7-alpine           Up
```

### 3. Check Service Logs
```bash
# Check application logs
docker-compose logs app

# Check Prometheus logs
docker-compose logs prometheus

# Check Grafana logs
docker-compose logs grafana
```

## Accessing Grafana

### 1. Open Grafana
Navigate to: http://localhost:3001

### 2. Login
- **Username**: `admin`
- **Password**: `admin`

### 3. Verify Prometheus Datasource
1. Go to **Configuration** → **Data Sources**
2. Verify **Prometheus** datasource is configured
3. Test the connection

### 4. Access Dashboard
1. Go to **Dashboards**
2. Find **Node.js Application Metrics**
3. Verify all panels are displaying data

## Dashboard Overview

The Node.js Application Dashboard includes:

### 1. HTTP Request Rate
- **Query**: `rate(http_requests_total[5m])`
- **Purpose**: Shows requests per second over time
- **Alert Threshold**: Monitor for unusual spikes

### 2. 95th Percentile Response Time
- **Query**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- **Purpose**: Performance monitoring
- **Alert Threshold**: > 2 seconds

### 3. Error Rate
- **Query**: `rate(error_count[5m])`
- **Purpose**: Error tracking and alerting
- **Alert Threshold**: > 0.1 errors/second

### 4. Total HTTP Requests
- **Query**: `http_requests_total`
- **Purpose**: Request volume monitoring
- **Use Case**: Traffic analysis and capacity planning

## Troubleshooting

### Common Issues

#### 1. Grafana Cannot Connect to Prometheus
**Symptoms**: Datasource test fails
**Solutions**:
- Verify Prometheus is running: `docker-compose ps`
- Check Prometheus logs: `docker-compose logs prometheus`
- Ensure services are on the same network

#### 2. No Metrics in Dashboard
**Symptoms**: Dashboard shows "No data"
**Solutions**:
- Verify application metrics endpoint: http://localhost:3000/metrics
- Check Prometheus targets: http://localhost:9090/targets
- Ensure application is generating traffic

#### 3. Services Not Starting
**Symptoms**: Containers exit immediately
**Solutions**:
- Check logs: `docker-compose logs [service-name]`
- Verify port conflicts
- Check Docker daemon is running

#### 4. Dashboard Not Loading
**Symptoms**: Dashboard appears but no panels
**Solutions**:
- Verify dashboard JSON is valid
- Check Grafana logs for errors
- Ensure datasource is properly configured

### Useful Commands

```bash
# Restart specific service
docker-compose restart grafana

# View real-time logs
docker-compose logs -f grafana

# Rebuild and restart
docker-compose up -d --build

# Clean up everything
docker-compose down -v

# Check service health
docker-compose ps
```

### Monitoring Commands

```bash
# Check application metrics
curl http://localhost:3000/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana health
curl http://localhost:3001/api/health
```

## Best Practices

1. **Security**: Change default Grafana credentials in production
2. **Retention**: Configure appropriate data retention policies
3. **Alerts**: Set up alerting rules for critical metrics
4. **Backup**: Regularly backup Grafana dashboards and configurations
5. **Updates**: Keep Grafana and Prometheus images updated

## Next Steps

1. **Set up Alerting**: Configure alert rules in Prometheus
2. **Custom Dashboards**: Create business-specific dashboards
3. **Log Integration**: Add ELK stack for log analysis
4. **APM**: Integrate Application Performance Monitoring tools
5. **SLI/SLO**: Define Service Level Indicators and Objectives

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Node.js Prometheus Client](https://github.com/siimon/prom-client)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
