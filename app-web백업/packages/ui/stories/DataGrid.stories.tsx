import type { Meta, StoryObj } from '@storybook/react'
import { DataGrid } from '../compounds/DataGrid'

const meta: Meta<typeof DataGrid> = {
  title: 'UI/Compounds/DataGrid',
  component: DataGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '데이터를 표 형태로 표시하는 그리드 컴포넌트입니다. 정렬, 필터링, 페이징 등을 지원합니다.',
      },
    },
  },
  argTypes: {
    columns: {
      control: false,
      description: '테이블 컴럼 정의',
    },
    data: {
      control: false,
      description: '테이블 데이터',
    },
    height: {
      control: { type: 'text' },
      description: '테이블 높이',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const sampleColumns = [
  { 
    accessorKey: 'id', 
    header: 'ID',
    size: 60,
  },
  { 
    accessorKey: 'teamName', 
    header: '팀명',
    size: 200,
  },
  { 
    accessorKey: 'type', 
    header: '유형',
    size: 100,
  },
  { 
    accessorKey: 'destination', 
    header: '목적지',
    size: 120,
  },
  { 
    accessorKey: 'startDate', 
    header: '출발일',
    size: 120,
  },
  { 
    accessorKey: 'endDate', 
    header: '도착일',
    size: 120,
  },
  { 
    accessorKey: 'status', 
    header: '상태',
    size: 100,
  },
  { 
    accessorKey: 'totalPax', 
    header: '인원',
    size: 80,
  },
  { 
    accessorKey: 'revenue', 
    header: '매출',
    size: 150,
  },
]

const sampleData = [
  {
    id: '1',
    teamName: '삼성전자 연수팀',
    type: '인센티브',
    destination: '방콕',
    startDate: '2025-06-20',
    endDate: '2025-06-23',
    status: '확정',
    totalPax: 45,
    revenue: '68,000,000원',
  },
  {
    id: '2',
    teamName: '현대차 골프팀',
    type: '골프',
    destination: '다낭',
    startDate: '2025-06-25',
    endDate: '2025-06-28',
    status: '대기',
    totalPax: 20,
    revenue: '45,000,000원',
  },
  {
    id: '3',
    teamName: 'LG전자 워크샵',
    type: '워크샵',
    destination: '세부',
    startDate: '2025-07-01',
    endDate: '2025-07-04',
    status: '확정',
    totalPax: 30,
    revenue: '52,000,000원',
  },
  {
    id: '4',
    teamName: 'SK하이닉스 포상',
    type: '포상여행',
    destination: '오사카',
    startDate: '2025-07-10',
    endDate: '2025-07-13',
    status: '완료',
    totalPax: 25,
    revenue: '38,000,000원',
  },
  {
    id: '5',
    teamName: '카카오 팀빌딩',
    type: '팀빌딩',
    destination: '제주도',
    startDate: '2025-07-15',
    endDate: '2025-07-17',
    status: '취소',
    totalPax: 15,
    revenue: '22,000,000원',
  },
]

export const Default: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
  },
}

export const WithSorting: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    enableSorting: true,
  },
}

export const WithFiltering: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    enableFiltering: true,
  },
}

export const WithPagination: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    enablePagination: true,
  },
}

export const FullFeatures: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    enableSorting: true,
    enableFiltering: true,
    enablePagination: true,
  },
}

// Row click functionality is not yet implemented in DataGrid component
export const WithRowClick: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
  },
}

export const EmptyState: Story = {
  args: {
    columns: sampleColumns,
    data: [],
  },
}

export const SingleRow: Story = {
  args: {
    columns: sampleColumns,
    data: [sampleData[0]],
  },
}

export const ManyRows: Story = {
  args: {
    columns: sampleColumns,
    data: Array.from({ length: 20 }, (_, i) => ({
      ...sampleData[i % sampleData.length],
      id: `${i + 1}`,
    })),
    enablePagination: true,
  },
}

export const CompactColumns: Story = {
  args: {
    columns: [
      { accessorKey: 'teamName', header: '팀명', size: 200 },
      { accessorKey: 'destination', header: '목적지', size: 120 },
      { accessorKey: 'status', header: '상태', size: 100 },
    ],
    data: sampleData,
  },
}
