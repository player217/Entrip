import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';
import { useDataGridCore } from '../../hooks/useDataGridCore';

// Mock the useDataGridCore hook
jest.mock('../../hooks/useDataGridCore', () => ({
  useDataGridCore: jest.fn(),
  getSortingIcon: jest.fn((sorted) => {
    if (sorted === 'asc') return '↑';
    if (sorted === 'desc') return '↓';
    return '↕';
  }),
  getPaginationText: jest.fn((pageIndex, pageSize, total) => {
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, total);
    return `${start}-${end} of ${total}`;
  }),
}));

// Mock flexRender from tanstack table
jest.mock('@tanstack/react-table', () => ({
  flexRender: (cell: unknown, context: unknown) => {
    // If it's a column header, return the header text
    if (typeof cell === 'string') return cell;
    // If it's a cell value getter, return the value
    if (typeof cell === 'function') return cell(context);
    // Otherwise return the cell as is
    return cell;
  },
}));

describe('DataGrid', () => {
  const mockColumns = [
    { 
      id: 'id', 
      header: 'ID', 
      accessorKey: 'id',
      cell: ({ getValue }: { getValue: () => unknown }) => getValue(),
    },
    { 
      id: 'name', 
      header: 'Name', 
      accessorKey: 'name',
      cell: ({ getValue }: { getValue: () => unknown }) => getValue(),
    },
    { 
      id: 'email', 
      header: 'Email', 
      accessorKey: 'email',
      cell: ({ getValue }: { getValue: () => unknown }) => getValue(),
    },
    { 
      id: 'status', 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ getValue }: { getValue: () => unknown }) => getValue(),
    },
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
  ];

  const mockTable = {
    getHeaderGroups: jest.fn().mockReturnValue([
      {
        id: 'header-group-1',
        headers: mockColumns.map((col) => ({
          id: col.id,
          column: {
            getCanSort: jest.fn().mockReturnValue(true),
            getIsSorted: jest.fn().mockReturnValue(false),
            getToggleSortingHandler: jest.fn().mockReturnValue(() => {}),
            columnDef: col,
          },
          getContext: jest.fn().mockReturnValue({}),
        })),
      },
    ]),
    getRowModel: jest.fn().mockReturnValue({
      rows: mockData.map((row, idx) => ({
        id: `row-${idx}`,
        getVisibleCells: jest.fn().mockReturnValue(
          Object.entries(row).map(([key, value]) => ({
            id: `cell-${idx}-${key}`,
            column: { 
              columnDef: mockColumns.find(col => col.accessorKey === key) || { 
                accessorKey: key,
                cell: ({ getValue }: { getValue: () => unknown }) => getValue(),
              } 
            },
            getValue: jest.fn().mockReturnValue(value),
            getContext: jest.fn().mockReturnValue({ getValue: () => value }),
          }))
        ),
      })),
    }),
    getState: jest.fn().mockReturnValue({
      sorting: [],
      columnFilters: [],
      globalFilter: '',
    }),
  };

  beforeEach(() => {
    (useDataGridCore as jest.Mock).mockReturnValue({ table: mockTable });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with columns and data', () => {
    render(<DataGrid columns={mockColumns} data={mockData} />);

    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('active')).toHaveLength(2); // Two active statuses
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('calls useDataGridCore with correct props', () => {
    render(<DataGrid 
      columns={mockColumns} 
      data={mockData} 
      enableSorting={true}
      enableFiltering={true}
      enablePagination={true}
      pageSize={20}
    />);

    expect(useDataGridCore).toHaveBeenCalledWith({
      columns: mockColumns,
      data: mockData,
      enableSorting: true,
      enableFiltering: true,
      enablePagination: true,
      pageSize: 20,
    });
  });

  it('renders empty state when no data', () => {
    const emptyTable = {
      ...mockTable,
      getRowModel: jest.fn().mockReturnValue({ rows: [] }),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: emptyTable });

    render(<DataGrid columns={mockColumns} data={[]} />);

    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
  });


  it('handles column sorting', () => {
    const toggleSortingHandler = jest.fn();
    const sortableTable = {
      ...mockTable,
      getHeaderGroups: jest.fn().mockReturnValue([
        {
          id: 'header-group-1',
          headers: [
            {
              id: 'name',
              column: {
                getCanSort: jest.fn().mockReturnValue(true),
                getIsSorted: jest.fn().mockReturnValue('asc'),
                getToggleSortingHandler: jest.fn().mockReturnValue(toggleSortingHandler),
                columnDef: { id: 'name', header: 'Name', accessorKey: 'name' },
              },
              getContext: jest.fn().mockReturnValue({}),
            },
          ],
        },
      ]),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: sortableTable });

    render(<DataGrid columns={mockColumns} data={mockData} />);

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    expect(toggleSortingHandler).toHaveBeenCalled();
  });

  it('displays sort indicators', () => {
    const sortedTable = {
      ...mockTable,
      getHeaderGroups: jest.fn().mockReturnValue([
        {
          id: 'header-group-1',
          headers: [
            {
              id: 'name',
              column: {
                getCanSort: jest.fn().mockReturnValue(true),
                getIsSorted: jest.fn().mockReturnValue('asc'),
                getToggleSortingHandler: jest.fn().mockReturnValue(() => {}),
                columnDef: { id: 'name', header: 'Name', accessorKey: 'name' },
              },
              getContext: jest.fn().mockReturnValue({}),
            },
            {
              id: 'email',
              column: {
                getCanSort: jest.fn().mockReturnValue(true),
                getIsSorted: jest.fn().mockReturnValue('desc'),
                getToggleSortingHandler: jest.fn().mockReturnValue(() => {}),
                columnDef: { id: 'email', header: 'Email', accessorKey: 'email' },
              },
              getContext: jest.fn().mockReturnValue({}),
            },
          ],
        },
      ]),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: sortedTable });

    render(<DataGrid columns={mockColumns} data={mockData} />);

    // Check for sort indicators
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveTextContent('▲'); // Ascending

    const emailHeader = screen.getByText('Email').closest('th');
    expect(emailHeader).toHaveTextContent('▼'); // Descending
  });

  it('renders custom cell content with cell renderer', () => {
    const customColumns = [
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return <span className={`status-${value}`}>{value.toUpperCase()}</span>;
        },
      },
    ];

    const customTable = {
      ...mockTable,
      getHeaderGroups: jest.fn().mockReturnValue([
        {
          id: 'header-group-1',
          headers: customColumns.map(col => ({
            id: col.id,
            column: {
              getCanSort: jest.fn().mockReturnValue(false),
              getIsSorted: jest.fn().mockReturnValue(false),
              columnDef: col,
            },
            getContext: jest.fn().mockReturnValue({}),
          })),
        },
      ]),
      getRowModel: jest.fn().mockReturnValue({
        rows: [
          {
            id: 'row-1',
            getVisibleCells: jest.fn().mockReturnValue([
              {
                id: 'cell-1',
                column: { columnDef: customColumns[0] },
                getValue: jest.fn().mockReturnValue('active'),
                getContext: jest.fn().mockReturnValue({}),
              },
            ]),
          },
        ],
      }),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: customTable });

    render(<DataGrid columns={customColumns} data={[{ status: 'active' }]} />);

    const statusCell = screen.getByText('ACTIVE');
    expect(statusCell).toHaveClass('status-active');
  });

  it('applies custom className to table', () => {
    const { container } = render(
      <DataGrid columns={mockColumns} data={mockData} className="custom-grid" />
    );

    const table = container.querySelector('table');
    expect(table).toHaveClass('custom-grid');
  });

  it('handles row selection when enabled', () => {
    const selectionTable = {
      ...mockTable,
      getRowModel: jest.fn().mockReturnValue({
        rows: mockData.map((row, idx) => ({
          id: `row-${idx}`,
          getIsSelected: jest.fn().mockReturnValue(idx === 0),
          getToggleSelectedHandler: jest.fn().mockReturnValue(() => {}),
          getVisibleCells: jest.fn().mockReturnValue(
            Object.entries(row).map(([key, value]) => ({
              id: `cell-${idx}-${key}`,
              column: { columnDef: { accessorKey: key } },
              getValue: jest.fn().mockReturnValue(value),
              getContext: jest.fn().mockReturnValue({}),
            }))
          ),
        })),
      }),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: selectionTable });

    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        // Row selection not implemented
      />
    );

    const firstRow = screen.getByText('John Doe').closest('tr');
    expect(firstRow).toHaveClass('selected');
  });

  it('renders with striped rows when option is enabled', () => {
    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        // Striped rows not implemented
      />
    );

    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    rows.forEach((row, idx) => {
      if (idx % 2 === 1) {
        expect(row).toHaveClass('bg-gray-50');
      }
    });
  });

  it('handles pagination controls', () => {
    const paginatedTable = {
      ...mockTable,
      getCanPreviousPage: jest.fn().mockReturnValue(false),
      getCanNextPage: jest.fn().mockReturnValue(true),
      previousPage: jest.fn(),
      nextPage: jest.fn(),
      getPageCount: jest.fn().mockReturnValue(5),
      getState: jest.fn().mockReturnValue({
        pagination: { pageIndex: 0, pageSize: 10 },
      }),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: paginatedTable });

    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        enablePagination={true}
      />
    );

    const prevButton = screen.getByTestId('pagination-prev');
    const nextButton = screen.getByTestId('pagination-next');

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(paginatedTable.nextPage).toHaveBeenCalled();
  });

  it('displays current page info', () => {
    const paginatedTable = {
      ...mockTable,
      getState: jest.fn().mockReturnValue({
        pagination: { pageIndex: 2, pageSize: 10 },
      }),
      getPageCount: jest.fn().mockReturnValue(5),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: paginatedTable });

    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        enablePagination={true}
      />
    );

    expect(screen.getByText('3 / 5')).toBeInTheDocument(); // pageIndex is 0-based
  });

  it('handles global filter', () => {
    const filterableTable = {
      ...mockTable,
      setGlobalFilter: jest.fn(),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: filterableTable });

    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        enableFiltering={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('검색...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(filterableTable.setGlobalFilter).toHaveBeenCalledWith('john');
  });

  it('debounces global filter input', async () => {
    jest.useFakeTimers();
    const filterableTable = {
      ...mockTable,
      setGlobalFilter: jest.fn(),
    };
    (useDataGridCore as jest.Mock).mockReturnValue({ table: filterableTable });

    render(
      <DataGrid
        columns={mockColumns}
        data={mockData}
        enableFiltering={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('검색...');
    fireEvent.change(searchInput, { target: { value: 'j' } });
    fireEvent.change(searchInput, { target: { value: 'jo' } });
    fireEvent.change(searchInput, { target: { value: 'joh' } });
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(filterableTable.setGlobalFilter).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(filterableTable.setGlobalFilter).toHaveBeenCalledTimes(1);
    expect(filterableTable.setGlobalFilter).toHaveBeenCalledWith('john');

    jest.useRealTimers();
  });
});