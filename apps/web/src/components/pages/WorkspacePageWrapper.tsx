'use client';

import WorkSpacePage from '@/../app/(main)/workspace/page';

// Simple wrapper to work around TypeScript module resolution issues with App Router pages
export default function WorkspacePageWrapper() {
  return <WorkSpacePage />;
}