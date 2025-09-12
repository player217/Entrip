import type { Meta, StoryObj } from '@storybook/react';
import { Header } from '../../../apps/web/src/components/layout/Header';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithNotifications: Story = {
  parameters: {
    mockData: {
      notifications: 3,
      unreadMessages: 5,
    },
  },
};
