# UnConf Platform

A modern unconference management platform built with SvelteKit, featuring real-time collaboration, weighted voting, and interactive activities.

## Quick Start

Once you've installed dependencies with `npm install`, you can get started quickly with demo data:

```sh
# Create demo data (recommended for first time setup)
npm run demo:create

# Start the development server
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Demo System

The platform includes a comprehensive demo system that automatically creates sample data for testing and development:

### Demo Event Details
- **Event Name**: Tech Innovation Unconference 2024
- **Access Code**: `DEMO2024`
- **Features**: Sample topics, users, votes, and realistic data

### Development Features
- **Developer Banner**: In development mode, a banner displays at the top of the page showing:
  - Event access code for easy connection
  - Quick join links
  - QR code for mobile testing
  - Event details and status
- **Sample Data**: Realistic unconference data including:
  - Sample participants (organizer, participant, guest)
  - 5 discussion topics with descriptions and tags
  - Sample votes demonstrating the weighted voting system
  - All data stored in JSON files in the `/data` folder

### Demo Commands
```sh
# Create fresh demo data (simple version)
npm run demo:create

# Create demo data using repositories (requires built app)
npm run demo:init

# Update demo data for specific features
npm run demo:voting     # Update voting system demo data
npm run demo:games      # Update group intelligence demo data
npm run demo:rooms      # Update discussion groups demo data
npm run demo:teams      # Update team distribution demo data
npm run demo:analytics  # Update analytics demo data

# View updated task specifications
npm run demo:specs
```

## Feature Development Workflow

When implementing features, follow this workflow to ensure proper demo event integration:

1. **Implement Feature**: Build the feature according to task specifications
2. **Update Demo Data**: Run the appropriate demo updater (e.g., `npm run demo:voting`)
3. **Test with Demo Event**: Use access code `DEMO2024` to test in development
4. **Verify Integration**: Ensure feature works with existing demo data

See [TASK_COMPLETION_GUIDE.md](./TASK_COMPLETION_GUIDE.md) for detailed instructions.

## Developing

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
