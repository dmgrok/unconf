# WebSocket Hosting Options for Event Tools Lab

> **Current Status**: Using polling fallback for Vercel serverless deployment.  
> **Decision Date**: December 31, 2025

## The Problem

Vercel's serverless architecture doesn't support persistent WebSocket connections. Our Socket.io server (`src/lib/websocket/server.ts`) requires a persistent server to maintain real-time connections.

## Current Solution: Polling Fallback + SessionStorage

The WebSocket client (`src/lib/websocket/client.ts`) automatically detects when running on Vercel and falls back to HTTP polling:

- **Poll interval**: 3 seconds
- **Auto-detection**: Checks if `VITE_WEBSOCKET_URL` is configured
- **Graceful degradation**: WebSocket failures trigger polling fallback
- **Poll data**: Stored in `sessionStorage` (same-tab persistence)

### Current Limitations

The standalone poll tool (`/tools/poll`) currently has these limitations:

| Feature | Status | Notes |
|---------|--------|-------|
| Create poll | ✅ Works | Generates unique ID |
| Vote in poll | ✅ Works | Within same browser tab |
| Share URL | ✅ Works | URL includes poll ID |
| QR code | ✅ Works | Links to specific poll |
| Cross-tab sync | ⚠️ Same-device only | Uses `storage` events |
| Cross-device voting | ❌ Not yet | Requires server-side storage |

**Why**: `sessionStorage` is tab-specific. Each tab/device has its own session.

### Workarounds for Cross-Device Polling

For events needing cross-device voting today:
1. **Use event-connected poll** (`/events/[id]/tools/poll`) - Uses server storage
2. **Screen share the results** - Organizer shares their screen with live results
3. **Wait for server-side storage** - Future enhancement

This works well for:
- ✅ Small events (<50 concurrent users)
- ✅ Same-device multi-tab scenarios
- ✅ Organizer presenting live results on shared screen
- ✅ Zero additional infrastructure cost

## Future Options (When Scaling)

### Option 1: Railway (Recommended for Socket.io)
- **Cost**: $5/month hobby plan or pay-per-use
- **Effort**: Low - deploy existing code
- **Pros**: Keep current Socket.io implementation
- **Setup**: Extract WebSocket server, deploy to Railway, set `VITE_WEBSOCKET_URL`

### Option 2: Ably or Pusher (Managed Service)
- **Cost**: Free tier (Ably: 6M msg/month, Pusher: 200K msg/day)
- **Effort**: Medium - SDK integration required
- **Pros**: Zero ops, auto-scaling, reliable
- **Best for**: Production events without DevOps resources

### Option 3: Fly.io (Edge Deployment)
- **Cost**: Free tier (3 shared VMs)
- **Effort**: Medium - Dockerfile setup
- **Pros**: Low latency globally, generous free tier
- **Best for**: International events with global participants

### Option 4: Cloudflare Durable Objects
- **Cost**: Pay-per-use
- **Effort**: High - different programming model
- **Pros**: Edge-native, extremely fast
- **Best for**: High-scale applications

### Option 5: Upstash Redis Pub/Sub
- **Cost**: Pay-per-use (very cheap)
- **Effort**: Medium - architecture change
- **Pros**: True serverless, works with Vercel
- **Best for**: Serverless-first architecture

## Decision Matrix

| Criteria | Polling | Railway | Ably | Fly.io |
|----------|---------|---------|------|--------|
| Cost | Free | $5/mo | Free tier | Free tier |
| Setup effort | Done ✅ | Low | Medium | Medium |
| Real-time latency | 3s | <100ms | <100ms | <100ms |
| Max concurrent users | ~50 | 1000+ | 10000+ | 1000+ |
| Ops overhead | None | Low | None | Low |

## When to Upgrade

Consider moving to a dedicated WebSocket host when:
- Event has >50 concurrent participants
- Real-time latency (<1s) is critical
- Running multiple simultaneous events
- User feedback indicates polling delay is problematic

## Environment Variables

```bash
# For Vercel (current - uses polling fallback)
# No VITE_WEBSOCKET_URL needed

# For dedicated WebSocket server (future)
VITE_WEBSOCKET_URL=wss://your-websocket-server.railway.app
```

## Related Files

- `src/lib/websocket/client.ts` - Client with polling fallback
- `src/lib/websocket/server.ts` - Socket.io server (for dedicated hosting)
- `src/routes/tools/poll/+page.svelte` - Poll tool using real-time updates
