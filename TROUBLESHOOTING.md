# UnConf Troubleshooting Guide

Comprehensive troubleshooting guide for common issues with the UnConf platform.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Voting Problems](#voting-problems)
- [Mobile Issues](#mobile-issues)
- [Performance Issues](#performance-issues)
- [Browser Compatibility](#browser-compatibility)
- [Authentication Issues](#authentication-issues)
- [Activity Switching](#activity-switching)
- [Data Sync Issues](#data-sync-issues)

---

## Connection Issues

### Real-Time Updates Not Working

**Symptoms:**
- Not seeing new topics/votes in real-time
- Activity changes not reflecting immediately
- Participant count not updating

**Solutions:**
1. **Check Connection Indicator**: Look for the connection status indicator in the UI (should be green)
2. **Refresh the Page**: Press F5 or Cmd/Ctrl+R to reload
3. **Check Internet**: Verify your internet connection is stable
4. **Try Different Network**: Switch from WiFi to mobile data or vice versa
5. **Disable VPN**: Some VPNs may interfere with WebSocket connections
6. **Check Firewall**: Ensure WebSocket connections (WSS) aren't blocked

**Technical Details:**
- UnConf uses WebSocket (WSS) connections for real-time updates
- Connection automatically attempts to reconnect if lost
- Fallback to HTTP polling if WebSocket fails

### Frequent Disconnections

**Symptoms:**
- Connection drops repeatedly
- "Connecting..." message appears frequently
- Lag in updates

**Solutions:**
1. **Stable Connection**: Ensure you have a stable internet connection (min 1 Mbps)
2. **Close Other Apps**: Free up bandwidth by closing streaming/download applications
3. **Router Distance**: Move closer to your WiFi router
4. **Browser Update**: Ensure you're using the latest browser version
5. **Clear Cache**: Clear browser cache and cookies
6. **Incognito Mode**: Try using incognito/private browsing mode

### Cannot Connect At All

**Symptoms:**
- Page loads but features don't work
- Error messages about connection failure
- Stuck on loading screen

**Solutions:**
1. **Check Status Page**: Verify the platform isn't undergoing maintenance
2. **Try Different Browser**: Test in Chrome, Firefox, or Safari
3. **Disable Extensions**: Browser extensions may interfere; try disabling them
4. **Check Firewall/Proxy**: Corporate firewalls may block WebSocket connections
5. **Contact Organizer**: Event may be closed or access revoked

---

## Voting Problems

### Cannot Submit Vote

**Symptoms:**
- Vote button doesn't work
- No response when clicking topics
- Error message when voting

**Solutions:**
1. **Voting Phase Active**: Confirm voting is still open (ask organizer)
2. **Already Voted**: You may have already used all your votes
3. **Refresh Page**: Reload to sync state
4. **Clear Selection**: Remove existing votes and try again
5. **Connection**: Check your internet connection

### Votes Not Appearing

**Symptoms:**
- Your votes don't show up
- Vote count doesn't change
- Can't see what you voted for

**Solutions:**
1. **Results Hidden**: Organizer may have hidden results until voting closes
2. **Check Vote Status**: Look for vote confirmation indicator
3. **Refresh**: Reload the page to see updated state
4. **Private Voting**: Individual votes are private until revealed
5. **Wrong Event**: Verify you're in the correct event

### Vote Count Incorrect

**Symptoms:**
- Vote totals don't match expectations
- Numbers seem wrong
- Discrepancies in rankings

**Understanding:**
- UnConf uses **weighted voting** (3, 2, 1 points)
- Total score = (First choice × 3) + (Second choice × 2) + (Third choice × 1)
- A topic with fewer votes but more "first choice" votes may rank higher

---

## Mobile Issues

### Text Too Small

**Solutions:**
1. **Rotate Device**: Try landscape orientation
2. **Browser Zoom**: Use pinch-to-zoom or browser zoom controls
3. **System Settings**: Increase text size in device settings
4. **Accessibility**: Enable larger text in accessibility settings

### Buttons Not Responding

**Solutions:**
1. **Direct Tap**: Ensure you're tapping directly on buttons (44px minimum)
2. **Remove Screen Protector**: Some protectors interfere with touch
3. **Clean Screen**: Dirt/moisture can affect touch sensitivity
4. **Restart Browser**: Close and reopen your mobile browser
5. **Update Browser**: Ensure you're using the latest version

### Keyboard Covering Input

**Solutions:**
1. **Scroll Up**: The page should auto-scroll, but try manually scrolling
2. **Close Keyboard**: Tap outside input, then tap input again
3. **Rotate Device**: Try landscape mode
4. **Full Screen**: Enable full-screen mode to maximize space

### Slow Performance

**Solutions:**
1. **Close Apps**: Close background applications
2. **Clear Cache**: Clear browser cache and data
3. **Restart Device**: Reboot your mobile device
4. **Update OS**: Ensure device software is up to date
5. **Use Chrome**: Chrome generally performs best on mobile

---

## Performance Issues

### Slow Page Load

**Symptoms:**
- Page takes long to load initially
- White screen on startup
- Delayed content rendering

**Solutions:**
1. **Check Connection Speed**: Run a speed test (min 1 Mbps recommended)
2. **Clear Cache**: Clear browser cache and reload
3. **Disable Extensions**: Browser extensions can slow loading
4. **Close Other Tabs**: Free up memory by closing unused tabs
5. **Update Browser**: Use the latest browser version

### Laggy Interactions

**Symptoms:**
- Delays when clicking buttons
- Animations stutter
- Slow response to inputs

**Solutions:**
1. **Close Background Apps**: Free up system resources
2. **Reduce Browser Tabs**: Close unnecessary tabs
3. **Disable Animations**: Check if browser/OS has reduced motion enabled
4. **Hardware Acceleration**: Enable in browser settings
5. **Upgrade Browser**: Older browser versions may be slower

### High Memory Usage

**Symptoms:**
- Browser becomes unresponsive
- System slowdown
- Browser crashes

**Solutions:**
1. **Refresh Page**: Reload to reset memory usage
2. **Close Other Tabs**: Limit number of open tabs
3. **Increase RAM**: Consider using a device with more memory
4. **Browser Settings**: Check for memory-intensive extensions
5. **Use Lite Mode**: Some browsers offer data/memory saver modes

---

## Browser Compatibility

### Supported Browsers

**Fully Supported:**
- Chrome 80+ (Desktop & Mobile)
- Firefox 80+ (Desktop & Mobile)
- Safari 12+ (macOS & iOS)
- Edge 80+ (Desktop & Mobile)

**Limited Support:**
- Internet Explorer: Not supported
- Older browsers: May have reduced functionality

### Browser-Specific Issues

**Safari:**
- Enable cross-site tracking if features don't work
- Update to latest iOS/macOS version
- Try disabling content blockers

**Firefox:**
- Check that WebSocket isn't blocked in about:config
- Disable strict tracking protection for the site
- Clear site-specific data

**Mobile Browsers:**
- Use native browsers (Safari on iOS, Chrome on Android)
- Avoid third-party browsers which may have limitations
- Enable JavaScript and cookies

---

## Authentication Issues

### Cannot Sign In

**Symptoms:**
- Google sign-in doesn't work
- Stuck on authentication screen
- Error after clicking sign in

**Solutions:**
1. **Pop-ups**: Enable pop-ups for the site
2. **Third-Party Cookies**: Allow third-party cookies
3. **Incognito**: Try in incognito/private mode
4. **Clear Cookies**: Clear cookies and try again
5. **Different Account**: Try a different Google account

### Guest Mode Not Working

**Symptoms:**
- Cannot continue as guest
- Guest access restricted
- Forced to sign in

**Reasons:**
- Organizer may have disabled guest access
- Event settings require authentication
- Session expired

**Solutions:**
1. **Contact Organizer**: Ask if guest access is enabled
2. **Sign In**: Use Google sign-in instead
3. **Clear Cookies**: Reset session and try again

### Session Expired

**Symptoms:**
- Logged out unexpectedly
- "Session expired" message
- Need to sign in again

**Solutions:**
1. **Re-authenticate**: Sign in again
2. **Enable Cookies**: Ensure cookies are enabled
3. **Stay Active**: Sessions expire after inactivity
4. **Check "Remember Me"**: If available, enable persistent sessions

---

## Activity Switching

### Activity Not Changing

**Symptoms:**
- Still seeing old activity
- Organizer switched but you don't see it
- Stuck on previous screen

**Solutions:**
1. **Refresh Page**: Reload to sync state
2. **Check Connection**: Ensure you're connected
3. **Wait**: Give it a few seconds to sync
4. **Clear Cache**: Clear cache and reload
5. **Ask Organizer**: Verify they actually switched

### Missing Activity Features

**Symptoms:**
- Expected features not available
- Activity appears broken
- Missing buttons or options

**Reasons:**
- Feature may be disabled by organizer
- Activity not yet started
- Insufficient permissions

**Solutions:**
1. **Check Settings**: Organizer controls feature availability
2. **Wait for Start**: Activity may not have started yet
3. **Contact Organizer**: Ask about feature availability
4. **Check Role**: Some features are role-restricted

---

## Data Sync Issues

### Changes Not Saving

**Symptoms:**
- Edits revert after refresh
- Submissions disappear
- Data not persisting

**Solutions:**
1. **Check Connection**: Ensure stable internet
2. **Don't Rapid-Fire**: Wait for confirmation before making more changes
3. **One Tab Only**: Close duplicate tabs of the same event
4. **Refresh After Save**: Reload to verify changes saved
5. **Try Again**: Re-submit if submission failed

### Seeing Old Data

**Symptoms:**
- Outdated participant list
- Old topic list
- Stale vote counts

**Solutions:**
1. **Hard Refresh**: Ctrl+Shift+R or Cmd+Shift+R
2. **Clear Cache**: Clear browser cache completely
3. **Check Timestamp**: Look for "last updated" timestamps
4. **Different Browser**: Test in a different browser
5. **Report Bug**: If persistent, report to organizer

---

## Getting Further Help

If none of these solutions work:

1. **Press `?`**: Open the in-app help panel
2. **Check FAQ**: Visit `/docs/faq` for more answers
3. **Read Docs**: Full documentation at `/docs`
4. **Contact Organizer**: Your event organizer can provide specific help
5. **Report Bug**: Use the feedback form to report technical issues

## Emergency Contacts

- **Event Organizer**: Contact information should be in event details
- **Platform Support**: support@unconf.example.com (replace with actual)
- **Technical Issues**: tech@unconf.example.com (replace with actual)

## System Requirements

**Minimum:**
- Modern browser (see supported browsers above)
- 1 Mbps internet connection
- JavaScript enabled
- Cookies enabled

**Recommended:**
- Latest browser version
- 5+ Mbps internet connection
- Desktop/laptop for organizer features
- Mobile for participant features

**Screen Sizes:**
- Mobile: 320px width minimum
- Tablet: 768px width optimal
- Desktop: 1024px width optimal

---

*Last updated: 2024*
*For the most current information, visit our [documentation](/docs)*
