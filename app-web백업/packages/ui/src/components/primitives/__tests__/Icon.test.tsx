import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Icon } from '../Icon';

// Mock @iconify/react
jest.mock('@iconify/react', () => ({
  Icon: ({ icon, className, width, height, ...props }: { icon: string; className?: string; width?: number; height?: number }) => (
    <span 
      data-testid="iconify-icon"
      data-icon={icon}
      className={className}
      style={{ width, height }}
      {...props}
    />
  ),
}));

describe('Icon', () => {
  it('should render with icon prop', () => {
    render(<Icon icon="ph:heart-bold" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'ph:heart-bold');
  });

  it('should pass className prop', () => {
    render(<Icon icon="ph:user" className="text-red-500" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveClass('text-red-500');
  });

  it('should pass width and height props', () => {
    render(<Icon icon="ph:star" width={24} height={24} />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveStyle({ width: 24, height: 24 });
  });

  it('should pass string width and height', () => {
    render(<Icon icon="ph:star" width="2rem" height="2rem" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveStyle({ width: '2rem', height: '2rem' });
  });

  it('should pass additional props', () => {
    render(
      <Icon 
        icon="ph:check" 
        data-custom="test" 
        aria-label="Check icon"
        role="img"
      />
    );
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveAttribute('data-custom', 'test');
    expect(icon).toHaveAttribute('aria-label', 'Check icon');
    expect(icon).toHaveAttribute('role', 'img');
  });

  it('should handle inline prop', () => {
    render(<Icon icon="ph:info" inline={true} />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveAttribute('inline', 'true');
  });

  it('should handle flip prop', () => {
    render(<Icon icon="ph:arrow-right" flip="horizontal" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveAttribute('flip', 'horizontal');
  });

  it('should handle rotate prop', () => {
    render(<Icon icon="ph:refresh" rotate={90} />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveAttribute('rotate', '90');
  });

  it('should handle color prop', () => {
    render(<Icon icon="ph:heart" color="#ff0000" />);
    const icon = screen.getByTestId('iconify-icon');
    expect(icon).toHaveAttribute('color', '#ff0000');
  });
});