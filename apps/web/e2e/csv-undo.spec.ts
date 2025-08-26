import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('CSV upload -> calendar display -> Undo 시나리오', async ({ page }) => {
  // 1. 로그인
  await page.goto('/login');
  
  await page.fill('input[type="email"]', 'admin@entrip.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/reservations');
  
  // 2. 테스트용 CSV 파일 생성
  const csvContent = `고객명,전화번호,목적지,출발일,도착일,인원,상태
김철수,010-1111-2222,제주도,2025-08-01,2025-08-05,2,pending
이영희,010-3333-4444,부산,2025-08-10,2025-08-12,4,confirmed
박민수,010-5555-6666,강릉,2025-08-15,2025-08-17,3,pending
최지현,010-7777-8888,여수,2025-08-20,2025-08-23,2,confirmed
정태우,010-9999-0000,경주,2025-08-25,2025-08-28,5,pending`;

  const csvPath = path.join(process.cwd(), 'test-bookings.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  
  // 3. CSV Import 버튼 클릭 및 파일 업로드
  const fileInput = page.locator('input#csv-import');
  await fileInput.setInputFiles(csvPath);
  
  // 업로드 성공 확인 (콘솔 로그)
  page.on('console', msg => {
    if (msg.text().includes('개의 예약이 생성되었습니다')) {
      console.log('✅ CSV Upload 성공:', msg.text());
    }
  });
  
  await page.waitForTimeout(2000);
  
  // 4. 캘린더에서 새 예약 확인
  await page.click('text=주별 캘린더');
  await page.waitForTimeout(1000);
  
  // 김철수 예약이 표시되는지 확인
  const kimBooking = await page.locator('text=김철수').isVisible();
  expect(kimBooking).toBeTruthy();
  
  // 5. 리스트 뷰로 전환
  await page.click('text=리스트 뷰');
  await page.waitForTimeout(1000);
  
  // 6. 전체 선택
  const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
  await selectAllCheckbox.click();
  
  // Bulk Action Bar가 나타나는지 확인
  await expect(page.locator('text=개 선택됨')).toBeVisible();
  
  // 7. Bulk 삭제 실행
  await page.click('text=선택 삭제');
  
  // 8. Undo 토스트 확인
  const undoToast = page.locator('text=개 항목이 삭제되었습니다');
  await expect(undoToast).toBeVisible({ timeout: 5000 });
  
  // 9. Undo 버튼 클릭
  await page.click('text=실행 취소');
  
  // 10. 복원 성공 메시지 확인
  const restoreToast = page.locator('text=개 항목이 복원되었습니다');
  await expect(restoreToast).toBeVisible({ timeout: 5000 });
  
  // 11. 복원된 데이터 확인
  await page.waitForTimeout(2000);
  const restoredBooking = await page.locator('text=김철수').isVisible();
  expect(restoredBooking).toBeTruthy();
  
  // 테스트 파일 정리
  fs.unlinkSync(csvPath);
  
  console.log('✅ CSV-Undo E2E 테스트 완료');
});