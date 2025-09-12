import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CommandBar } from '../CommandBar';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height, className }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    // eslint-disable-next-line
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

describe('CommandBar', () => {
  it('renders logo images', () => {
    render(<CommandBar />);
    
    // Logo images
    const markImage = screen.getByAltText('Entrip mark');
    const wordmarkImage = screen.getByAltText('Entrip wordmark');
    
    expect(markImage).toBeInTheDocument();
    expect(wordmarkImage).toBeInTheDocument();
    expect(markImage).toHaveAttribute('src', '/ciwhite.png');
    expect(wordmarkImage).toHaveAttribute('src', '/citextwhite.png');
  });

  it('renders with proper structure', () => {
    const { container } = render(<CommandBar />);
    
    // Check for logo container
    const logoContainer = container.querySelector('.flex.items-center.gap-3');
    expect(logoContainer).toBeInTheDocument();
  });

  it('applies correct image dimensions', () => {
    render(<CommandBar />);
    
    const markImage = screen.getByAltText('Entrip mark');
    const wordmarkImage = screen.getByAltText('Entrip wordmark');
    
    expect(markImage).toHaveAttribute('width', '32');
    expect(markImage).toHaveAttribute('height', '32');
    expect(wordmarkImage).toHaveAttribute('width', '100');
    expect(wordmarkImage).toHaveAttribute('height', '24');
  });

  it('applies correct image classes', () => {
    render(<CommandBar />);
    
    const markImage = screen.getByAltText('Entrip mark');
    const wordmarkImage = screen.getByAltText('Entrip wordmark');
    
    expect(markImage).toHaveClass('h-9', 'w-auto');
    expect(wordmarkImage).toHaveClass('h-6', 'w-auto');
  });

  it('handles optional user prop', () => {
    const user = {
      name: '김태영',
      company: '울산관광여행사',
    };
    
    // Component accepts but doesn't use user prop in current implementation
    const { container } = render(<CommandBar user={user} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles optional exchangeRates prop', () => {
    const rates = {
      USD: 1285.50,
      EUR: 1408.25,
      JPY: 8.75,
    };
    
    // Component accepts but doesn't use exchangeRates prop in current implementation
    const { container } = render(<CommandBar exchangeRates={rates} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without any props', () => {
    const { container } = render(<CommandBar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('maintains consistent layout', () => {
    const { container } = render(<CommandBar />);
    
    // Should render as a fragment with logo container
    const fragment = container.firstChild;
    expect(fragment).toBeTruthy();
    
    // Logo container should be the first child
    const logoContainer = container.querySelector('.flex.items-center.gap-3');
    expect(logoContainer).toBeInTheDocument();
  });

  it('renders images in correct order', () => {
    render(<CommandBar />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('alt', 'Entrip mark');
    expect(images[1]).toHaveAttribute('alt', 'Entrip wordmark');
  });

  it('handles missing image gracefully', () => {
    // Even if images fail to load, component should render
    const { container } = render(<CommandBar />);
    
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      // Simulate image error
      const errorEvent = new Event('error', { bubbles: true });
      img.dispatchEvent(errorEvent);
    });
    
    // Component should still be in the DOM
    expect(container.firstChild).toBeInTheDocument();
  });
});