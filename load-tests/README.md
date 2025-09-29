# UnConf Platform Load Testing

This directory contains load testing configuration and scripts for the UnConf platform, designed to test 200 concurrent users with realistic usage patterns.

## Overview

The load testing suite validates performance under peak load conditions, focusing on:
- **WebSocket connections** for real-time features (voting, activity switching)
- **HTTP requests** for page loads and API calls
- **Mixed user behaviors** (heavy voters, casual participants, organizers)
- **Concurrent user simulation** up to 200 users

## Test Configuration

### WebSocket Load Test (`artillery-config.yml`)
Tests real-time features with Socket.IO:
- **Peak Load**: 200 concurrent WebSocket connections
- **Duration**: ~8 minutes total (ramp-up, sustain, peak, cool-down)
- **Scenarios**: Heavy voters (40%), Casual participants (30%), Organizers (20%), Real-time interactions (10%)

### HTTP Load Test (`http-load-test.yml`)
Tests web application endpoints:
- **Peak Load**: 200 concurrent HTTP requests
- **Duration**: ~7 minutes total
- **Scenarios**: Main page visitors (35%), Event participants (40%), API heavy users (25%)

## Running Load Tests

### Prerequisites
```bash
# Ensure Artillery is installed
npm install

# Start the application server
npm run dev
```

### Individual Tests
```bash
# WebSocket load test only
npm run test:load:websocket

# HTTP load test only
npm run test:load:http
```

### Full Test Suite
```bash
# Run comprehensive load testing suite with reporting
npm run test:load
```

## Test Reports

Load test results are saved to `load-tests/results/`:
- **JSON Reports**: `load-test-report-{timestamp}.json` (machine-readable)
- **Markdown Reports**: `load-test-report-{timestamp}.md` (human-readable)
- **Artillery Metrics**: `metrics-{timestamp}.json` (detailed performance data)

## Performance Baselines

The tests validate against these performance thresholds:
- **Max Response Time**: 2,000ms
- **Max Concurrent Users**: 200
- **Min Success Rate**: 95%
- **Max Error Rate**: 5%
- **Max Memory Usage**: 512MB
- **Max CPU Usage**: 80%

## User Scenarios

### Heavy Voters (40% of traffic)
- Join event as participant
- Submit 5-15 votes with random topics
- Frequent heartbeat checks
- Variable think times (1-8 seconds)

### Casual Participants (30% of traffic)
- Join event as guest
- Minimal interaction (occasional heartbeats)
- Single vote (60% probability)
- Longer session duration

### Organizers (20% of traffic)
- Join event as organizer
- Switch activities (voting, games, discussions, teams)
- Manage timers (start, pause, reset, extend)
- Control event flow

### Real-time Interactions (10% of traffic)
- High-frequency WebSocket usage
- Vote/remove vote/re-vote patterns
- Rapid-fire API interactions
- Stress test connection stability

## Interpreting Results

### Success Criteria
- ✅ All tests complete without failures
- ✅ Response times under 2 seconds
- ✅ Success rate above 95%
- ✅ Error rate below 5%

### Common Issues
- **High Response Times**: Database optimization needed
- **WebSocket Timeouts**: Connection pool limits
- **Memory Leaks**: Check server resource usage
- **Rate Limiting**: Review API throttling

## Scaling Recommendations

Based on load test results:
- **Development**: Current configuration sufficient
- **Staging**: 1.5x tested capacity recommended
- **Production**: 2x tested capacity + auto-scaling
- **Event Days**: 3x tested capacity + monitoring

## Integration with CI/CD

Load tests can be integrated into deployment pipelines:
```yaml
# Example GitHub Actions step
- name: Load Testing
  run: npm run test:load
  env:
    NODE_ENV: production
```

## Monitoring in Production

Key metrics to monitor post-deployment:
- WebSocket connection count
- Average response times
- Error rates by endpoint
- Memory and CPU utilization
- Database connection pool usage

## Troubleshooting

### Test Failures
1. Check server logs during test execution
2. Verify all services are running (DB, WebSocket server)
3. Ensure sufficient system resources
4. Review network connectivity

### Performance Issues
1. Profile database queries during load
2. Monitor memory usage patterns
3. Check WebSocket connection limits
4. Review server configuration

## Next Steps

Consider additional testing:
- **Spike Testing**: Sudden traffic bursts
- **Endurance Testing**: Extended duration runs
- **Volume Testing**: Large data sets
- **Security Testing**: Auth under load