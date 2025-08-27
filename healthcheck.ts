import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000,
};

const req = http.request(options, (res) => {
  console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (err) => {
  console.error('HEALTHCHECK ERROR:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('HEALTHCHECK TIMEOUT');
  req.destroy();
  process.exit(1);
});

req.end();