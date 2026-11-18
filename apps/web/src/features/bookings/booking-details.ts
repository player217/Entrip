import type { BookingRecord, Currency, DetailItem, DetailKey } from './booking-model';

type ServiceField = { key: string; label: string; type: 'text' | 'date' | 'time' | 'number' };
const field = (key: string, label: string, type: ServiceField['type'] = 'text'): ServiceField => ({ key, label, type });

export const serviceFields: Record<DetailKey, ServiceField[]> = {
  flightInfo: [field('airline', '항공사'), field('flightNo', '편명'), field('from', '출발 공항'), field('to', '도착 공항'),
    field('departureTime', '출발 시간', 'time'), field('arrivalDate', '도착일', 'date'), field('arrivalTime', '도착 시간', 'time')],
  hotelInfo: [field('checkOut', '체크아웃', 'date'), field('roomType', '객실 타입'), field('vendor', '예약 업체'), field('address', '숙소 주소'), field('phone', '숙소 연락처'), field('breakfast', '조식'), field('nights', '숙박 일수', 'number')],
  vehicleInfo: [field('vendor', '차량 업체'), field('vehicleType', '차종'), field('passengers', '탑승 인원', 'number'), field('route', '이동 구간'),
    field('pickupTime', '인수 시간', 'time'), field('returnDate', '반납일', 'date'), field('returnTime', '반납 시간', 'time'), field('duration', '이용 시간'), field('driver', '기사명'), field('phone', '기사 연락처')],
  insuranceInfo: [field('vendor', '업체명'), field('endDate', '이용 종료일', 'date')],
};
export const serviceStartLabels: Record<DetailKey, string> = { flightInfo: '출발일', hotelInfo: '체크인', vehicleInfo: '인수일', insuranceInfo: '이용 시작일' };

const scalar = (value: unknown) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const currencies = ['KRW', 'USD', 'EUR', 'JPY', 'CNY'];
const oldLabels: Record<string, string> = {
  origin: '출발지', destination: '목적지', departureTime: '출발 시간', arrivalTime: '도착 시간', departTime: '출발 시간', arriveTime: '도착 시간',
  outbound: '가는 편', inbound: '오는 편', airline: '항공사', flightNo: '편명', flightNumber: '편명', departure: '출발', arrival: '도착',
  airport: '공항', city: '도시', time: '시간', class: '좌석 등급', price: '가격', checkIn: '체크인', checkOut: '체크아웃', roomCount: '객실 수',
  pricePerNight: '1박 요금', totalNights: '숙박 일수', amenities: '편의 시설', rating: '평점', coverage: '보장 내역', medical: '의료',
  accident: '사고', baggage: '수하물', cancellation: '취소', totalPrice: '총액', validPeriod: '유효 기간', pricePerPerson: '인당 요금',
  phone: '전화', driver: '운전자', breakfast: '조식', nights: '숙박 일수', name: '이름', currency: '통화', value: '기존 정보',
};
function describe(value: unknown): string {
  if (Array.isArray(value)) return value.map(describe).join(' / ');
  if (isObject(value)) return Object.entries(value).map(([key, val]) => `${oldLabels[key] ?? key} · ${describe(val)}`).join(' / ');
  return scalar(value);
}
export function retainedFacts(item: DetailItem): { label: string; value: string }[] {
  if (!item.legacyExtra) return [];
  try {
    const extra: unknown = JSON.parse(item.legacyExtra);
    if (isObject(extra)) return Object.entries(extra).map(([key, value]) => ({ label: oldLabels[key] ?? key, value: describe(value) }));
  } catch { /* Retain malformed historic text verbatim. */ }
  return [{ label: '기존 정보', value: item.legacyExtra }];
}
export function detailFacts(key: DetailKey, item: DetailItem) {
  return [...serviceFields[key].flatMap(field => {
    const value = item.fields?.[field.key];
    return value ? [{ label: field.label, value }] : [];
  }), ...retainedFacts(item)];
}

export function readDetails(key: DetailKey, source: unknown, currency: Currency): DetailItem[] {
  if (source == null || source === '') return [];
  let inputs: unknown[] = Array.isArray(source) ? source : [source];
  if (key === 'flightInfo' && isObject(source) && (isObject(source.outbound) || isObject(source.inbound))) {
    const extra = { ...source };
    const legs: Record<string, unknown>[] = [];
    for (const [name, direction] of [['outbound','가는 편'], ['inbound','오는 편']] as const) {
      if (isObject(source[name])) { legs.push({ ...source[name], '편 구분': direction }); delete extra[name]; }
    }
    if (Object.keys(extra).length) legs[0]!['예약 공통 정보'] = extra;
    inputs = legs;
  }
  return inputs.filter(value => value != null && value !== '').map((value, index) => {
    const row = isObject(value) ? value : { value };
    // Rehydrate current rows without dropping historical keys when a sibling row is edited.
    if (typeof row.id === 'string' && typeof row.name === 'string' && typeof row.unitPrice === 'number' &&
        typeof row.quantity === 'number' && currencies.includes(String(row.currency))) {
      const { id, name, unitPrice, quantity, currency: rowCurrency, description, date, fields, unpriced, legacyExtra, ...unknown } = row;
      const retained = typeof legacyExtra === 'string' ? legacyExtra : '';
      const knownFields: Record<string, string> = {};
      if (isObject(fields)) for (const [name, value] of Object.entries(fields)) {
        if (serviceFields[key].some(f => f.key === name) && typeof value === 'string') knownFields[name] = value;
        else unknown[name] = value;
      }
      let legacy = retained;
      if (Object.keys(unknown).length) {
        let previous: unknown;
        try { previous = JSON.parse(retained || '{}'); } catch { previous = retained; }
        legacy = JSON.stringify({ ...(isObject(previous) ? previous : {value: previous}), ...unknown });
      }
      return { id, name, unitPrice, quantity, currency: rowCurrency as Currency, description: scalar(description), date: scalar(date),
        ...(Object.keys(knownFields).length ? {fields: knownFields} : {}), ...(unpriced ? {unpriced: true} : {}), ...(legacy ? {legacyExtra: legacy} : {}) };
    }
    const extra = { ...row };
    const take = (...keys: string[]) => {
      for (const name of keys) {
        const value = scalar(extra[name]);
        if (value !== '') { delete extra[name]; return value; }
      }
      return '';
    };
    const getDate = (...names: string[]) => {
      for (const name of names) {
        const value = scalar(extra[name]);
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { delete extra[name]; return value; }
      }
      return '';
    };
    const fields: Record<string, string> = {};
    if (key === 'flightInfo') for (const [point, airportName, timeName] of [['departure','from','departureTime'],['arrival','to','arrivalTime']] as const) {
      const value = extra[point];
      if (!isObject(value)) continue;
      const rest = { ...value };
      const airport = scalar(rest.airport);
      const city = scalar(rest.city);
      if (airport || city) {
        fields[airportName] = [city, airport].filter(Boolean).join(' · ');
        delete rest.airport; delete rest.city;
      }
      if (/^\d{2}:\d{2}(?::\d{2})?$/.test(scalar(rest.time))) { fields[timeName] = scalar(rest.time); delete rest.time; }
      if (Object.keys(rest).length) extra[point] = rest; else delete extra[point];
    }
    const aliases: Record<string, string[]> = {
      flightNo: ['flightNumber'], departureTime: ['departTime'], arrivalTime: ['arriveTime'], from: ['departure', 'origin'], to: ['arrival', 'destination'], arrivalDate: ['arriveDate'], vehicleType: ['type'], vendor: ['company'],
    };
    const date = getDate('date', 'checkIn', 'departDate', 'pickupDate', 'startDate');
    for (const f of serviceFields[key]) {
      const names = [f.key, ...(aliases[f.key] ?? [])];
      const name = names.find(n => {
        const value = scalar(extra[n]);
        if (f.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value);
        if (f.type === 'time') return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
        if (f.type === 'number') return /^\d+$/.test(value);
        return value !== '';
      });
      if (name) fields[f.key] = take(name);
    }
    const title = take('name', 'planName', 'hotelName') || fields.flightNo || fields.vendor || fields.airline || fields.vehicleType || '';
    const description = take('description', 'note', 'notes');
    const id = take('id') || `legacy-${key}-${index}`;
    const knownCurrency = currencies.includes(String(extra.currency)) ? take('currency') as Currency : currency;
    // A historical nightly/person price and a quoted overall price are not interchangeable.
    const price = scalar(extra.unitPrice);
    const priced = price !== '' && Number.isFinite(Number(price)) && Number(price) >= 0;
    if (priced) delete extra.unitPrice;
    const quantityKey = 'quantity' in extra ? 'quantity' : key === 'hotelInfo' ? 'roomCount' : 'count';
    const quantityText = scalar(extra[quantityKey]);
    const knownQuantity = Number.isInteger(Number(quantityText)) && Number(quantityText) > 0;
    if (knownQuantity) delete extra[quantityKey];
    return { id, name: title, description, date, quantity: knownQuantity ? Number(quantityText) : 1, unitPrice: priced ? Number(price) : 0, currency: knownCurrency,
      ...(!priced ? { unpriced: true } : {}), ...(Object.keys(fields).length ? { fields } : {}),
      ...(Object.keys(extra).length ? { legacyExtra: JSON.stringify(extra) } : {}) };
  });
}


// Linked supplier records remain owned by their original service and are never copied into editable JSON.
const linkedFields = {
  flights: { airline: '항공사', flightNumber: '편명', origin: '출발 공항', departureTime: '출발 시각', destination: '도착 공항', arrivalTime: '도착 시각',
    status: '상태', gate: '탑승구', terminal: '터미널', seatNumbers: '좌석', paxCount: '인원', confirmationNo: '확인번호', notes: '비고' },
  hotels: { hotelName: '호텔명', country: '국가', city: '도시', address: '주소', checkInDate: '체크인', checkOutDate: '체크아웃', roomType: '객실 타입',
    roomCount: '객실 수', guestCount: '투숙 인원', breakfast: '조식', status: '상태', confirmationNo: '확인번호', ratePerNight: '1박 요금', totalAmount: '총액', currency: '통화', notes: '비고' },
  vehicles: { type: '차종', pickupLocation: '인수 장소', pickupTime: '인수 시각', dropoffLocation: '반납 장소', dropoffTime: '반납 시각', licensePlate: '차량 번호',
    driverName: '기사명', driverContact: '기사 연락처', passengerCount: '탑승 인원', status: '상태', cost: '비용', currency: '통화', notes: '비고' },
};
const linkedStatus: Record<string,string> = { SCHEDULED:'예정', DELAYED:'지연', CANCELLED:'취소', BOARDING:'탑승 중', DEPARTED:'출발', ARRIVED:'도착',
  RESERVED:'예약', CONFIRMED:'확정', CHECKEDIN:'체크인', CHECKEDOUT:'체크아웃', AVAILABLE:'이용 가능', IN_USE:'이용 중', MAINTENANCE:'정비 중' };

export function relatedServiceRows(record?: BookingRecord) {
  return (['flights', 'hotels', 'vehicles'] as const).flatMap(group => (record?.[group] ?? []).map(row => {
    const facts = Object.entries(linkedFields[group]).flatMap(([key,label]) => {
      const raw = row[key];
      if (raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && !raw.length)) return [];
      let value = describe(raw);
      if (key === 'status') value = linkedStatus[value] ?? value;
      if (key === 'breakfast' && typeof raw === 'boolean') value = raw ? '포함' : '불포함';
      if (key === 'checkInDate' || key === 'checkOutDate') value = value.slice(0, 10);
      else if (/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)) value = value.replace('T',' ').replace(/:00(?:\.000)?Z$/, ' UTC').replace(/(?:\.000)?Z$/, ' UTC');
      return [{ label, value }];
    });
    return { id: String(row.id), label: {flights: '항공', hotels: '호텔', vehicles: '차량'}[group],
      title: String(row.flightNumber ?? row.hotelName ?? row.licensePlate ?? row.type ?? ''), facts };
  }));
}
