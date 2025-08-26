import React from 'react';

export interface ReservationPrint {
  team: { type: string; name: string; };
  schedule: { departDate: string; arriveDate: string; };
  route: { from: string; to: string; };

  flights: Array<{
    airline: string; 
    flightNo?: string;
    departDate?: string; 
    departTime?: string;
    arriveDate?: string; 
    arriveTime?: string;
    from?: string; 
    to?: string; 
    note?: string;
  }>;

  vehicles: Array<{
    vendor?: string; 
    type?: string; 
    count?: number;
    pickupDate?: string; 
    pickupTime?: string;
    returnDate?: string; 
    returnTime?: string;
    driver?: string; 
    phone?: string; 
    note?: string;
  }>;

  hotels: Array<{
    name?: string; 
    checkIn?: string; 
    checkOut?: string;
    roomType?: string; 
    nights?: number; 
    breakfast?: string;
    address?: string; 
    phone?: string; 
    note?: string;
  }>;

  members: { 
    total: number; 
    manager: string; 
    list?: string[]; 
  };

  customer: { 
    repName?: string; 
    phone?: string; 
    email?: string; 
  };

  settlements: Array<{
    item: string; 
    qty?: number; 
    unitPrice?: number; 
    amount?: number; 
    note?: string;
  }>;
  
  settlementSummary?: { 
    subtotal?: number; 
    vat?: number; 
    total?: number; 
  };

  memo?: string;

  issueInfo?: { 
    createdAt?: string; 
    author?: string 
  };
}

interface BookingPrintTemplateProps {
  data: ReservationPrint;
}

export const BookingPrintTemplate: React.FC<BookingPrintTemplateProps> = ({ data }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString('ko-KR');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 14mm; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .no-print {
            display: none !important;
          }
        }
        
        .print-container {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Noto Sans KR', 'Malgun Gothic', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }
        
        .title {
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 20px;
        }
        
        .sec {
          font-size: 16px;
          font-weight: 600;
          margin: 24px 0 8px;
        }
        
        .k-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 12px;
        }
        
        .k-table th,
        .k-table td {
          border: 1px solid #d0d0d0;
          padding: 8px;
          vertical-align: top;
          word-break: keep-all;
        }
        
        .k-table th {
          background: #f3f3f3;
          text-align: center;
          font-weight: 600;
          width: 160px;
        }
        
        .k-table td {
          text-align: left;
        }
        
        .k-table td.r {
          text-align: right;
        }
        
        .k-table td.c {
          text-align: center;
        }
        
        .k-table tr.sum td {
          background: #fafafa;
          font-weight: 600;
        }
        
        .k-table tr.total td {
          background: #f0f7ff;
          font-weight: 700;
        }
        
        .empty {
          text-align: center;
          color: #888;
          padding: 20px;
        }
        
        .memo {
          min-height: 60px;
          border: 1px solid #d0d0d0;
          padding: 12px;
          white-space: pre-wrap;
          background: #fafafa;
        }
        
        .section {
          page-break-inside: avoid;
        }
      `}} />
      <div className="print-container">

      <h1 className="title">예약서</h1>

      {/* 1. 기본 정보 */}
      <div className="section">
        <table className="k-table">
          <colgroup>
            <col style={{ width: '160px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th>팀 타입</th>
              <td>{data.team.type || '-'}</td>
              <th>팀명</th>
              <td>{data.team.name || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. 일정/구간 */}
      <div className="section">
        <table className="k-table">
          <colgroup>
            <col style={{ width: '160px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th>출발일</th>
              <td>{formatDate(data.schedule.departDate)}</td>
              <th>도착일</th>
              <td>{formatDate(data.schedule.arriveDate)}</td>
            </tr>
            <tr>
              <th>출발지</th>
              <td>{data.route.from || '-'}</td>
              <th>목적지</th>
              <td>{data.route.to || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. 항공편 */}
      <div className="section">
        <h2 className="sec">항공편 내역</h2>
        <table className="k-table">
          <thead>
            <tr>
              <th>항공사</th>
              <th>편명</th>
              <th>출발(일시/장소)</th>
              <th>도착(일시/장소)</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {data.flights.length > 0 ? (
              data.flights.map((flight, idx) => (
                <tr key={idx}>
                  <td className="c">{flight.airline || '-'}</td>
                  <td className="c">{flight.flightNo || '-'}</td>
                  <td>
                    {flight.departDate && flight.departTime 
                      ? `${formatDate(flight.departDate)} ${flight.departTime}` 
                      : '-'}
                    {flight.from && <><br />{flight.from}</>}
                  </td>
                  <td>
                    {flight.arriveDate && flight.arriveTime 
                      ? `${formatDate(flight.arriveDate)} ${flight.arriveTime}` 
                      : '-'}
                    {flight.to && <><br />{flight.to}</>}
                  </td>
                  <td>{flight.note || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty">등록된 항공편 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. 차량 */}
      <div className="section">
        <h2 className="sec">차량 내역</h2>
        <table className="k-table">
          <thead>
            <tr>
              <th>업체</th>
              <th>차종/대수</th>
              <th>픽업(일시)</th>
              <th>반납(일시)</th>
              <th>기사/연락처</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {data.vehicles.length > 0 ? (
              data.vehicles.map((vehicle, idx) => (
                <tr key={idx}>
                  <td className="c">{vehicle.vendor || '-'}</td>
                  <td className="c">
                    {vehicle.type || '-'} 
                    {vehicle.count && ` (${vehicle.count}대)`}
                  </td>
                  <td>
                    {vehicle.pickupDate && vehicle.pickupTime 
                      ? `${formatDate(vehicle.pickupDate)} ${vehicle.pickupTime}` 
                      : '-'}
                  </td>
                  <td>
                    {vehicle.returnDate && vehicle.returnTime 
                      ? `${formatDate(vehicle.returnDate)} ${vehicle.returnTime}` 
                      : '-'}
                  </td>
                  <td>
                    {vehicle.driver || '-'}
                    {vehicle.phone && <><br />{vehicle.phone}</>}
                  </td>
                  <td>{vehicle.note || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">등록된 차량 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. 호텔 */}
      <div className="section">
        <h2 className="sec">호텔 내역</h2>
        <table className="k-table">
          <thead>
            <tr>
              <th>호텔명</th>
              <th>체크인/체크아웃</th>
              <th>객실유형/박수</th>
              <th>조식</th>
              <th>주소/연락처</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {data.hotels.length > 0 ? (
              data.hotels.map((hotel, idx) => (
                <tr key={idx}>
                  <td className="c">{hotel.name || '-'}</td>
                  <td className="c">
                    {hotel.checkIn && hotel.checkOut 
                      ? `${formatDate(hotel.checkIn)} ~ ${formatDate(hotel.checkOut)}` 
                      : '-'}
                  </td>
                  <td className="c">
                    {hotel.roomType || '-'}
                    {hotel.nights && ` (${hotel.nights}박)`}
                  </td>
                  <td className="c">{hotel.breakfast || '-'}</td>
                  <td>
                    {hotel.address || '-'}
                    {hotel.phone && <><br />{hotel.phone}</>}
                  </td>
                  <td>{hotel.note || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">등록된 호텔 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6~7. 팀 구성 / 고객 정보 */}
      <div className="section">
        <h2 className="sec">팀 구성 및 고객 정보</h2>
        <table className="k-table">
          <colgroup>
            <col style={{ width: '160px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th>총 인원</th>
              <td>{data.members.total || '-'}명</td>
              <th>담당자</th>
              <td>{data.members.manager || '-'}</td>
            </tr>
            <tr>
              <th>대표자명</th>
              <td>{data.customer.repName || '-'}</td>
              <th>연락처</th>
              <td>{data.customer.phone || '-'}</td>
            </tr>
            <tr>
              <th>이메일</th>
              <td colSpan={3}>{data.customer.email || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 8. 정산 */}
      <div className="section">
        <h2 className="sec">정산 정보</h2>
        <table className="k-table">
          <thead>
            <tr>
              <th>항목</th>
              <th style={{ width: '80px' }}>수량</th>
              <th style={{ width: '120px' }}>단가</th>
              <th style={{ width: '120px' }}>금액</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {data.settlements.length > 0 ? (
              <>
                {data.settlements.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.item || '-'}</td>
                    <td className="r">{formatNumber(item.qty)}</td>
                    <td className="r">{formatNumber(item.unitPrice)}</td>
                    <td className="r">{formatNumber(item.amount)}</td>
                    <td>{item.note || '-'}</td>
                  </tr>
                ))}
                <tr className="sum">
                  <td colSpan={3} className="r">소계</td>
                  <td className="r">{formatNumber(data.settlementSummary?.subtotal)}</td>
                  <td></td>
                </tr>
                <tr className="sum">
                  <td colSpan={3} className="r">부가세(10%)</td>
                  <td className="r">{formatNumber(data.settlementSummary?.vat)}</td>
                  <td></td>
                </tr>
                <tr className="sum total">
                  <td colSpan={3} className="r">합계</td>
                  <td className="r">{formatNumber(data.settlementSummary?.total)}</td>
                  <td></td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={5} className="empty">등록된 정산 내역 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 9. 메모 */}
      {data.memo && (
        <div className="section">
          <h2 className="sec">추가 메모</h2>
          <div className="memo">{data.memo}</div>
        </div>
      )}

      {/* 10. 발행 정보 */}
      <div className="section">
        <table className="k-table">
          <colgroup>
            <col style={{ width: '160px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <th>작성일</th>
              <td>{formatDate(data.issueInfo?.createdAt || new Date().toISOString())}</td>
              <th>작성자</th>
              <td>{data.issueInfo?.author || data.members.manager || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};