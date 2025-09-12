import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { DataGrid } from '../compounds/DataGrid'
import type { ColumnDef } from '../types/tanstack-table'

interface MockData {
  id: string
  name: string
  status: string
}

describe('DataGrid', () => {
  const mockColumns: ColumnDef<MockData>[] = [
    { 
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      size: 50 
    },
    { 
      id: 'name',
      accessorKey: 'name', 
      header: 'Name',
      size: 200 
    },
    { 
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 100 
    },
  ]

  const mockData: MockData[] = [
    { id: '1', name: 'Test Item 1', status: 'Active' },
    { id: '2', name: 'Test Item 2', status: 'Inactive' },
  ]

  it('renders table with columns and data', () => {
    render(<DataGrid columns={mockColumns} data={mockData} />)
    
    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    
    // Check data
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
  })

  it('renders empty table when no data', () => {
    render(<DataGrid columns={mockColumns} data={[]} />)
    
    // Table should still render with headers
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('handles undefined data gracefully', () => {
    // @ts-expect-error Testing undefined case
    render(<DataGrid columns={mockColumns} data={undefined} />)
    
    // Should still render headers
    expect(screen.getByText('ID')).toBeInTheDocument()
  })

  it('renders with filtering enabled', () => {
    render(<DataGrid columns={mockColumns} data={mockData} enableFiltering />)
    
    // Check for search input
    expect(screen.getByPlaceholderText('검색...')).toBeInTheDocument()
  })

  it('renders with pagination enabled', () => {
    render(<DataGrid columns={mockColumns} data={mockData} enablePagination />)
    
    // Check for pagination controls
    expect(screen.getByText('이전')).toBeInTheDocument()
    expect(screen.getByText('다음')).toBeInTheDocument()
    expect(screen.getByText(/페이지/)).toBeInTheDocument()
  })
})
