import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlowNode, PlusButton, PropertyPanel } from '../FlowNode';
import type { FlowNodeData } from '../FlowNode';

describe('FlowNode', () => {
  const mockOnClick = jest.fn();

  const mockData: FlowNodeData = {
    label: 'Send Email',
    icon: 'ph:envelope-simple',
    type: 'action',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<FlowNode data={mockData} />);
      expect(screen.getByText('Send Email')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      const { container } = render(<FlowNode data={mockData} />);
      // Icon 컴포넌트는 svg를 렌더링하므로 svg 요소를 찾습니다
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-5', 'h-5');
    });

    it('should apply correct color based on type', () => {
      const { container, rerender } = render(<FlowNode data={mockData} />);
      
      // Action type - blue
      let icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-blue-600');

      // Trigger type - purple
      rerender(<FlowNode data={{ ...mockData, type: 'trigger' }} />);
      icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-purple-600');

      // Condition type - orange
      rerender(<FlowNode data={{ ...mockData, type: 'condition' }} />);
      icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-orange-600');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <FlowNode data={mockData} className="custom-class" />
      );
      const node = container.firstChild;
      expect(node).toHaveClass('custom-class');
    });

    it('should have minimum width', () => {
      const { container } = render(<FlowNode data={mockData} />);
      const node = container.firstChild;
      expect(node).toHaveClass('min-w-[180px]');
    });
  });

  describe('Selection State', () => {
    it('should show default state when not selected', () => {
      const { container } = render(<FlowNode data={mockData} selected={false} />);
      const node = container.firstChild;
      expect(node).toHaveClass('border-gray-300');
      expect(node).not.toHaveClass('border-brand-500');
      expect(node).not.toHaveClass('shadow-md');
    });

    it('should show selected state', () => {
      const { container } = render(<FlowNode data={mockData} selected={true} />);
      const node = container.firstChild;
      expect(node).toHaveClass('border-brand-500');
      expect(node).toHaveClass('shadow-md');
    });

    it('should have hover effects when not selected', () => {
      const { container } = render(<FlowNode data={mockData} selected={false} />);
      const node = container.firstChild;
      expect(node).toHaveClass('hover:shadow-md');
      expect(node).toHaveClass('hover:border-brand-500');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      render(<FlowNode data={mockData} onClick={mockOnClick} />);
      const node = screen.getByText('Send Email').parentElement;
      fireEvent.click(node!);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should be clickable without onClick handler', () => {
      render(<FlowNode data={mockData} />);
      const node = screen.getByText('Send Email').parentElement;
      expect(() => fireEvent.click(node!)).not.toThrow();
    });

    it('should have cursor pointer', () => {
      const { container } = render(<FlowNode data={mockData} />);
      const node = container.firstChild;
      expect(node).toHaveClass('cursor-pointer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown type', () => {
      const unknownTypeData = {
        ...mockData,
        type: 'unknown' as FlowNodeData['type'],
      };
      const { container } = render(<FlowNode data={unknownTypeData} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-gray-600');
    });

    it('should render with empty label', () => {
      const emptyLabelData = { ...mockData, label: '' };
      render(<FlowNode data={emptyLabelData} />);
      const labelElement = screen.getByText('', { selector: 'span.font-medium' });
      expect(labelElement).toBeInTheDocument();
    });

    it('should handle long labels', () => {
      const longLabelData = {
        ...mockData,
        label: 'This is a very long label that might overflow the container',
      };
      render(<FlowNode data={longLabelData} />);
      expect(screen.getByText(longLabelData.label)).toBeInTheDocument();
    });
  });
});

describe('PlusButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render plus icon', () => {
      const { container } = render(<PlusButton />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-3 h-3');
    });

    it('should apply custom className', () => {
      const { container } = render(<PlusButton className="custom-class" />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should have proper size', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('w-6');
      expect(button).toHaveClass('h-6');
    });

    it('should be rounded', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('rounded-full');
    });
  });

  describe('Styling', () => {
    it('should have default styling', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('border-gray-300');
      expect(button).toHaveClass('bg-white');
    });

    it('should have hover effects', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:bg-brand-500');
      expect(button).toHaveClass('hover:text-white');
      expect(button).toHaveClass('hover:border-brand-500');
    });

    it('should have transition effects', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-200');
    });

    it('should have shadow', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('shadow-sm');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const { container } = render(<PlusButton onClick={mockOnClick} />);
      const button = container.querySelector('button');
      fireEvent.click(button!);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should work without onClick handler', () => {
      const { container } = render(<PlusButton />);
      const button = container.querySelector('button');
      expect(() => fireEvent.click(button!)).not.toThrow();
    });
  });
});

describe('PropertyPanel', () => {
  const mockChildren = <div>Panel Content</div>;

  describe('Rendering', () => {
    it('should render title', () => {
      render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      expect(screen.getByText('Setup ✓')).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<PropertyPanel title="Configuration">{mockChildren}</PropertyPanel>);
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PropertyPanel className="custom-class">{mockChildren}</PropertyPanel>
      );
      const panel = container.firstChild;
      expect(panel).toHaveClass('custom-class');
    });
  });

  describe('Layout', () => {
    it('should have fixed width', () => {
      const { container } = render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const panel = container.firstChild;
      expect(panel).toHaveClass('w-[360px]');
    });

    it('should have left border', () => {
      const { container } = render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const panel = container.firstChild;
      expect(panel).toHaveClass('border-l');
      expect(panel).toHaveClass('border-gray-200');
    });

    it('should have white background', () => {
      const { container } = render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const panel = container.firstChild;
      expect(panel).toHaveClass('bg-white');
    });

    it('should have header with border', () => {
      render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const header = screen.getByText('Setup ✓').parentElement;
      expect(header).toHaveClass('border-b');
      expect(header).toHaveClass('p-4');
    });

    it('should have content padding', () => {
      render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const content = screen.getByText('Panel Content').parentElement;
      expect(content).toHaveClass('p-4');
    });
  });

  describe('Typography', () => {
    it('should style title correctly', () => {
      render(<PropertyPanel>{mockChildren}</PropertyPanel>);
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveClass('text-base');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      render(<PropertyPanel title="">{mockChildren}</PropertyPanel>);
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeEmptyDOMElement();
    });

    it('should handle complex children', () => {
      const complexChildren = (
        <div>
          <input type="text" placeholder="Enter value" />
          <button>Submit</button>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );
      render(<PropertyPanel>{complexChildren}</PropertyPanel>);
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle React fragments as children', () => {
      const fragmentChildren = (
        <>
          <span>First</span>
          <span>Second</span>
        </>
      );
      render(<PropertyPanel>{fragmentChildren}</PropertyPanel>);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });
});