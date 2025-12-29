# 🧪 Event Tools Lab

**Community-driven micro-tools for professional events.**

> Built entirely from community requests using AI-assisted development.

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-black)](https://vercel.com)
[![Community Driven](https://img.shields.io/badge/community-driven-blue)](../../issues/new?template=tool-request.yml)

---

## 🎯 What is this?

A collection of **simple, focused tools** for event organizers - built based on what the community actually needs.

**This project demonstrates:**
- AI-assisted development with proper guardrails
- Community-driven product development  
- Shipping simple, working tools quickly

**This project does NOT aim to:**
- ❌ Replace Sessionize, Eventbrite, or other established tools
- ❌ Build enterprise features before they're needed
- ❌ Perfect architecture before user validation

---

## 🛠️ Available Tools

Each tool is connected to an **Event** - create an event, invite participants, then use the tools.

| Tool | Description | Status |
|------|-------------|--------|
| 🎲 **Team Shuffler** | Randomly assign participants to groups | ✅ Live |
| ⏱️ **Session Timer** | Full-screen countdown for talks (shareable) | ✅ Live |
| 🗳️ **Quick Poll** | Live voting for participants | ✅ Live |
| 📱 **QR Check-In** | Scan to join events | 🚧 Coming |

---

## 🚀 Quick Start

### For Event Organizers

1. Go to the app → **Create Event**
2. Share the **event code** with participants
3. Enable the tools you need
4. Run your event!

### For Participants

1. Get the event code from your organizer
2. Go to the app → **Join Event**
3. Enter the code
4. Use the tools!

---

## 💡 Request a Tool

This project is built from community requests. Need something? Ask for it!

**[📬 Request a Tool](../../issues/new?template=tool-request.yml)**

### What makes a good request?
- ✅ Solves a real problem you have
- ✅ Doesn't exist as a free tool already
- ✅ Can fit on one screen
- ✅ Works without complex setup

### What we probably won't build:
- ❌ Features that duplicate free/cheap existing tools
- ❌ Complex enterprise features
- ❌ Things that require significant infrastructure

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
git clone https://github.com/dmgrok/unconf.git
cd unconf
npm install

# Install pre-commit hook (optional but recommended)
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

npm run dev
```

### Testing Before Commit

Run CI checks locally before committing:

```bash
npm run pre-commit:quick   # Fast - skips E2E tests (~30s)
npm run pre-commit         # Full - includes E2E tests (~2-3min)
```

See [Pre-Commit Testing Guide](docs/PRE_COMMIT_TESTING.md) for details.

### Project Structure

```
src/
├── lib/
│   ├── types/          # TypeScript types
│   ├── stores/         # Svelte stores
│   └── components/     # Shared UI components
│
└── routes/
    ├── +page.svelte              # Landing page
    ├── create/                   # Create event
    ├── join/                     # Join event
    └── events/[eventId]/
        ├── +page.svelte          # Event hub
        ├── manage/               # Organizer settings
        ├── participants/         # Participant list
        └── tools/
            ├── shuffler/         # Team Shuffler
            ├── timer/            # Session Timer
            └── poll/             # Quick Poll
```

---

## 📋 Architecture Principles

1. **Deploy first** - Every feature works in production before we add more
2. **One tool = one problem** - No feature creep
3. **Event-connected** - Tools share participant context
4. **Community-driven** - We build what you request

---

## 🤝 Contributing

1. **Request a tool** - [Open an issue](../../issues/new?template=tool-request.yml)
2. **Report bugs** - [Bug report](../../issues/new?template=bug-report.yml)
3. **Suggest improvements** - [Improvement request](../../issues/new?template=improvement.yml)
4. **Vote on requests** - 👍 issues you want

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [AGENTS.md](AGENTS.md) | AI agent instructions |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | UI/UX guidelines |
| [TESTING.md](TESTING.md) | Testing guide |
| [PRE_COMMIT_TESTING.md](docs/PRE_COMMIT_TESTING.md) | Local CI testing |

---

- How requests are evaluated
- What gets built and why
- When human review is needed

---

## 📜 License

MIT

---

*Built with SvelteKit • Deployed on Vercel • AI-assisted by Claude*
