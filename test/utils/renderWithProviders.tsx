import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';

// 필요한 Provider들을 여기에 추가
interface ProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: ProvidersProps) => {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        fetcher: () => Promise.resolve({}),
        provider: () => new Map()
      }}
    >
      {children}
    </SWRConfig>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// 공통 테스트 유틸리티
export const createMockData = <T extends object>(
  overrides?: Partial<T>
): T => {
  const defaults = {} as T;
  return { ...defaults, ...overrides };
};

// 비동기 작업을 위한 유틸리티
export const waitForLoadingToFinish = async () => {
  const { findByText } = await import('@testing-library/react');
  await findByText(/loading/i, {}, { timeout: 0 });
};