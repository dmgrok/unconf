# Icon Design System

## Overview

This app uses **Lucide Svelte** icons exclusively for all UI elements. Lucide provides clean, consistent outline-style icons that match the Heroicons aesthetic.

## Installation

```bash
npm install lucide-svelte
```

Already installed: `lucide-svelte@^0.544.0`

## Usage Guidelines

### 1. Import Icons Directly

```svelte
<script lang="ts">
  import { Search, Settings, Users, AlertCircle } from 'lucide-svelte';
</script>

<Search size={20} />
<Settings size={24} strokeWidth={2} />
```

### 2. Use the Icon Component Wrapper

For consistent sizing and theming:

```svelte
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
</script>

<Icon name="search" size={20} />
<Icon name="settings" size={24} />
```

## Icon Replacement Guide

Replace emoji icons with their Lucide equivalents:

### Common Replacements

| Emoji | Lucide Icon | Import |
|-------|-------------|--------|
| 📊 | `BarChart3` | `import { BarChart3 } from 'lucide-svelte'` |
| 🟢 | `Circle` (with green color) | `import { Circle } from 'lucide-svelte'` |
| 📝 | `FileText` or `PenLine` | `import { FileText } from 'lucide-svelte'` |
| ✓ | `Check` or `CheckCircle` | `import { Check } from 'lucide-svelte'` |
| 🔍 | `Search` | `import { Search } from 'lucide-svelte'` |
| ⚠️ | `AlertTriangle` or `AlertCircle` | `import { AlertTriangle } from 'lucide-svelte'` |
| 🔐 | `Lock` or `Shield` | `import { Lock } from 'lucide-svelte'` |
| 🎉 | `Party` or `Sparkles` | `import { Sparkles } from 'lucide-svelte'` |
| 🚀 | `Rocket` | `import { Rocket } from 'lucide-svelte'` |
| 🗳️ | `Vote` or `CheckSquare` | `import { Vote } from 'lucide-svelte'` |
| 🎯 | `Target` | `import { Target } from 'lucide-svelte'` |
| ⚙️ | `Settings` or `Cog` | `import { Settings } from 'lucide-svelte'` |
| 🔧 | `Wrench` or `Tool` | `import { Wrench } from 'lucide-svelte'` |
| 🔒 | `Lock` | `import { Lock } from 'lucide-svelte'` |
| ⌨️ | `Keyboard` | `import { Keyboard } from 'lucide-svelte'` |
| ⏰ | `Clock` or `AlarmClock` | `import { Clock } from 'lucide-svelte'` |
| 😴 | `Moon` or `CloudOff` | `import { Moon } from 'lucide-svelte'` |
| 🔌 | `Plug` | `import { Plug } from 'lucide-svelte'` |
| ⚡ | `Zap` | `import { Zap } from 'lucide-svelte'` |
| 📱 | `Smartphone` | `import { Smartphone } from 'lucide-svelte'` |
| 👥 | `Users` | `import { Users } from 'lucide-svelte'` |
| 💬 | `MessageSquare` | `import { MessageSquare } from 'lucide-svelte'` |
| 🎮 | `Gamepad2` | `import { Gamepad2 } from 'lucide-svelte'` |
| 👨‍💼 | `UserCircle` or `User` | `import { UserCircle } from 'lucide-svelte'` |
| 🌐 | `Globe` | `import { Globe } from 'lucide-svelte'` |
| 🛠️ | `Wrench` | `import { Wrench } from 'lucide-svelte'` |
| 💼 | `Briefcase` | `import { Briefcase } from 'lucide-svelte'` |

## Sizing Standards

- **Small icons**: 16px (buttons, inline text)
- **Medium icons**: 20-24px (list items, cards)
- **Large icons**: 32-48px (hero sections, empty states)
- **Extra large**: 64px+ (modals, error states)

## Styling Best Practices

### Color

Icons inherit the text color by default:

```svelte
<div style="color: #ef4444">
  <AlertTriangle size={24} />
</div>
```

### Stroke Width

Default is `2`. Adjust for visual hierarchy:

```svelte
<Search size={20} strokeWidth={1.5} /> <!-- Lighter -->
<Settings size={20} strokeWidth={2.5} /> <!-- Heavier -->
```

### Accessibility

Always provide context:

```svelte
<button aria-label="Search events">
  <Search size={20} />
</button>

<!-- Or with visible text -->
<button>
  <Search size={20} />
  <span>Search</span>
</button>
```

## Component Examples

### Stat Cards

```svelte
<script lang="ts">
  import { BarChart3, Circle, FileText, CheckCircle } from 'lucide-svelte';
</script>

<div class="stat-card">
  <div class="stat-icon">
    <BarChart3 size={24} />
  </div>
  <div class="stat-value">42</div>
  <div class="stat-label">Total Events</div>
</div>
```

### Status Indicators

```svelte
<script lang="ts">
  import { Circle, CheckCircle, AlertCircle } from 'lucide-svelte';
</script>

<!-- Active status -->
<div class="status">
  <Circle size={16} fill="currentColor" style="color: #22c55e" />
  <span>Active</span>
</div>

<!-- Completed -->
<div class="status">
  <CheckCircle size={16} style="color: #22c55e" />
  <span>Completed</span>
</div>

<!-- Warning -->
<div class="status">
  <AlertCircle size={16} style="color: #f59e0b" />
  <span>Warning</span>
</div>
```

### Search Input

```svelte
<script lang="ts">
  import { Search } from 'lucide-svelte';
</script>

<div class="search-container">
  <Search size={20} class="search-icon" />
  <input type="text" placeholder="Search..." />
</div>

<style>
  .search-container {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
  }
  
  input {
    padding-left: 40px;
  }
</style>
```

## Available Icons

Browse all icons at: https://lucide.dev/icons/

### Categories

- **Arrows & Navigation**: `ArrowRight`, `ChevronDown`, `CornerDownRight`
- **Communication**: `MessageSquare`, `Mail`, `Phone`, `Send`
- **Data & Analytics**: `BarChart3`, `PieChart`, `TrendingUp`
- **Files**: `File`, `FileText`, `Folder`, `Download`
- **Gaming**: `Gamepad2`, `Trophy`, `Target`, `Dices`
- **Media**: `Play`, `Pause`, `Volume2`, `Music`
- **Status**: `Check`, `X`, `AlertTriangle`, `AlertCircle`, `Info`
- **UI Elements**: `Search`, `Filter`, `Settings`, `Menu`
- **Users**: `User`, `Users`, `UserPlus`, `UserCircle`

## Migration Checklist

- [x] Install `lucide-svelte`
- [x] Create `Icon.svelte` wrapper component
- [ ] Replace emoji icons in all Svelte components
- [ ] Update documentation examples
- [ ] Add icon usage guidelines
- [ ] Update design system documentation

## Related Files

- `/src/lib/components/ui/Icon.svelte` - Icon wrapper component
- `/package.json` - Dependencies
- All `.svelte` files - Replace emoji icons with Lucide icons
