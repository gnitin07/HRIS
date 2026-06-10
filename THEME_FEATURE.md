# Theme Toggle Feature

## Overview
The HRMS application now supports both **Dark** and **Light** themes. Users can toggle between themes, and their preference is automatically saved to browser localStorage.

## Features
- ✨ **Dark & Light Themes** - Complete theme support with carefully designed color palettes
- 💾 **Persistent Storage** - Theme preference saved to localStorage
- 🎨 **System Preference Detection** - Automatically detects system theme preference on first visit
- ⚡ **Smooth Transitions** - Smooth CSS transitions between themes
- ♿ **Accessible** - Includes proper ARIA labels and semantic HTML

## Components

### ThemeProvider Context
**Location:** `src/context/ThemeContext.jsx`

Wraps the entire application to provide theme state management. The provider:
- Manages theme state (dark/light)
- Persists theme preference to localStorage
- Detects system theme preference
- Provides `toggleTheme()` function

### useTheme Hook
**Location:** `src/hooks/useTheme.js`

Custom hook for accessing theme context in any component:
```jsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### ThemeToggle Component
**Location:** `src/components/common/ThemeToggle.jsx`

Ready-to-use button component that toggles between themes:
```jsx
import ThemeToggle from './components/common/ThemeToggle';

export default function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}
```

## CSS Variables

### Dark Theme (Default)
```css
--bg-dark: #0f172a
--bg-card: #1e293b
--bg-card-hover: #334155
--text-main: #f8fafc
--text-muted: #94a3b8
--border-color: #334155
```

### Light Theme
```css
--bg-dark: #f8fafc
--bg-card: #f1f5f9
--bg-card-hover: #e2e8f0
--text-main: #1e293b
--text-muted: #64748b
--border-color: #cbd5e1
```

## Usage Instructions

### 1. **For End Users**
- Look for the Sun/Moon icon button in the header/navigation
- Click to toggle between light and dark themes
- Preference is automatically saved

### 2. **For Developers**

#### Use the Theme Hook
```jsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { theme } = useTheme();
  
  if (theme === 'dark') {
    // Apply dark theme specific logic
  }
  
  return <div>My Component</div>;
}
```

#### Use CSS Variables
All CSS already uses CSS variables from the theme:
```css
.my-element {
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}
```

## How It Works

1. **Initialization**
   - App loads and ThemeProvider initializes
   - Checks localStorage for saved theme
   - Falls back to system preference detection
   - Defaults to 'dark' if no preference found

2. **Theme Toggle**
   - User clicks ThemeToggle button
   - `toggleTheme()` function switches between 'dark' and 'light'
   - Document gets `data-theme` attribute updated
   - Theme preference saved to localStorage

3. **CSS Application**
   - CSS variables automatically update based on `[data-theme]` selector
   - All elements using CSS variables instantly reflect the theme change
   - Smooth transitions applied for visual polish

## Integration Points

The theme feature is already integrated into:
- ✅ App.jsx (wrapped with ThemeProvider)
- ✅ index.css (CSS variables defined)
- ✅ All existing components (use CSS variables)

### Adding ThemeToggle to Your Components

Add this to any header/navbar/topbar component:

```jsx
import ThemeToggle from '../common/ThemeToggle';

export default function Header() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1>Dashboard</h1>
      <ThemeToggle />
    </header>
  );
}
```

## File Structure
```
src/
├── context/
│   └── ThemeContext.jsx          # Theme provider and context
├── hooks/
│   └── useTheme.js               # useTheme hook
├── components/common/
│   ├── ThemeToggle.jsx           # Toggle button component
│   └── ThemeToggle.css           # Toggle button styles
└── index.css                     # Theme CSS variables
```

## Browser Support
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses localStorage for persistence
- Supports prefers-color-scheme media query

## Notes
- Theme changes are applied instantly across the entire app
- The preference persists even after page refresh
- No additional dependencies required (uses React context API)
