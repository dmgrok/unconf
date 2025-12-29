# Event Tools Lab - Design System

> Design documentation for the AI-built event tools platform.

---

## 🎨 Brand Identity

### Philosophy
This platform exists to **let event organizers focus on what matters** — connecting people. The tools handle the technical overhead so organizers can be present with their audience.

### The Experiment
This entire application is built by **agentic AI** (Claude) with zero human-written code. Every feature, every fix, every line of code is generated in response to real user requests. We're exploring the boundaries of AI-assisted development.

---

## 🌙 Color Palette

### Dark Theme (Primary)

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Background | Deep Black | `#0a0a0f` | Main background |
| Surface | Dark Gray | `#0f0f18` | Cards, elevated surfaces |
| Border | Subtle Gray | `rgba(255,255,255,0.08)` | Dividers, card borders |
| Text Primary | Off White | `#e4e4e7` | Headings, important text |
| Text Secondary | Muted Gray | `#a1a1aa` | Body text, descriptions |
| Text Tertiary | Dark Gray | `#71717a` | Labels, hints |

### Accent Colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Indigo | `#6366f1` | CTAs, links, interactive elements |
| Primary Light | Light Indigo | `#a5b4fc` | Highlights, badges |
| Secondary | Purple | `#a855f7` | Gradients, special elements |
| Success | Green | `#22c55e` | Status indicators, confirmations |

### Gradients

```css
/* Primary CTA Gradient */
background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);

/* Secondary/Request Gradient */
background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);

/* Hero Glow Effect */
background: radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%);

/* Experiment Card */
background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
```

---

## 📐 Typography

### Font Stack

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Monospace (for stats, codes) */
font-family: 'JetBrains Mono', monospace;
```

### Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero H1 | `clamp(2.5rem, 6vw, 4rem)` | 700 | 1.1 |
| Section H2 | `2rem` | 700 | 1.2 |
| Card H3 | `1rem - 1.1rem` | 600 | 1.3 |
| Body | `1rem` | 400 | 1.6 |
| Small | `0.85rem - 0.9rem` | 400 | 1.5 |
| Tiny | `0.7rem - 0.8rem` | 500-600 | 1.4 |

---

## 🧩 Components

### Buttons

#### Primary CTA
```css
.btn-hero.primary {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
}

.btn-hero.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}
```

#### Secondary/Ghost Button
```css
.btn-secondary {
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}
```

### Cards

#### Tool Card
- Horizontal layout with icon, content, and action indicator
- Subtle border: `1px solid rgba(255,255,255,0.08)`
- Border radius: `14px`
- Hover: Slide right (`translateX(4px)`) + indigo border glow

#### Feature/Experiment Card
- Gradient background: indigo/purple at 10% opacity
- Visible border: `1px solid rgba(99, 102, 241, 0.2)`
- Border radius: `20px`
- Internal sections with darker backgrounds

### Form Inputs

```css
input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
}

input:focus {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

input::placeholder {
  color: #71717a;
}
```

---

## 📱 Layout

### Container Widths

| Context | Max Width |
|---------|-----------|
| Hero | Full width (content centered) |
| Content sections | `800px - 900px` |
| Narrow content | `600px` |

### Spacing Scale

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 5rem;     /* 80px - section padding */
```

### Section Padding
- Vertical: `5rem` (80px)
- Horizontal: `1.5rem` (24px)
- Mobile vertical: `3rem` (48px)

---

## ✨ Animations

### Transitions
```css
/* Default for interactive elements */
transition: all 0.2s ease;
```

### Hover Effects

| Element | Effect |
|---------|--------|
| Primary buttons | `translateY(-2px)` + stronger shadow |
| Tool cards | `translateX(4px)` + border color change |
| Request button | `translateY(-2px)` + stronger shadow |

### Pulse Animation (Status Indicator)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
```

---

## 📄 Page Structure

### Homepage Sections

1. **Hero** - Value prop, main CTA, join form
2. **The Experiment** - AI-built explanation, stats
3. **Tools** - Grid of available tools
4. **How It Works** - 3-step flow
5. **Request** - CTA to request new tools
6. **Footer** - Links, attribution

### Navigation
- Minimal header with tools anchor link
- No complex navigation — single-page feel
- Footer links for secondary navigation

---

## 📏 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Stack layouts vertically */
  /* Reduce section padding */
  /* Full-width cards */
}
```

### Mobile Adaptations
- Hero heading: `2rem`
- Stats grid: single column
- Steps: vertical with connectors rotated
- Tool cards: full width
- Join form: stacked vertically

---

## 🎯 Design Principles

1. **Clarity over cleverness** - Every element has a clear purpose
2. **Dark & focused** - Reduce visual noise, highlight what matters
3. **Subtle animations** - Motion guides attention, never distracts
4. **Mobile-first** - Works beautifully on any device
5. **Accessible** - Sufficient contrast, clear hierarchy

---

## 🔗 Quick Reference

### Key Colors
- Primary: `#6366f1`
- Background: `#0a0a0f`
- Text: `#e4e4e7`

### Key Sizes
- Border radius (buttons): `12px`
- Border radius (cards): `14px`
- Border radius (large cards): `20px`

### Key Shadows
- Primary button: `0 4px 20px rgba(99, 102, 241, 0.4)`
- Primary hover: `0 8px 30px rgba(99, 102, 241, 0.5)`

---

*This design system is maintained by AI and evolves with user feedback.*
