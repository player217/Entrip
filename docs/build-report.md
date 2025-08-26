# Build & Lint Error Report

**Generated**: 2025-01-08  
**Total Errors**: 18 (17 TypeScript, 1 ESLint)  
**Status**: 🔴 Errors Present

## Summary

| Package | TypeScript Errors | ESLint Errors | Total |
|---------|------------------|---------------|-------|
| @entrip/api | 0 | 1 | 1 |
| @entrip/ui | 17 | 0 | 17 |
| @entrip/web | 0 | 0 | 0 |
| @entrip/shared | 0 | 0 | 0 |
| @entrip/design-tokens | 0 | 0 | 0 |

## ESLint Errors

### @entrip/api (1 error)

1. **@typescript-eslint/no-explicit-any**
   - File: `packages/api/src/middlewares/validation.middleware.ts`
   - Line: 36:36
   - Error: Unexpected any. Specify a different type
   - Fix: Replace `any` with specific type

## TypeScript Errors

### @entrip/ui (17 errors)

#### Module Resolution Errors (3)

1. **Cannot find module '../types'**
   - File: `../shared/src/stores/modalStore.ts`
   - Line: 2:30
   - Fix: Update import path or create missing types file

2. **Cannot find module '@hookform/resolvers/zod'**
   - Files: 
     - `compounds/QuickAddBookingModal.backup/QuickAddForm.tsx:5:29`
     - `compounds/QuickBookingModal/BookingForm.tsx:5:29`
   - Fix: Install missing dependency: `pnpm add @hookform/resolvers zod`

#### Type Definition Errors (7)

3. **Unused '@ts-expect-error' directive**
   - File: `__tests__/DataGrid.test.tsx`
   - Line: 63:5
   - Fix: Remove unnecessary directive

4. **Property 'message' does not exist on type 'FieldError'**
   - Files:
     - `compounds/QuickBookingModal/BookingForm.tsx:433:66`
     - `compounds/QuickBookingModal/BookingForm.tsx:673:69`
   - Fix: Check if error is FieldError type before accessing message

5. **Module has already exported 'SelectOption'**
   - File: `compounds/QuickBookingModal/fields/index.ts`
   - Line: 16:1
   - Fix: Remove duplicate export or use explicit re-export

6. **Cannot find name 'QuickBookingFormData'**
   - File: `compounds/QuickBookingModal/types.ts`
   - Line: 7:20
   - Fix: Define QuickBookingFormData type

7. **Property 'checkValidity' does not exist on type 'HTMLElement'**
   - File: `compounds/__tests__/NewTeamModal.test.tsx`
   - Line: 225:28
   - Fix: Cast to HTMLFormElement or use type guard

#### Test Type Mismatches (7)

8. **Type 'Date' is not assignable to type 'string'**
   - File: `compounds/__tests__/BookingItem.test.tsx`
   - Line: 10:5
   - Fix: Convert Date to string or update type

9. **Type '"FLIGHT"' is not assignable to expected enum type**
   - File: `compounds/__tests__/BookingItem.test.tsx`
   - Lines: 13:5, 14:5
   - Fix: Use correct enum values

10. **ChartData type mismatch**
    - File: `compounds/__tests__/ChartCard.test.tsx`
    - Lines: 13:51, 115:43, 131:43
    - Fix: Add missing 'value' or 'name' properties

11. **DataGrid props type errors**
    - File: `compounds/__tests__/DataGrid.test.tsx`
    - Lines: 166:54, 172:54
    - Fix: Remove 'loading' and 'error' props or update interface

12. **ColumnDef type incompatibility**
    - File: `compounds/__tests__/DataGrid.test.tsx`
    - Line: 300:22
    - Fix: Update cell function signature to match TanStack Table types

## Priority Fix Order

### P0 - Blocking Issues (Must fix first)
1. Install missing dependencies
   ```bash
   pnpm add @hookform/resolvers zod --filter @entrip/ui
   ```

2. Fix module import paths
   - Update modalStore.ts import path
   - Define QuickBookingFormData type

### P1 - Type Errors
3. Fix FieldError message access
4. Remove duplicate SelectOption export
5. Fix ESLint any type in validation.middleware.ts

### P2 - Test Updates
6. Update all test files with correct types
7. Remove unused @ts-expect-error directives
8. Fix HTMLElement type assertions

## Commands to Verify

```bash
# After fixes, run:
pnpm build
pnpm lint
pnpm type-check
```

## Next Steps

1. Install missing dependencies
2. Fix import paths and type definitions
3. Update test files
4. Run verification commands
5. Commit fixes with message: "fix: resolve all TypeScript and ESLint errors"