import client from 'prom-client';

// Enable default metrics
client.collectDefaultMetrics();

// Create a counter for errors
export const errorCount = new client.Counter({
  name: 'error_count',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint'],
});

// Create a counter for HTTP requests
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Create a histogram for request duration
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Middleware to track requests
export const prometheusMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
    }, duration);
  });

  next();
};

// Metrics endpoint handler
export const getMetrics = async () => {
  return await client.register.metrics();
};

// Function to get metrics content type
export const getMetricsContentType = () => {
  return client.register.contentType;
};
