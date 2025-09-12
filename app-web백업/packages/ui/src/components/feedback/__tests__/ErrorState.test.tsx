import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState, EmptyState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders with default props', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorState title="커스텀 오류" />);
    
    expect(screen.getByText('커스텀 오류')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<ErrorState message="커스텀 메시지입니다." />);
    
    expect(screen.getByText('커스텀 메시지입니다.')).toBeInTheDocument();
  });

  it('renders with both custom title and message', () => {
    render(
      <ErrorState 
        title="네트워크 오류" 
        message="인터넷 연결을 확인해주세요." 
      />
    );
    
    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
    expect(screen.getByText('인터넷 연결을 확인해주세요.')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState 
        action={{
          label: '다시 시도',
          onClick: handleRetry
        }}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: '다시 시도' });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState 
        action={{
          label: '다시 시도',
          onClick: handleRetry
        }}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: '다시 시도' });
    fireEvent.click(retryButton);
    
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action is not provided', () => {
    render(<ErrorState />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<ErrorState />);
    
    const errorContainer = container.firstChild;
    expect(errorContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  it('renders error icon', () => {
    render(<ErrorState />);
    
    // Icon is rendered as an SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles multiple action clicks', () => {
    const handleRetry = jest.fn();
    render(
      <ErrorState 
        action={{
          label: '다시 시도',
          onClick: handleRetry
        }}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: '다시 시도' });
    
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    
    expect(handleRetry).toHaveBeenCalledTimes(3);
  });

  it('renders with custom className', () => {
    const { container } = render(<ErrorState className="custom-error-class" />);
    
    const errorContainer = container.firstChild;
    expect(errorContainer).toHaveClass('custom-error-class');
  });

  it('renders with custom action label', () => {
    render(
      <ErrorState 
        action={{
          label: '홈으로 이동',
          onClick: jest.fn()
        }}
      />
    );
    
    expect(screen.getByRole('button', { name: '홈으로 이동' })).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders with default props', () => {
    render(<EmptyState />);
    
    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    expect(screen.getByText('아직 표시할 내용이 없습니다.')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<EmptyState title="검색 결과 없음" />);
    
    expect(screen.getByText('검색 결과 없음')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<EmptyState message="다른 검색어를 입력해보세요." />);
    
    expect(screen.getByText('다른 검색어를 입력해보세요.')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const handleAdd = jest.fn();
    render(
      <EmptyState 
        action={{
          label: '새로 추가',
          onClick: handleAdd
        }}
      />
    );
    
    const addButton = screen.getByRole('button', { name: '새로 추가' });
    expect(addButton).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', () => {
    const handleAdd = jest.fn();
    render(
      <EmptyState 
        action={{
          label: '새로 추가',
          onClick: handleAdd
        }}
      />
    );
    
    const addButton = screen.getByRole('button', { name: '새로 추가' });
    fireEvent.click(addButton);
    
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders custom icon when provided', () => {
    const customIcon = <div data-testid="custom-icon">Custom Icon</div>;
    render(<EmptyState icon={customIcon} />);
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders default icon when custom icon is not provided', () => {
    render(<EmptyState />);
    
    // Default icon is rendered as an SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<EmptyState />);
    
    const emptyContainer = container.firstChild;
    expect(emptyContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });

  it('renders with custom className', () => {
    const { container } = render(<EmptyState className="custom-empty-class" />);
    
    const emptyContainer = container.firstChild;
    expect(emptyContainer).toHaveClass('custom-empty-class');
  });
});