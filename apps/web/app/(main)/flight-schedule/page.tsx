import { FlightScheduleSearch } from '@/components/FlightScheduleSearch';

// 페이지를 항상 동적으로 렌더링하도록 강제
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function FlightSchedulePage() {
  return (
    <div className="container mx-auto py-8">
      <FlightScheduleSearch />
    </div>
  );
}