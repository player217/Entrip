import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid } from '../DataGrid';
import type { ColumnDef } from '@tanstack/react-table';

// 테스트용 데이터 타입
interface TestData {
  id: string;
  name: string;
  age: number;
  email: string;
}

// 테스트 데이터
const mockData: TestData[] = [
  { id: '1', name: '홍길동', age: 30, email: 'hong@example.com' },
  { id: '2', name: '김철수', age: 25, email: 'kim@example.com' },
  { id: '3', name: '이영희', age: 28, email: 'lee@example.com' },
];

// 컬럼 정의
const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: '이름',
  },
  {
    accessorKey: 'age',
    header: '나이',
  },
  {
    accessorKey: 'email',
    header: '이메일',
  },
];

describe('DataGrid Component', () => {
  describe('기본 렌더링', () => {
    it('데이터가 올바르게 렌더링되어야 한다', () => {
      render(<DataGrid columns={columns} data={mockData} />);
      
      // 헤더 확인
      expect(screen.getByText('이름')).toBeInTheDocument();
      expect(screen.getByText('나이')).toBeInTheDocument();
      expect(screen.getByText('이메일')).toBeInTheDocument();
      
      // 데이터 확인
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
    });

    it('빈 데이터를 처리할 수 있어야 한다', () => {
      render(<DataGrid columns={columns} data={[]} />);
      
      // 헤더는 여전히 표시되어야 함
      expect(screen.getByText('이름')).toBeInTheDocument();
      expect(screen.getByText('나이')).toBeInTheDocument();
      expect(screen.getByText('이메일')).toBeInTheDocument();
    });
  });

  describe('정렬 기능', () => {
    it('enableSorting이 true일 때 정렬이 가능해야 한다', async () => {
      const user = userEvent.setup();
      render(<DataGrid columns={columns} data={mockData} enableSorting />);
      
      // 이름 헤더를 클릭하여 정렬
      const nameHeader = screen.getByText('이름');
      await user.click(nameHeader);
      
      // 정렬 아이콘이 표시되어야 함
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('enableSorting이 false일 때 정렬이 비활성화되어야 한다', async () => {
      const user = userEvent.setup();
      render(<DataGrid columns={columns} data={mockData} enableSorting={false} />);
      
      // 이름 헤더 클릭
      const nameHeader = screen.getByText('이름');
      await user.click(nameHeader);
      
      // 정렬 아이콘이 표시되지 않아야 함
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });
  });

  describe('필터링 기능', () => {
    it('enableFiltering이 true일 때 필터 입력창이 표시되어야 한다', () => {
      render(<DataGrid columns={columns} data={mockData} enableFiltering />);
      
      expect(screen.getByPlaceholderText('검색...')).toBeInTheDocument();
    });

    it('필터 입력시 데이터가 필터링되어야 한다', async () => {
      const user = userEvent.setup();
      render(<DataGrid columns={columns} data={mockData} enableFiltering />);
      
      const filterInput = screen.getByPlaceholderText('검색...');
      await user.type(filterInput, '홍길동');
      
      // 홍길동만 표시되어야 함
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    });
  });

  describe('페이지네이션 기능', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `사용자${i + 1}`,
      age: 20 + i,
      email: `user${i + 1}@example.com`,
    }));

    it('enablePagination이 true일 때 페이지네이션이 표시되어야 한다', () => {
      render(
        <DataGrid 
          columns={columns} 
          data={largeData} 
          enablePagination 
          pageSize={10}
        />
      );
      
      expect(screen.getByText('이전')).toBeInTheDocument();
      expect(screen.getByText('다음')).toBeInTheDocument();
      expect(screen.getByText(/페이지 1 \/ 3/)).toBeInTheDocument();
    });

    it('다음 버튼 클릭시 다음 페이지로 이동해야 한다', async () => {
      const user = userEvent.setup();
      render(
        <DataGrid 
          columns={columns} 
          data={largeData} 
          enablePagination 
          pageSize={10}
        />
      );
      
      const nextButton = screen.getByText('다음');
      await user.click(nextButton);
      
      expect(screen.getByText(/페이지 2 \/ 3/)).toBeInTheDocument();
    });
  });

  describe('커스텀 높이', () => {
    it('height prop이 적용되어야 한다', () => {
      const { container } = render(
        <DataGrid columns={columns} data={mockData} height={400} />
      );
      
      const scrollContainer = container.querySelector('.overflow-auto');
      expect(scrollContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('접근성', () => {
    it('테이블 구조가 올바르게 렌더링되어야 한다', () => {
      render(<DataGrid columns={columns} data={mockData} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // 헤더 행
      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells).toHaveLength(3);
      
      // 데이터 행
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(3); // 헤더 행 + 데이터 행들
    });
  });
});