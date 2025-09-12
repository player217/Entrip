import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';

// Mock components
jest.mock('../../../src/components/layout/Sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar">Sidebar {children}</div>
  ),
}));

jest.mock('../../../src/components/layout/GlobalTabBar', () => ({
  GlobalTabBar: () => <div data-testid="global-tab-bar">GlobalTabBar</div>,
}));

jest.mock('../../../src/components/chrome-tabs/ChromeTabContainer', () => ({
  ChromeTabContainer: () => <div data-testid="chrome-tab-container">ChromeTabContainer</div>,
}));

describe('RootLayout', () => {
  it('renders all layout components', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('global-tab-bar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct layout structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const mainContainer = container.querySelector('.flex.h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('bg-gray-50');
  });

  it('renders children inside content area', () => {
    render(
      <RootLayout>
        <h1>Page Title</h1>
        <p>Page content</p>
      </RootLayout>
    );

    expect(screen.getByText('Page Title')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('has correct flex layout', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const flexContainer = container.querySelector('.flex-1.flex.flex-col');
    expect(flexContainer).toBeInTheDocument();
  });

  it('content area has overflow auto', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const contentArea = container.querySelector('.flex-1.overflow-auto');
    expect(contentArea).toBeInTheDocument();
  });

  it('maintains layout structure with multiple children', () => {
    render(
      <RootLayout>
        <header>Header</header>
        <main>Main Content</main>
        <footer>Footer</footer>
      </RootLayout>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('sidebar receives GlobalTabBar as child', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.textContent).toContain('GlobalTabBar');
  });

  it('applies full height to layout', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const layoutContainer = container.firstChild;
    expect(layoutContainer).toHaveClass('h-screen');
  });

  it('renders empty content gracefully', () => {
    render(<RootLayout>{null}</RootLayout>);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('global-tab-bar')).toBeInTheDocument();
  });

  it('renders with fragment children', () => {
    render(
      <RootLayout>
        <>
          <div>First</div>
          <div>Second</div>
        </>
      </RootLayout>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});