# Task Completion Guide

This guide outlines the steps to follow when completing features to ensure demo event integration and proper testing.

## When You Complete a Feature

### 1. Update Demo Data
After implementing any feature, run the corresponding demo data updater to ensure the DEMO2024 event showcases your new functionality:

```bash
# Weighted Voting System (Task 9)
npm run demo:voting

# Group Intelligence/Word-Chain Game (Task 11)
npm run demo:games

# Discussion Group Assignment (Task 12)
npm run demo:rooms

# Team Distribution Service (Task 13)
npm run demo:teams

# Activity State Management (Task 10)
node demo-features.mjs realTimeUpdates

# Analytics and Reporting (Task 20)
npm run demo:analytics
```

### 2. Test with Demo Event
Always test your implemented features using the DEMO2024 event:

1. **Start Development Server**: `npm run dev`
2. **Access Demo Event**: Use access code `DEMO2024` (displayed in developer banner)
3. **Test Feature Functionality**: Verify all implemented features work correctly
4. **Check Data Persistence**: Ensure changes are saved to JSON files in `/data` folder

### 3. Verify Demo Integration
Before marking a task as complete, ensure:

- [ ] Feature works correctly with DEMO2024 event data
- [ ] Demo data has been updated to showcase the feature
- [ ] Developer banner shows relevant information for testing
- [ ] All edge cases are represented in demo data
- [ ] Feature can be tested by other developers using demo event

## Feature-Specific Requirements

### Voting System Features
- **Test Requirements**: All voting weights (1st, 2nd, 3rd choice), validation rules, real-time updates
- **Demo Data**: Diverse voting patterns, tie scenarios, edge cases
- **Update Command**: `npm run demo:voting`

### Group Intelligence Features
- **Test Requirements**: Word-chain game mechanics, multiplayer functionality, validation
- **Demo Data**: Completed game sessions, word chains, conflict resolution examples
- **Update Command**: `npm run demo:games`

### Discussion Group Features
- **Test Requirements**: Assignment algorithms, room management, participant notifications
- **Demo Data**: Room configurations, assignment results, capacity management
- **Update Command**: `npm run demo:rooms`

### Team Distribution Features
- **Test Requirements**: Distribution strategies, manual overrides, late joiner handling
- **Demo Data**: Team configurations, participant rosters, strategy demonstrations
- **Update Command**: `npm run demo:teams`

### Real-time Features
- **Test Requirements**: Activity switching, WebSocket connections, acknowledgments
- **Demo Data**: Activity logs, latency metrics, connection tracking
- **Update Command**: `node demo-features.mjs realTimeUpdates`

### Analytics Features
- **Test Requirements**: Report generation, data export, metric calculations
- **Demo Data**: Participation metrics, engagement data, exportable reports
- **Update Command**: `npm run demo:analytics`

## Quick Reference Commands

```bash
# View all task specifications with demo requirements
npm run demo:specs

# Create fresh demo data
npm run demo:create

# Update specific feature demo data
npm run demo:voting    # Voting system
npm run demo:games     # Group intelligence
npm run demo:rooms     # Discussion groups
npm run demo:teams     # Team distribution
npm run demo:analytics # Analytics

# Start development with demo event
npm run demo:create && npm run dev
```

## Demo Event Details

- **Event Name**: Tech Innovation Unconference 2024
- **Access Code**: `DEMO2024`
- **Event ID**: Dynamically generated (check developer banner)
- **Data Location**: `/data` folder (JSON files)
- **Participants**: Organizer (Sarah Chen), Participant (Alex Rodriguez), Guest (Demo Guest)

## Best Practices

1. **Always Test First**: Use demo event for initial testing before creating additional test data
2. **Update Demo Data**: Keep demo data current with implemented features
3. **Document Changes**: Note any special demo data requirements in task completion
4. **Verify Integration**: Ensure features work seamlessly with existing demo data
5. **Test Edge Cases**: Include error scenarios and boundary conditions in demo data

## Troubleshooting

### Demo Data Issues
- **Missing Demo Event**: Run `npm run demo:create` to recreate base demo data
- **Corrupted Data**: Check JSON syntax in `/data` folder files
- **Permission Issues**: Ensure write access to `/data` directory

### Feature Testing Issues
- **Demo Event Not Loading**: Check developer banner for current event status
- **Data Not Persisting**: Verify repository configuration uses correct data directory
- **WebSocket Issues**: Check real-time connection status in developer tools

## Integration with CI/CD

For automated testing, include demo data validation in your test suite:

```bash
# Example test pipeline step
npm run demo:create
npm run build
npm run test
```

This ensures all features work correctly with the demo event data and maintains consistency across development environments.