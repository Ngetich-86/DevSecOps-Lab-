import request from 'supertest';
import app from '../src/server';

describe('Health Check', () => {
  it('should return 200 for health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 200 for root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.text).toBe('Hello, World!');
  });

  it('should return metrics endpoint', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);
    
    expect(response.text).toContain('# HELP');
    expect(response.text).toContain('# TYPE');
  });
});