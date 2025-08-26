# Technical Details

## Architecture Overview

### Monorepo Structure
```
entrip/
├── apps/
│   ├── web/          # Next.js 14 App Router
│   ├── api/          # Express + Prisma API
│   └── e2e/          # Playwright E2E tests
├── packages/
│   ├── ui/           # React component library
│   ├── shared/       # Shared utilities, types, hooks
│   └── design-tokens/# Design system tokens
└── infrastructure/   # CI/CD, deployment configs
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript 5
- **Backend**: Express, Prisma, PostgreSQL
- **Styling**: Tailwind CSS, CSS Variables
- **State Management**: Zustand, React Hook Form
- **Testing**: Jest, Testing Library, Playwright
- **Build Tools**: Turbo, pnpm, Vite

## Testing & Quality

### Jest Configuration
```javascript
// Root jest.config.js handles all packages
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  coverageThreshold: {
    global: { branches: 40, functions: 40, lines: 40, statements: 40 }
  }
};
```

### Testing Strategy
1. **Unit Tests**: Component logic, hooks, utilities
2. **Integration Tests**: API endpoints, data flows
3. **E2E Tests**: Critical user journeys
4. **Visual Tests**: Storybook + Chromatic

### Quality Gates
```yaml
# .github/workflows/quality.yml
- Codecov: Coverage ≥ 40%
- SonarCloud: 0 bugs, A rating
- Danger JS: PR size, test coverage
- ESLint: 0 errors, 0 warnings
```

## CI/CD Pipeline

### GitHub Actions Optimization
```yaml
jobs:
  install-and-build:  # Cached dependencies
  lint:              # 1 CPU, 2GB memory
  type-check:        # Parallel with lint
  test:              # 3 shards for speed
  build-storybook:   # Visual regression
  quality-gate:      # Final checks
  deploy:            # Only on main
```

### Performance Metrics
- Build time: ~8 minutes
- Test execution: ~3 minutes (with sharding)
- Total CI time: ~12 minutes

## TypeScript Configuration

### Project References
```json
// tsconfig.base.json
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/ui" },
    { "path": "./packages/design-tokens" },
    { "path": "./apps/web" },
    { "path": "./apps/api" }
  ]
}
```

### Path Aliases
```json
{
  "paths": {
    "@entrip/ui": ["packages/ui/src"],
    "@entrip/shared": ["packages/shared/src"],
    "@entrip/design-tokens": ["packages/design-tokens/dist"]
  }
}
```

## API Architecture

### Error Handling
```typescript
// Centralized error handler
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || '서버 오류가 발생했습니다';
  
  logger.error({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });
  
  res.status(status).json({ error: message });
};
```

### Authentication Flow
1. Login → JWT token generation
2. Token stored in httpOnly cookie
3. Middleware validates on each request
4. Auto-redirect to login on 401

## State Management

### Zustand Store Pattern
```typescript
interface StoreState {
  // State
  items: Item[];
  
  // Actions
  addItem: (item: Item) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  
  // Computed
  get activeItems(): Item[];
}
```

### SWR Data Fetching
```typescript
const { data, error, mutate } = useSWR(
  '/api/bookings',
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 5000
  }
);
```

## Component Architecture

### Primitive → Compound Pattern
```
primitives/
├── Button.tsx      # Base components
├── Input.tsx
└── Card.tsx

compounds/
├── BookingItem.tsx # Business components
├── DataGrid.tsx
└── CommandBar.tsx
```

### Styling System
- Design tokens for consistency
- Tailwind utilities for rapid development
- CSS variables for theming
- Dark mode ready (partial implementation)

## Performance Optimizations

### Build Optimizations
- Turbo caching for incremental builds
- pnpm for efficient dependency management
- Tree shaking with ES modules
- Code splitting with dynamic imports

### Runtime Optimizations
- React.memo for expensive components
- useMemo/useCallback for computed values
- Virtual scrolling for large lists
- Image optimization with Next.js Image

## Security Measures

### API Security
- JWT with secure httpOnly cookies
- Rate limiting on auth endpoints
- CORS configuration
- Input validation with Zod
- SQL injection prevention with Prisma

### Frontend Security
- CSP headers
- XSS prevention
- Secure cookie handling
- Environment variable validation

## Deployment

### Environment Requirements
- Node.js 18+
- PostgreSQL 14+
- pnpm 8+

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] CDN configured for static assets
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented