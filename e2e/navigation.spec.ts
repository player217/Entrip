import { test, expect } from '@playwright/test'

test.describe('Dashboard to Reservations Navigation', () => {
  test('should navigate from dashboard to reservations page via sidebar', async ({ page }) => {
    // 1. 대시보드 페이지로 이동
    await page.goto('/')
    
    // 대시보드 페이지가 로드되었는지 확인
    await expect(page).toHaveTitle(/Entrip/)
    await expect(page.locator('h1')).toContainText('대시보드')
    
    // 스크린샷 캡처 - 대시보드
    await page.screenshot({ path: 'e2e/screenshots/dashboard.png', fullPage: true })
    
    // 2. 사이드바에서 예약 관리 클릭
    const sidebar = page.locator('nav')
    const reservationLink = sidebar.locator('a', { hasText: '예약 관리' })
    
    // 예약 관리 링크가 보이는지 확인
    await expect(reservationLink).toBeVisible()
    
    // 예약 관리 클릭
    await reservationLink.click()
    
    // 3. 예약 페이지로 전환되었는지 확인
    await page.waitForURL('**/reservations')
    await expect(page.locator('h1')).toContainText('예약 관리')
    
    // 탭이 표시되는지 확인
    await expect(page.locator('button', { hasText: '캘린더 뷰' })).toBeVisible()
    await expect(page.locator('button', { hasText: '리스트 뷰' })).toBeVisible()
    
    // 스크린샷 캡처 - 예약 관리 페이지
    await page.screenshot({ path: 'e2e/screenshots/reservations-calendar.png', fullPage: true })
    
    // 4. 리스트 뷰로 전환
    await page.locator('button', { hasText: '리스트 뷰' }).click()
    
    // DataGrid가 표시되는지 확인
    await expect(page.locator('table')).toBeVisible()
    
    // 스크린샷 캡처 - 리스트 뷰
    await page.screenshot({ path: 'e2e/screenshots/reservations-list.png', fullPage: true })
  })
  
  test('sidebar navigation should highlight active page', async ({ page }) => {
    // 대시보드로 이동
    await page.goto('/')
    
    // 대시보드 링크가 활성화되어 있는지 확인
    const dashboardLink = page.locator('nav a', { hasText: '대시보드' })
    await expect(dashboardLink).toHaveClass(/bg-brand-800/)
    
    // 예약 관리로 이동
    await page.locator('nav a', { hasText: '예약 관리' }).click()
    await page.waitForURL('**/reservations')
    
    // 예약 관리 링크가 활성화되어 있는지 확인
    const reservationLink = page.locator('nav a', { hasText: '예약 관리' })
    await expect(reservationLink).toHaveClass(/bg-brand-800/)
    
    // 대시보드 링크는 비활성화되어 있는지 확인
    await expect(dashboardLink).not.toHaveClass(/bg-brand-800/)
  })
})
