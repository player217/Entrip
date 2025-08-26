'use client'

import { useState, useEffect } from 'react'
import { DualChartCard, Card, CardHeader, CardTitle, CardContent } from '@entrip/ui'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../lib/api-client'

export default function StatsPageContent() {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'count' | 'profit'>('revenue')
  const [selectedPeriod, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [periodData, setPeriodData] = useState<any[]>([])

  // API에서 통계 데이터 가져오기
  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        setLoading(true)
        const [overviewData, periodData] = await Promise.all([
          api.get('/stats/overview'),
          api.get(`/stats/period/${selectedPeriod}`)
        ])
        
        setStatsData(overviewData)
        setPeriodData(periodData)
      } catch (error) {
        console.error('Stats data fetch error:', error)
        // 에러 시 더미 데이터 사용
        setStatsData({
          monthlyStats: [
            { month: '1월', revenue: 450000000, profit: 67500000, margin: 15, count: 25, paxCount: 150 },
            { month: '2월', revenue: 520000000, profit: 83200000, margin: 16, count: 30, paxCount: 180 },
            { month: '3월', revenue: 480000000, profit: 72000000, margin: 15, count: 28, paxCount: 165 },
            { month: '4월', revenue: 610000000, profit: 103700000, margin: 17, count: 35, paxCount: 210 },
            { month: '5월', revenue: 580000000, profit: 92800000, margin: 16, count: 32, paxCount: 195 },
            { month: '6월', revenue: 650000000, profit: 117000000, margin: 18, count: 38, paxCount: 225 },
          ],
          managerData: [
            { name: '김철수', revenue: 1250000000, profit: 180000000, count: 45, paxCount: 280 },
            { name: '이영희', revenue: 980000000, profit: 150000000, count: 38, paxCount: 235 },
            { name: '박민수', revenue: 850000000, profit: 120000000, count: 32, paxCount: 195 },
            { name: '정수현', revenue: 720000000, profit: 95000000, count: 28, paxCount: 170 },
            { name: '최지우', revenue: 490000000, profit: 65000000, count: 21, paxCount: 125 },
          ],
          totalStats: {
            totalCount: 164,
            totalRevenue: 4290000000,
            totalProfit: 610000000,
            totalPax: 1005,
            avgMargin: 14.2
          }
        })
        setPeriodData([
          { label: '1월', revenue: 450000000, profit: 67500000, margin: 15, count: 25, paxCount: 150 },
          { label: '2월', revenue: 520000000, profit: 83200000, margin: 16, count: 30, paxCount: 180 },
          { label: '3월', revenue: 480000000, profit: 72000000, margin: 15, count: 28, paxCount: 165 },
          { label: '4월', revenue: 610000000, profit: 103700000, margin: 17, count: 35, paxCount: 210 },
          { label: '5월', revenue: 580000000, profit: 92800000, margin: 16, count: 32, paxCount: 195 },
          { label: '6월', revenue: 650000000, profit: 117000000, margin: 18, count: 38, paxCount: 225 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchStatsData()
  }, [selectedPeriod])

  // 담당자별 차트 데이터 변환
  const getManagerChartData = (metric: 'revenue' | 'count' | 'profit') => {
    if (!statsData?.managerData) return []
    
    const colors = ['#0050c8', '#1a75ff', '#4d94ff', '#80b3ff', '#b3d1ff']
    
    return statsData.managerData.map((manager: any, index: number) => ({
      name: manager.name,
      value: manager[metric],
      color: colors[index] || '#b3d1ff'
    }))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">운영 현황</h1>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return `${(value / 100000000).toFixed(1)}억`
  }

  // 현재 데이터 소스 선택
  const revenueData = periodData || []
  const managerData = getManagerChartData(selectedMetric)
  const totalStats = statsData?.totalStats || {
    totalCount: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalPax: 0,
    avgMargin: 0
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">운영 현황</h1>
        <p className="text-gray-600">매출 및 담당자별 실적을 확인하세요.</p>
      </div>

      {/* 기간 선택 */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedPeriod === 'month' 
              ? 'bg-brand-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          월별
        </button>
        <button
          onClick={() => setPeriod('quarter')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedPeriod === 'quarter' 
              ? 'bg-brand-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          분기별
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedPeriod === 'year' 
              ? 'bg-brand-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          연도별
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">총 건수</h3>
          <p className="text-2xl font-semibold mt-1">{totalStats.totalCount}건</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">총 매출</h3>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalStats.totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">총 수익</h3>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalStats.totalProfit)}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">평균 수익률</h3>
          <p className="text-2xl font-semibold mt-1">{totalStats.avgMargin}%</p>
        </Card>
      </div>

      {/* 매출/수익 복합 차트 */}
      <div className="mb-6">
        <DualChartCard
          title={`${selectedPeriod === 'month' ? '월별' : selectedPeriod === 'quarter' ? '분기별' : '연도별'} 매출 및 수익률`}
          subtitle="매출과 수익률의 추이를 한눈에 확인하세요"
          data={revenueData.map((item: any) => ({
            label: item.label || item.month,
            primary: item.revenue,
            secondary: item.margin
          }))}
          primaryLabel="매출"
          secondaryLabel="수익률(%)"
          primaryColor="#0050c8"
          secondaryColor="#f59e0b"
          chartType="bar-line"
          height={350}
        />
      </div>

      {/* 담당자별 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>담당자별 실적</CardTitle>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="metric"
                  checked={selectedMetric === 'revenue'}
                  onChange={() => setSelectedMetric('revenue')}
                  className="mr-2"
                />
                <span className="text-sm">매출</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="metric"
                  checked={selectedMetric === 'count'}
                  onChange={() => setSelectedMetric('count')}
                  className="mr-2"
                />
                <span className="text-sm">건수</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="metric"
                  checked={selectedMetric === 'profit'}
                  onChange={() => setSelectedMetric('profit')}
                  className="mr-2"
                />
                <span className="text-sm">수익</span>
              </label>
            </div>
          </CardHeader>
          <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={managerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {managerData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => {
                if (selectedMetric === 'revenue' || selectedMetric === 'profit') {
                  return formatCurrency(value)
                }
                return `${value}건`
              }} />
            </PieChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {managerData.map((entry: any) => (
              <div key={entry.name} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">{entry.name}</span>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>

        {/* 담당자별 상세 테이블 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">담당자별 실적 상세</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">담당자</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">건수</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">매출</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">수익</th>
                </tr>
              </thead>
              <tbody>
                {(statsData?.managerData || []).map((manager: any) => (
                  <tr key={manager.name} className="border-b">
                    <td className="py-2 px-3 text-sm">{manager.name}</td>
                    <td className="py-2 px-3 text-sm text-right">{manager.count}건</td>
                    <td className="py-2 px-3 text-sm text-right">{formatCurrency(manager.revenue)}</td>
                    <td className="py-2 px-3 text-sm text-right">{formatCurrency(manager.profit)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 px-3 text-sm">합계</td>
                  <td className="py-2 px-3 text-sm text-right">{totalStats.totalCount}건</td>
                  <td className="py-2 px-3 text-sm text-right">{formatCurrency(totalStats.totalRevenue)}</td>
                  <td className="py-2 px-3 text-sm text-right">{formatCurrency(totalStats.totalProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}