import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonGroup } from '../Skeleton';

describe('Skeleton', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-gray-200', 'rounded-md', 'animate-pulse');
    });

    it('applies custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('renders text variant', () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded');
    });

    it('renders circular variant', () => {
      const { container } = render(<Skeleton variant="circular" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders rectangular variant', () => {
      const { container } = render(<Skeleton variant="rectangular" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded-md');
    });
  });

  describe('Animations', () => {
    it('applies pulse animation by default', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('applies wave animation', () => {
      const { container } = render(<Skeleton animation="wave" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('animate-shimmer');
    });

    it('applies no animation when none', () => {
      const { container } = render(<Skeleton animation="none" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).not.toHaveClass('animate-pulse');
      expect(skeleton).not.toHaveClass('animate-shimmer');
    });
  });

  describe('Dimensions', () => {
    it('has default dimensions', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.width).toBe('100%');
      expect(skeleton.style.height).toBe('1rem');
    });

    it('applies custom width as string', () => {
      const { container } = render(<Skeleton width="200px" />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.width).toBe('200px');
    });

    it('applies custom width as number', () => {
      const { container } = render(<Skeleton width={300} />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.width).toBe('300px');
    });

    it('applies custom height as string', () => {
      const { container } = render(<Skeleton height="50px" />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.height).toBe('50px');
    });

    it('applies custom height as number', () => {
      const { container } = render(<Skeleton height={100} />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.height).toBe('100px');
    });
  });
});

describe('SkeletonGroup', () => {
  describe('Basic rendering', () => {
    it('renders default count of skeletons', () => {
      const { container } = render(<SkeletonGroup />);
      const skeletons = container.querySelectorAll('.bg-gray-200');
      
      expect(skeletons).toHaveLength(3);
    });

    it('renders custom count of skeletons', () => {
      const { container } = render(<SkeletonGroup count={5} />);
      const skeletons = container.querySelectorAll('.bg-gray-200');
      
      expect(skeletons).toHaveLength(5);
    });

    it('renders children when provided', () => {
      render(
        <SkeletonGroup>
          <Skeleton data-testid="child-1" />
          <Skeleton data-testid="child-2" />
        </SkeletonGroup>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('renders with vertical layout by default', () => {
      const { container } = render(<SkeletonGroup />);
      const group = container.firstChild;
      
      expect(group).toHaveClass('flex', 'flex-col');
    });

    it('renders with horizontal layout', () => {
      const { container } = render(<SkeletonGroup direction="horizontal" />);
      const group = container.firstChild;
      
      expect(group).toHaveClass('flex', 'flex-row');
    });

    it('applies default gap', () => {
      const { container } = render(<SkeletonGroup />);
      const group = container.firstChild;
      
      expect(group).toHaveClass('gap-2');
    });

    it('applies custom gap', () => {
      const { container } = render(<SkeletonGroup gap={4} />);
      const group = container.firstChild;
      
      expect(group).toHaveClass('gap-4');
    });
  });

  describe('Edge cases', () => {
    it('renders empty when count is 0', () => {
      const { container } = render(<SkeletonGroup count={0} />);
      const skeletons = container.querySelectorAll('.bg-gray-200');
      
      expect(skeletons).toHaveLength(0);
    });

    it('handles both children and layout props', () => {
      const { container } = render(
        <SkeletonGroup direction="horizontal" gap={3}>
          <Skeleton />
          <Skeleton />
        </SkeletonGroup>
      );
      
      const group = container.firstChild;
      expect(group).toHaveClass('flex', 'flex-row', 'gap-3');
      
      const skeletons = container.querySelectorAll('.bg-gray-200');
      expect(skeletons).toHaveLength(2);
    });
  });
});