# UI Component Library

This directory contains reusable, accessible UI components for the Joint design system.

## Components

### Button

A flexible button component with multiple variants and sizes.

**Features:**
- 3 variants: primary, secondary, ghost
- 3 sizes: sm (36px), md (44px), lg (48px)
- Icon support (start and end)
- Focus-visible states for accessibility
- 44x44 minimum touch target (md size)
- Disabled state handling

**Usage:**

```jsx
import { Button } from '../components/ui';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Get Started
</Button>

// Secondary with icon
<Button variant="secondary" startIcon={<Icon />}>
  Learn More
</Button>

// Ghost button
<Button variant="ghost" size="sm">
  Cancel
</Button>

// As a Link
<Button as={Link} to="/profile" variant="primary">
  View Profile
</Button>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' | 'primary' | Button visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size (affects padding and min-height) |
| startIcon | ReactNode | - | Icon displayed before text |
| endIcon | ReactNode | - | Icon displayed after text |
| disabled | boolean | false | Disable button interactions |
| as | Component | 'button' | Render as different component (e.g., Link) |
| className | string | '' | Additional CSS classes |

### Card

A container component using design system surface tokens for proper depth hierarchy.

**Features:**
- Surface tokens for light mode polish
- Optional title and actions
- Configurable padding (none, sm, default, lg)
- Optional hover effects
- Consistent border and shadow
- Semantic HTML support (as prop)

**Usage:**

```jsx
import { Card } from '../components/ui';

// Simple card
<Card>
  Content goes here
</Card>

// Card with title and actions
<Card 
  title="Profile Stats" 
  actions={<Button variant="ghost" size="sm">View All</Button>}
>
  <Stats />
</Card>

// Card with hover effect
<Card hover padding="lg">
  Interactive content
</Card>

// As a different element
<Card as="section" padding="default">
  Semantic section content
</Card>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | - | Optional card title |
| actions | ReactNode | - | Optional actions displayed in header |
| padding | 'none' \| 'sm' \| 'default' \| 'lg' | 'default' | Internal padding |
| hover | boolean | false | Enable hover shadow effect |
| as | Component | 'div' | Render as different HTML element |
| className | string | '' | Additional CSS classes |

## Design Tokens

Components use the following design tokens:

- `bg-surface-2` - Card backgrounds (light mode: #ffffff, dark mode: rgba(23, 23, 23, 0.40))
- `border-subtle` - Subtle borders (uses CSS variable)
- `shadow-sm`, `shadow-md`, `shadow-lg` - Shadow depth tokens
- `focus-visible:ring-brand` - Consistent focus states
- Brand gradient: `from-[#474747] to-[#0CCE6B]`

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:

- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Touch Targets**: Minimum 44x44px touch targets on interactive elements
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Focus-visible states for keyboard users
- **Color Contrast**: Meets contrast requirements in both light and dark modes

## Testing

Components include comprehensive test coverage:

```bash
# Run component tests
npm run test:run -- src/components/ui

# Run with coverage
npm run test:coverage -- src/components/ui
```

## Future Enhancements

- Input component (text, textarea, select)
- Modal/Dialog component
- Badge/Tag component
- Tooltip component
- Dropdown/Menu component
- Toast notification component (beyond react-hot-toast)
- Storybook integration for visual documentation
