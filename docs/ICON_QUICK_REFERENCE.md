# Quick Icon Reference

## Import Icons

```svelte
<script lang="ts">
  // Import specific icons you need
  import { Search, Settings, Users, AlertTriangle } from 'lucide-svelte';
</script>
```

## Common Icons

### Status & Feedback
- `Check` / `CheckCircle` - Success, completed, verified ✓
- `X` / `XCircle` - Close, error, cancel ✕
- `AlertTriangle` - Warning, error, attention ⚠️
- `AlertCircle` - Information, alert ⓘ
- `Info` - Information, help
- `HelpCircle` - Help, question

### UI Elements
- `Search` - Search functionality 🔍
- `Settings` / `Cog` - Settings, configuration ⚙️
- `Menu` / `MoreHorizontal` - Menu, options
- `ChevronDown` / `ChevronUp` - Expand/collapse
- `Plus` - Add, create
- `Minus` - Remove, minimize

### Users & People
- `User` - Single user, profile
- `Users` - Multiple users, groups 👥
- `UserCircle` - User profile 👨‍💼
- `UserPlus` - Add user
- `Crown` - Admin, organizer

### Communication
- `MessageSquare` - Messages, chat 💬
- `Mail` - Email
- `Send` - Send message
- `Bell` - Notifications

### Data & Analytics
- `BarChart3` - Statistics, analytics 📊
- `PieChart` - Distribution
- `TrendingUp` - Growth, increase
- `Activity` - Activity tracking

### Actions
- `Vote` - Voting, polls 🗳️
- `Heart` - Like, favorite
- `ThumbsUp` - Approve, like
- `Star` - Star, favorite
- `Bookmark` - Bookmark, save

### Gaming & Activities
- `Gamepad2` - Games, gaming 🎮
- `Target` - Goals, objectives 🎯
- `Trophy` - Achievement, winner

### Time
- `Clock` - Time, timer ⏰
- `Calendar` - Date, schedule
- `Timer` - Countdown, stopwatch

### Security
- `Lock` - Locked, secure 🔐
- `Unlock` - Unlocked
- `Shield` - Protection, security
- `Key` - Access, authentication

### Files & Documents
- `File` - Generic file
- `FileText` - Text document 📝
- `Folder` - Folder, directory
- `Download` - Download
- `Upload` - Upload

### Connection
- `Wifi` - Connected
- `WifiOff` - Disconnected
- `Plug` - Connection 🔌
- `Zap` - Fast, power ⚡

### Devices
- `Smartphone` - Mobile device 📱
- `Monitor` - Desktop
- `Laptop` - Laptop

### Miscellaneous
- `Sparkles` - New, special 🎉
- `Rocket` - Launch, fast 🚀
- `Moon` - Night mode, sleep 😴
- `Sun` - Light mode, day
- `Wrench` - Tools, fix 🔧
- `Keyboard` - Keyboard shortcuts ⌨️

## Usage Patterns

### In Buttons
```svelte
<button>
  <Search size={20} />
  <span>Search</span>
</button>
```

### Status Indicators
```svelte
<div class="status">
  <Circle size={16} fill="currentColor" style="color: #22c55e" />
  <span>Active</span>
</div>
```

### Icon with Text
```svelte
<div class="feature">
  <Vote size={24} />
  <h3>Weighted Voting</h3>
</div>
```

### Conditional Icons
```svelte
{#if isSuccess}
  <CheckCircle size={20} style="color: #22c55e" />
{:else}
  <XCircle size={20} style="color: #ef4444" />
{/if}
```

### Dynamic Size
```svelte
<Settings size={isMobile ? 20 : 24} />
```

## Sizing Guidelines

- **16px** - Small inline icons
- **20px** - Default button icons
- **24px** - Card headers, list items
- **32px** - Section headers, feature cards
- **48px** - Large headers, modals
- **64px** - Hero sections, empty states

## Color & Style

```svelte
<!-- Inherit color from parent -->
<Search size={20} />

<!-- Custom color -->
<AlertTriangle size={20} color="#f59e0b" />

<!-- Custom stroke width -->
<Settings size={24} strokeWidth={2.5} />

<!-- Fill icon -->
<Circle size={16} fill="currentColor" />
```

## Browser All Icons

Visit: https://lucide.dev/icons/

## Need Help?

See full documentation: `/docs/ICON_DESIGN_SYSTEM.md`
