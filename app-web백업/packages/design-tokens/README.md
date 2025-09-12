# Design Tokens

This package contains design tokens for the Entrip design system.

## Build

```bash
pnpm build
```

## Token Structure

### Spacing Tokens
The spacing tokens are exported as unitless values. When using in CSS, multiply by 1px:

```css
/* Example: spacing-dot = 20 */
background-size: calc(var(--spacing-dot)*1px) calc(var(--spacing-dot)*1px);
```

### Color Tokens
Colors are exported as hex values with CSS custom properties.

## Files Generated

- `build/variables.css` - CSS custom properties
- `build/tailwind.js` - Tailwind configuration
- `build/tokens.ts` - TypeScript definitions