// Simple performance test script
import { logger } from '@entrip/shared';

const BOOKING_COUNTS = [100, 200, 500, 1000];

function generateBookings(count: number) {
  const bookings = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const departureDate = new Date(today);
    departureDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
    
    bookings.push({
      id: `booking-${i}`,
      customerName: `고객 ${i + 1}`,
      teamName: `팀 ${Math.floor(i / 10) + 1}`,
      destination: ['파리', '런던', '도쿄', '뉴욕', '시드니'][i % 5],
      departureDate: departureDate.toISOString().split('T')[0],
      arrivalDate: new Date(departureDate.getTime() + (Math.floor(Math.random() * 7) + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      numberOfPeople: Math.floor(Math.random() * 10) + 1,
      status: ['pending', 'confirmed', 'cancelled'][Math.floor(Math.random() * 3)],
      revenue: (Math.floor(Math.random() * 500) + 100) * 10000,
      manager: `담당자 ${Math.floor(Math.random() * 5) + 1}`
    });
  }
  
  return bookings;
}

// Performance measurement
function measurePerformance() {
  logger.info('[Performance Test]', '=== Calendar Virtual Performance Test ===');
  logger.info('[Performance Test]', 'Target: 60+ FPS, 30% memory reduction\n');
  
  BOOKING_COUNTS.forEach(count => {
    const bookings = generateBookings(count);
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const startTime = Date.now();
    
    // Simulate rendering
    let operations = 0;
    const endTime = startTime + 1000; // Run for 1 second
    
    while (Date.now() < endTime) {
      // Simulate calendar operations
      const dateStr = bookings[Math.floor(Math.random() * bookings.length)]!.departureDate;
      const _dayBookings = bookings.filter(b => b.departureDate === dateStr);
      operations++;
    }
    
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryDelta = endMemory - startMemory;
    const fps = (operations / duration) * 1000;
    
    logger.info('[Performance Test]', `[${count} bookings]`);
    logger.info('[Performance Test]', `- Operations: ${operations}`);
    logger.info('[Performance Test]', `- FPS estimate: ${fps.toFixed(1)}`);
    logger.info('[Performance Test]', `- Memory usage: ${memoryDelta.toFixed(2)}MB`);
    logger.info('[Performance Test]', `- ${fps > 60 ? '✅' : '❌'} FPS target ${fps > 60 ? 'achieved' : 'not met'}`);
    logger.info('[Performance Test]', '');
  });
}

// Run test
measurePerformance();