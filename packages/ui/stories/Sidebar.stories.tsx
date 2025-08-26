import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '../../../apps/web/src/components/layout/Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100vh' }}>
        <Story />
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#f5f5f5' }}>
          <p>Main Content Area</p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  parameters: {
    localStorage: {
      sidebarCollapsed: true,
    },
  },
};

export const WithActiveRoute: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/booking',
      },
    },
  },
};
