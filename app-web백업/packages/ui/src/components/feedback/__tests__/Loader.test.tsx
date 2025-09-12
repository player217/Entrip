import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Loader } from '../Loader';

describe('Loader', () => {
  it('renders with default size', () => {
    const { container } = render(<Loader />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('renders with small size', () => {
    const { container } = render(<Loader size="sm" />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders with medium size', () => {
    const { container } = render(<Loader size="md" />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('renders with large size', () => {
    const { container } = render(<Loader size="lg" />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    const { container } = render(<Loader className="custom-class" />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('has spinning animation', () => {
    const { container } = render(<Loader />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('uses correct border color', () => {
    const { container } = render(<Loader />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('border-brand-500');
  });

  it('renders loading text when provided', () => {
    render(<Loader text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render text when not provided', () => {
    render(<Loader />);
    
    const text = screen.queryByText(/loading/i);
    expect(text).not.toBeInTheDocument();
  });

  it('centers content', () => {
    const { container } = render(<Loader />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  it('applies correct styling to loading text', () => {
    render(<Loader text="Loading..." />);
    
    const text = screen.getByText('Loading...');
    expect(text).toHaveClass('mt-4', 'text-sm', 'text-gray-600');
  });

  it('combines size and custom classes correctly', () => {
    const { container } = render(<Loader size="lg" className="mt-8" />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('mt-8');
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });
});