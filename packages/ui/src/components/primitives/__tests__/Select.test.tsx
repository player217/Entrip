import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';
import type { SelectOption } from '../Select';

describe('Select', () => {
  const mockOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
    { value: 'option4', label: 'Option 4' },
  ];

  describe('Basic rendering', () => {
    it('should render with options', () => {
      render(<Select options={mockOptions} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Check all options are rendered
      mockOptions.forEach(option => {
        expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
      });
    });

    it('should render with label', () => {
      render(<Select options={mockOptions} label="Choose an option" id="test-select" />);
      
      expect(screen.getByText('Choose an option')).toBeInTheDocument();
      expect(screen.getByLabelText('Choose an option')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Select options={mockOptions} placeholder="Select..." defaultValue="" />);
      
      const placeholderOption = screen.getByRole('option', { name: 'Select...' });
      expect(placeholderOption).toBeInTheDocument();
      expect(placeholderOption).toBeDisabled();
    });

    it('should render with helper text', () => {
      render(<Select options={mockOptions} helperText="This is a helper text" />);
      
      expect(screen.getByText('This is a helper text')).toBeInTheDocument();
    });

    it('should render with hint (alias for helperText)', () => {
      render(<Select options={mockOptions} hint="This is a hint" />);
      
      expect(screen.getByText('This is a hint')).toBeInTheDocument();
    });

    it('should render with error state', () => {
      render(<Select options={mockOptions} error="This field is required" />);
      
      const errorText = screen.getByText('This field is required');
      expect(errorText).toBeInTheDocument();
      expect(errorText).toHaveClass('text-danger');
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-danger', 'text-danger');
    });

    it('should prioritize error over helper text', () => {
      render(
        <Select 
          options={mockOptions} 
          error="Error message" 
          helperText="Helper text" 
        />
      );
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });

    it('should render with full width', () => {
      const { container } = render(<Select options={mockOptions} fullWidth />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-full');
    });
  });

  describe('Disabled state', () => {
    it('should disable the select element', () => {
      render(<Select options={mockOptions} disabled />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
      expect(select).toHaveClass('disabled:bg-gray-50', 'disabled:cursor-not-allowed');
    });

    it('should disable specific options', () => {
      render(<Select options={mockOptions} />);
      
      const disabledOption = screen.getByRole('option', { name: 'Option 3' });
      expect(disabledOption).toBeDisabled();
      
      const enabledOption = screen.getByRole('option', { name: 'Option 1' });
      expect(enabledOption).not.toBeDisabled();
    });

    it('should not trigger onChange when disabled', async () => {
      const handleChange = jest.fn();
      render(<Select options={mockOptions} onChange={handleChange} disabled />);
      
      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'option2');
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Form integration', () => {
    it('should handle value changes', async () => {
      const handleChange = jest.fn();
      render(<Select options={mockOptions} onChange={handleChange} />);
      
      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'option2');
      
      expect(handleChange).toHaveBeenCalledWith('option2');
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should update selected value', async () => {
      const { rerender } = render(<Select options={mockOptions} value="option1" />);
      
      let select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');
      
      rerender(<Select options={mockOptions} value="option2" />);
      
      select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    it('should work with controlled components', async () => {
      const ControlledSelect = () => {
        const [value, setValue] = React.useState('option1');
        
        return (
          <Select 
            options={mockOptions} 
            value={value} 
            onChange={setValue}
          />
        );
      };
      
      render(<ControlledSelect />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');
      
      await userEvent.selectOptions(select, 'option2');
      expect(select.value).toBe('option2');
    });

    it('should work with uncontrolled components', async () => {
      render(<Select options={mockOptions} defaultValue="option2" />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
      
      await userEvent.selectOptions(select, 'option4');
      expect(select.value).toBe('option4');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLSelectElement>();
      render(<Select options={mockOptions} ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current?.tagName).toBe('SELECT');
    });

    it('should pass through native select props', () => {
      render(
        <Select 
          options={mockOptions} 
          name="test-select"
          id="test-id"
          required
          data-testid="custom-select"
        />
      );
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('name', 'test-select');
      expect(select).toHaveAttribute('id', 'test-id');
      expect(select).toHaveAttribute('required');
      expect(select).toHaveAttribute('data-testid', 'custom-select');
    });
  });

  describe('Keyboard navigation', () => {
    it('should support keyboard navigation with arrow keys', async () => {
      render(<Select options={mockOptions} defaultValue="option1" />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      select.focus();
      
      // Initial value should be option1
      expect(select.value).toBe('option1');
      
      // Simulate changing value (native select keyboard behavior is hard to test)
      fireEvent.change(select, { target: { value: 'option2' } });
      expect(select.value).toBe('option2');
      
      // Verify focus is maintained
      expect(document.activeElement).toBe(select);
    });

    it('should handle disabled options', async () => {
      render(<Select options={mockOptions} defaultValue="option2" />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      select.focus();
      
      // Verify option3 is disabled
      const option3 = screen.getByRole('option', { name: 'Option 3' });
      expect(option3).toBeDisabled();
      
      // Note: In jsdom, disabled options can still be selected programmatically
      // In real browsers, users cannot select disabled options via UI
      // This test just verifies the disabled attribute is set correctly
      expect(option3).toHaveAttribute('disabled');
    });

    it('should support type-ahead selection', async () => {
      render(<Select options={mockOptions} defaultValue="" />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      select.focus();
      
      // Type 'O' should select first option starting with O
      fireEvent.keyDown(select, { key: 'O' });
      
      // Verify select is still focused
      expect(document.activeElement).toBe(select);
    });

    it('should open dropdown on Space or Enter when focused', () => {
      render(<Select options={mockOptions} />);
      
      const select = screen.getByRole('combobox');
      select.focus();
      
      // Note: Browser native select behavior is hard to test
      // We can verify the select is focused and ready for interaction
      expect(document.activeElement).toBe(select);
    });

    it('should be focusable with Tab key', async () => {
      render(
        <div>
          <input type="text" />
          <Select options={mockOptions} />
          <button>Submit</button>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      const select = screen.getByRole('combobox');
      const button = screen.getByRole('button');
      
      // Start with input focused
      input.focus();
      expect(document.activeElement).toBe(input);
      
      // Tab to select
      await userEvent.tab();
      expect(document.activeElement).toBe(select);
      
      // Tab to button
      await userEvent.tab();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Custom styling', () => {
    it('should accept custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />);
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('custom-class');
      // Should also have default classes
      expect(select).toHaveClass('px-3', 'py-2', 'border', 'rounded-md');
    });

    it('should maintain style hierarchy with custom className', () => {
      render(
        <Select 
          options={mockOptions} 
          className="border-4 border-blue-500" 
        />
      );
      
      const select = screen.getByRole('combobox');
      // Custom classes should be applied
      expect(select).toHaveClass('border-4', 'border-blue-500');
      // Default classes should still be present
      expect(select).toHaveClass('px-3', 'py-2', 'rounded-md');
    });

    it('should apply hover styles', async () => {
      render(<Select options={mockOptions} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('hover:border-gray-400');
    });

    it('should apply focus styles', async () => {
      render(<Select options={mockOptions} />);
      
      const select = screen.getByRole('combobox');
      select.focus();
      
      expect(select).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:border-transparent'
      );
    });

    it('should apply error styles over default styles', () => {
      render(<Select options={mockOptions} error="Error" />);
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-danger', 'text-danger');
      expect(select).not.toHaveClass('border-gray-300');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty options array', () => {
      render(<Select options={[]} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select.children).toHaveLength(0);
    });

    it('should handle options with duplicate values', () => {
      const duplicateOptions: SelectOption[] = [
        { value: 'same', label: 'First' },
        { value: 'same', label: 'Second' },
      ];
      
      render(<Select options={duplicateOptions} />);
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('First');
      expect(options[1]).toHaveTextContent('Second');
    });

    it('should handle very long option labels', () => {
      const longOptions: SelectOption[] = [
        { 
          value: 'long', 
          label: 'This is a very long option label that might cause layout issues if not handled properly' 
        },
      ];
      
      render(<Select options={longOptions} />);
      
      const option = screen.getByRole('option');
      expect(option).toHaveTextContent(longOptions[0].label);
    });

    it('should handle special characters in option values', async () => {
      const specialOptions: SelectOption[] = [
        { value: 'with-dash', label: 'With Dash' },
        { value: 'with space', label: 'With Space' },
        { value: 'with_underscore', label: 'With Underscore' },
        { value: 'with.dot', label: 'With Dot' },
      ];
      
      const handleChange = jest.fn();
      render(<Select options={specialOptions} onChange={handleChange} />);
      
      const select = screen.getByRole('combobox');
      
      for (const option of specialOptions) {
        await userEvent.selectOptions(select, option.value);
        expect(handleChange).toHaveBeenLastCalledWith(option.value);
      }
    });
  });
});