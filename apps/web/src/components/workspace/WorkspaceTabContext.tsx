'use client';

import { createContext, useContext } from 'react';

export const WorkspaceTabContext = createContext<{ tabKey: string; active: boolean } | null>(null);
export const useWorkspaceTabKey = () => useContext(WorkspaceTabContext)?.tabKey ?? null;
export const useWorkspaceTabActive = () => useContext(WorkspaceTabContext)?.active ?? true;
