import { bookingTypes, dateKey, statuses, type BookingRecord, type EditorSession } from './booking-model';
import { bookingSheetBody, bookingSheetStyles } from './booking-print';

const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
const n = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const bookingPeriodIncludes = (row: BookingRecord, day: string) => dateKey(row.startDate) <= day && dateKey(row.endDate) >= day;
type Props = {
  title: string; period: { start: string; end: string }; selectedDay: string; calendarDays?: string[];
  search: string; status: string; records: BookingRecord[]; totals: Record<string, number>; passengers: number;
  loading: boolean; loadError: boolean; editor: EditorSession | null;
};
const styles = `
@media print {
  .booking-workspace[data-printable-bookings] {display:block!important;position:static!important;min-height:0!important;height:auto!important;overflow:visible!important;border:0!important;padding:0!important;box-shadow:none!important}
  .booking-workspace[data-printable-bookings] > :not(.entrip-print-only) {display:none!important}
  .booking-view-sheet {color:#172c43;font:9.5pt/1.32 "Malgun Gothic","Noto Sans CJK KR",Arial,sans-serif;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
  .booking-view-sheet .sheet-title {border-top:3px solid #27598c;border-bottom:1px solid #9cb1c1;padding:7px 0 6px;margin:0 0 9px}
  .booking-view-sheet h1 {margin:0 0 3px;font-size:18pt;font-weight:700;color:#193e61;line-height:1.25}
  .booking-view-sheet h2 {margin:9px 0 4px;font-size:11pt;font-weight:700;color:#274e6c;break-after:avoid-page}
  .booking-view-sheet p {margin:0}
  .booking-view-sheet .filter-info {display:flex;flex-wrap:wrap;gap:2px 15px}
  .booking-view-sheet .sheet-summary {border-bottom:1px solid #b9c9d5;padding-bottom:6px;display:flex;gap:3px 18px;flex-wrap:wrap}
  .booking-view-sheet table {border-collapse:collapse;table-layout:fixed;width:100%}
  .booking-view-sheet th,.booking-view-sheet td {border:1px solid #bacad7;padding:3px 5px;vertical-align:top;text-align:left;overflow-wrap:anywhere;white-space:pre-wrap}
  .booking-view-sheet th {background:#edf3f7;font-weight:600}
  .booking-view-sheet .numeric {text-align:right}
  .booking-view-sheet .secondary {display:block;color:#3e5567;font-size:8.5pt}
  .booking-view-sheet .ledger col:nth-child(1) {width:28%}
  .booking-view-sheet .ledger col:nth-child(2) {width:13%}
  .booking-view-sheet .ledger col:nth-child(3) {width:15%}
  .booking-view-sheet .ledger col:nth-child(4) {width:7%}
  .booking-view-sheet .ledger col:nth-child(5) {width:13%}
  .booking-view-sheet .ledger col:nth-child(6) {width:15%}
  .booking-view-sheet .ledger col:nth-child(7) {width:9%}
  .booking-view-sheet .ledger td {line-height:1.23}
  .booking-view-sheet .ledger-title {border:0;background:white;padding:0}
  .booking-view-sheet .ledger-title small {font-size:8.5pt;font-weight:400}
  .booking-view-sheet thead {display:table-header-group}
  .booking-view-sheet tr {break-inside:avoid-page}
  .booking-view-sheet .weekdays th {text-align:center}
  .booking-view-sheet .weekdays td {height:9mm;padding:2px 4px}
  .booking-view-sheet .weekdays .outside {background:#f4f5f7;color:#697a88}
  .booking-view-sheet .weekdays .selected-day {color:#194d78;font-weight:700}
  .booking-view-sheet .day-number {font-size:9pt;font-weight:600;line-height:1.2}
  .booking-view-sheet .day-trip {margin-top:2px;padding-left:4px;border-left:2px solid #7a9eb9;font-size:8pt;line-height:1.25}
  .booking-view-sheet .day-extra {margin-top:2px;font-size:8pt}
  .booking-view-sheet {print-color-adjust:exact;-webkit-print-color-adjust:exact}
}
`;

export default function BookingWorkspacePrint(props: Props) {
  const { title, period, selectedDay, calendarDays, search, status, records, totals, passengers, loading, loadError, editor } = props;
  if (editor) return <div className="entrip-print-only" data-booking-print="detail">
    <style>{styles + bookingSheetStyles}</style>
    <div dangerouslySetInnerHTML={{ __html: bookingSheetBody(editor.draft, editor.record?.bookingNumber, { dirty: JSON.stringify(editor.draft) !== editor.baseline, deleted: editor.remoteChange === 'deleted', record: editor.record }) }} />
  </div>;
  const bookingNumbers = new Map(records.map((row, index) => [row.id, index + 1]));
  const weeks: string[][] = [];
  for (let i = 0; calendarDays && i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7));
  return <div className="entrip-print-only" data-booking-print="view"><style>{styles}</style>
    <article className="booking-view-sheet">
      <div className="sheet-title"><h1>{title}</h1><p className="filter-info"><span>조회 기간 {period.start} ~ {period.end}</span><span>예약 상태 {status ? (statuses[status] ?? status) : '전체'}</span><span>검색어 {search || '전체'}</span>
        {calendarDays && <span>선택일 {selectedDay}</span>}</p></div>
      {loading || loadError ? <p>{loadError ? '조회 실패 · 예약 자료를 확인하지 못했습니다.' : '예약 자료를 불러오는 중입니다.'}</p> : <>
        <p className="sheet-summary"><strong>예약 {records.length}건</strong><span>총 {n.format(passengers)}명</span>
          {Object.entries(totals).map(([currency, sum]) => <span key={currency}>판매 {currency} {n.format(sum)}</span>)}<span>금액·인원은 취소 예약 제외</span></p>
        {calendarDays && <><h2>일자별 예약</h2>
          <table className="weekdays"><thead><tr>{daysOfWeek.map(d => <th key={d} scope="col">{d}</th>)}</tr></thead><tbody>{weeks.map(week => <tr key={week[0]}>{week.map(day => {
            const matches = records.filter(row => bookingPeriodIncludes(row, day));
            const outside = day < period.start || day > period.end;
            return <td key={day} className={outside ? 'outside' : undefined}><div className={day === selectedDay ? 'day-number selected-day' : 'day-number'}>{outside ? day.slice(5).replace('-', '/') : Number(day.slice(-2))}{day === selectedDay ? ' · 선택' : ''}</div>
              {matches.slice(0, 2).map(row => <div key={row.id} className="day-trip"><strong>{bookingNumbers.get(row.id)}. {row.teamName}</strong><br />{row.destination} · {row.totalPax}명 · {statuses[row.status] ?? row.status}</div>)}
              {matches.length > 2 && <p className="day-extra">외 {matches.length - 2}건 · 일정 {matches.slice(2).map(row => bookingNumbers.get(row.id)).join(', ')}</p>}</td>;
          })}</tr>)}</tbody></table></>}
        <table className="ledger"><colgroup>{Array.from({ length: 7 }, (_, i) => <col key={i} />)}</colgroup><thead><tr><th colSpan={7} className="ledger-title"><h2>{calendarDays ? '조회 기간 전체 일정' : '예약 목록'} <small>· {period.start} ~ {period.end}</small></h2></th></tr><tr>{['팀명 / 고객', '여행 기간', '목적지', '인원', '담당자', '판매금액', '상태'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{records.map(row => <tr key={row.id}><td><strong>{calendarDays && String(bookingNumbers.get(row.id)) + '. '}{row.teamName}</strong><span className="secondary">{row.customerName || '고객 미입력'} · {bookingTypes[row.type] ?? row.type}</span></td>
            <td>{dateKey(row.startDate)}<br />~ {dateKey(row.endDate)}</td><td>{row.destination}</td><td className="numeric">{n.format(row.totalPax)}명</td><td>{row.coordinator}</td>
            <td className="numeric">{row.currency} {n.format(Number(row.totalPrice ?? row.revenue ?? 0))}</td><td>{statuses[row.status] ?? row.status}</td></tr>)}
            {records.length === 0 && <tr><td colSpan={7}>{search.trim() || status ? '검색 조건에 맞는 예약이 없습니다.' : '해당 기간에 예약이 없습니다.'}</td></tr>}</tbody>
        </table></>}
    </article></div>;
}
