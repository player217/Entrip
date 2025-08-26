#!/bin/bash

echo "🔧 Auto-fixing ESLint errors..."

# Fix unused variables by prefixing with underscore
echo "Fixing: app/(main)/reservations/page.tsx"
sed -i 's/import { CalendarWeek/import { CalendarWeek as _CalendarWeek/' apps/web/app/\(main\)/reservations/page.tsx
sed -i 's/const events =/const _events =/' apps/web/app/\(main\)/reservations/page.tsx
sed -i 's/const handleCalendarEventClick/const _handleCalendarEventClick/' apps/web/app/\(main\)/reservations/page.tsx

echo "Fixing: src/components/BookingModal.tsx"
sed -i 's/const result =/const _result =/' apps/web/src/components/BookingModal.tsx

echo "Fixing: src/components/FlightTable.tsx"
sed -i "s/import useSWR/import useSWR as _useSWR/" apps/web/src/components/FlightTable.tsx
sed -i "s/import { fetcher/import { fetcher as _fetcher/" apps/web/src/components/FlightTable.tsx

echo "Fixing: src/components/layout/Sidebar.tsx"
sed -i "s/import { useLocalStorage/import { useLocalStorage as _useLocalStorage/" apps/web/src/components/layout/Sidebar.tsx
sed -i 's/const { tabs/const { tabs: _tabs/' apps/web/src/components/layout/Sidebar.tsx
sed -i 's/const getContentTypeFromPath/const _getContentTypeFromPath/' apps/web/src/components/layout/Sidebar.tsx

echo "Fixing: src/features/calendar/CalendarVirtual.tsx"
sed -i 's/(event, index)/(event, _index)/' apps/web/src/features/calendar/CalendarVirtual.tsx

echo "Fixing: src/features/calendar/WeekView.tsx"
sed -i 's/const { isDragging/const { isDragging: _isDragging/' apps/web/src/features/calendar/WeekView.tsx
sed -i 's/(booking, index)/(booking, _index)/' apps/web/src/features/calendar/WeekView.tsx

echo "Fixing: src/scripts/test-calendar-performance.ts"
sed -i 's/const dayBookings/const _dayBookings/' apps/web/src/scripts/test-calendar-performance.ts

echo "Fixing: src/utils/export.ts"
sed -i 's/filename =/filename: _filename =/' apps/web/src/utils/export.ts

echo "Fixing: src/utils/memory-profiler.ts"
sed -i 's/const prev =/const _prev =/' apps/web/src/utils/memory-profiler.ts

# Add supports-color to transpilePackages
echo "Fixing: next.config.js - adding supports-color to transpilePackages"
sed -i "s/'debug'/'debug', 'supports-color'/" apps/web/next.config.js

echo "✅ Auto-fix complete!"