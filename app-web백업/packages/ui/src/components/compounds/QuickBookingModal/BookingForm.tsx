'use client';

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { cn } from '../../../utils';
import { quickBookingSchema, type QuickBookingFormData } from './fields/validation';
import { logger } from '@entrip/shared';
import {
  FieldBase,
  InputText,
  InputSelect,
  InputDate,
  InputTime,
  InputNumber,
  TextArea,
  Repeater,
  RepeaterItem,
  FormCard
} from './fields';
import { BookingPrintTemplate, type ReservationPrint } from './BookingPrintTemplate';
import { createRoot } from 'react-dom/client';

// Column wrapper component
const Col = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col min-w-0", className)} style={{ gap: '5px' }}>{children}</div>
);

// Section component for modern card-style grouping with Entrip theme
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-gray-200/50 rounded-lg p-2 sm:p-3 md:p-4 lg:p-5 space-y-2 sm:space-y-3 shadow-sm hover:shadow-md transition-all duration-300">
    <h3 className="text-xs sm:text-sm font-semibold text-gray-700 tracking-wide uppercase">{title}</h3>
    <div className="space-y-2 sm:space-y-3">{children}</div>
  </div>
);

interface BookingFormProps {
  onSubmit: (data: QuickBookingFormData) => Promise<void>;
  onCancel: () => void;
  selectedDate?: Date;
  initialData?: Partial<QuickBookingFormData>;
  isEditMode?: boolean;
}

export function BookingForm({ onSubmit, onCancel, selectedDate, initialData, isEditMode = false }: BookingFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<QuickBookingFormData>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: {
      teamType: initialData?.teamType || '',
      teamName: initialData?.teamName || '',
      departureDate: initialData?.departureDate || (selectedDate ? selectedDate.toISOString().split('T')[0] : ''),
      returnDate: initialData?.returnDate || '',
      origin: initialData?.origin || '',
      destination: initialData?.destination || '',
      pax: initialData?.pax || 1,
      flights: initialData?.flights || [{ airline: '', departureTime: '', arrivalTime: '' }],
      manager: initialData?.manager || '',
      vehicles: initialData?.vehicles || [],
      hotels: initialData?.hotels || [],
      settlements: initialData?.settlements || [],
      representative: initialData?.representative || '',
      contact: initialData?.contact || '',
      email: initialData?.email || '',
      memo: initialData?.memo || ''
    }
  });

  // useFieldArray hooks
  const { fields: flightFields, append: appendFlight, remove: removeFlight } = useFieldArray({
    control,
    name: 'flights'
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control,
    name: 'vehicles'
  });

  const { fields: hotelFields, append: appendHotel, remove: removeHotel } = useFieldArray({
    control,
    name: 'hotels'
  });

  const { fields: settlementFields, append: appendSettlement, remove: removeSettlement } = useFieldArray({
    control,
    name: 'settlements'
  });

  const handleFormSubmit = async (data: QuickBookingFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      logger.error('Failed to submit booking:', error instanceof Error ? error.message : String(error));
    }
  };

  const handlePrint = () => {
    // 현재 폼 데이터 수집
    const formData = watch();
    
    // 데이터를 출력용 형식으로 변환
    const printData: ReservationPrint = {
      team: {
        type: teamTypeOptions.find(opt => opt.value === formData.teamType)?.label || '',
        name: formData.teamName || ''
      },
      schedule: {
        departDate: formData.departureDate || '',
        arriveDate: formData.returnDate || ''
      },
      route: {
        from: airportOptions.find(opt => opt.value === formData.origin)?.label || '',
        to: airportOptions.find(opt => opt.value === formData.destination)?.label || ''
      },
      flights: formData.flights?.map(flight => ({
        airline: airlineOptions.find(opt => opt.value === flight.airline)?.label || '',
        flightNo: flight.flightNo,
        departDate: flight.departDate,
        departTime: flight.departureTime,
        arriveDate: flight.arriveDate,
        arriveTime: flight.arrivalTime,
        from: flight.from,
        to: flight.to,
        note: flight.note
      })) || [],
      vehicles: formData.vehicles?.map(vehicle => ({
        vendor: vehicle.vendor,
        type: vehicleTypeOptions.find(opt => opt.value === vehicle.type)?.label || '',
        count: vehicle.count,
        pickupDate: vehicle.pickupDate,
        pickupTime: vehicle.pickupTime,
        returnDate: vehicle.returnDate,
        returnTime: vehicle.returnTime,
        driver: vehicle.driver,
        phone: vehicle.phone,
        note: vehicle.note
      })) || [],
      hotels: formData.hotels?.map(hotel => ({
        name: hotel.name,
        checkIn: hotel.checkIn,
        checkOut: hotel.checkOut,
        roomType: roomTypeOptions.find(opt => opt.value === hotel.roomType)?.label || '',
        nights: hotel.nights,
        breakfast: hotel.breakfast,
        address: hotel.address,
        phone: hotel.phone,
        note: hotel.note
      })) || [],
      members: {
        total: formData.pax || 0,
        manager: managerOptions.find(opt => opt.value === formData.manager)?.label || ''
      },
      customer: {
        repName: formData.representative,
        phone: formData.contact,
        email: formData.email
      },
      settlements: formData.settlements?.map(settlement => {
        const qty = 1; // 기본값
        const unitPrice = settlement.amount || 0;
        return {
          item: `${settlement.type === 'income' ? '입금' : '출금'} - ${settlement.currency}`,
          qty: qty,
          unitPrice: unitPrice,
          amount: unitPrice,
          note: settlement.memo
        };
      }) || [],
      settlementSummary: (() => {
        const subtotal = formData.settlements?.reduce((sum, item) => {
          const qty = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          return sum + (qty * unitPrice);
        }, 0) || 0;
        const vat = Math.round(subtotal * 0.1);
        return {
          subtotal,
          vat,
          total: subtotal + vat
        };
      })(),
      memo: formData.memo,
      issueInfo: {
        createdAt: new Date().toISOString(),
        author: managerOptions.find(opt => opt.value === formData.manager)?.label || ''
      }
    };

    // 새 창 열기
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    // HTML 문서 작성
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>예약서 출력</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Noto Sans KR', sans-serif; }
          #print-root { padding: 20px; }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          .print-button-container {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .print-button {
            background: #016B9F;
            color: white;
            border: none;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .print-button:hover {
            background: #014A6E;
          }
        </style>
      </head>
      <body>
        <div class="print-button-container no-print">
          <button class="print-button" onclick="window.print()">인쇄</button>
        </div>
        <div id="print-root"></div>
      </body>
      </html>
    `);

    printWindow.document.close();

    // React 컴포넌트 렌더링
    const container = printWindow.document.getElementById('print-root');
    if (container) {
      const root = createRoot(container);
      root.render(<BookingPrintTemplate data={printData} />);
    }
  };

  // Options (동일하게 유지)
  const teamTypeOptions = [
    { value: 'GOLF', label: '골프' },
    { value: 'INCENTIVE', label: '인센티브' },
    { value: 'HONEYMOON', label: '허니문' },
    { value: 'AIRTEL', label: '에어텔' },
    { value: 'FIT', label: 'FIT' },
    { value: 'GROUP', label: '단체' },
    { value: 'MICE', label: 'MICE' }
  ];

  const airportOptions = [
    { value: 'ICN', label: '인천(ICN)' },
    { value: 'GMP', label: '김포(GMP)' },
    { value: 'PUS', label: '부산(PUS)' },
    { value: 'CJU', label: '제주(CJU)' },
    { value: 'NRT', label: '도쿄 나리타(NRT)' },
    { value: 'HND', label: '도쿄 하네다(HND)' },
    { value: 'KIX', label: '오사카 간사이(KIX)' },
    { value: 'BKK', label: '방콕(BKK)' },
    { value: 'SGN', label: '호치민(SGN)' },
    { value: 'SIN', label: '싱가포르(SIN)' },
    { value: 'HKG', label: '홍콩(HKG)' },
    { value: 'TPE', label: '타이베이(TPE)' }
  ];

  const airlineOptions = [
    { value: 'KE', label: '대한항공' },
    { value: 'OZ', label: '아시아나' },
    { value: '7C', label: '제주항공' },
    { value: 'LJ', label: '진에어' },
    { value: 'TW', label: '티웨이' },
    { value: 'ZE', label: '이스타' },
    { value: 'BX', label: '에어부산' },
    { value: 'YP', label: '에어프레미아' }
  ];

  const managerOptions = [
    { value: 'kim_cs', label: '김철수' },
    { value: 'lee_yh', label: '이영희' },
    { value: 'park_ms', label: '박민수' },
    { value: 'jung_sh', label: '정수현' }
  ];

  const vehicleTypeOptions = [
    { value: 'SEDAN', label: '세단' },
    { value: 'VAN', label: '밴' },
    { value: 'MINIBUS', label: '미니버스' },
    { value: 'BUS', label: '대형버스' }
  ];

  const roomTypeOptions = [
    { value: 'SINGLE', label: '싱글' },
    { value: 'DOUBLE', label: '더블' },
    { value: 'TWIN', label: '트윈' },
    { value: 'TRIPLE', label: '트리플' },
    { value: 'SUITE', label: '스위트' }
  ];

  const currencyOptions = [
    { value: 'KRW', label: 'KRW (원)' },
    { value: 'USD', label: 'USD (달러)' },
    { value: 'EUR', label: 'EUR (유로)' },
    { value: 'JPY', label: 'JPY (엔)' },
    { value: 'CNY', label: 'CNY (위안)' }
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full flex flex-col">
      {/* Header with title and actions - dynamic positioning */}
      <div className="bg-brand-primary text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="sm:ml-10">
            <h2 id="modal-title" className="text-lg sm:text-xl font-semibold sm:mt-1">
              {isEditMode ? '예약 수정' : '예약 입력'}
            </h2>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="ghost"
              onClick={() => alert('집행 결재 상신 기능은 추후 구현 예정입니다.')}
              className="bg-emerald-500 text-white hover:bg-emerald-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center shadow-lg hover:shadow-xl"
            >
              <Icon icon="heroicons:document-check" className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="ml-1 hidden sm:inline">집행 결재 상신</span>
              <span className="ml-1 sm:hidden">결재</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrint}
              className="bg-white text-brand-accent hover:bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center shadow-lg hover:shadow-xl"
            >
              <Icon icon="heroicons:printer" className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="ml-1">출력</span>
            </Button>
            <Button
              type="submit"
              variant="ghost"
              disabled={isSubmitting}
              className="bg-white text-brand-accent hover:bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="ph:spinner" className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <span>저장</span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="bg-white text-brand-accent hover:bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all shadow-lg hover:shadow-xl"
            >
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - Responsive columns */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 p-3 sm:p-5 lg:p-8">
          
          {/* Column 1: 팀 정보 */}
          <Col>
            <Section title="팀 정보">
              <FieldBase
                label="팀 타입"
                id="teamType"
                required
                error={errors.teamType?.message}
              >
                <Controller
                  name="teamType"
                  control={control}
                  render={({ field }) => (
                    <InputSelect
                      {...field}
                      id="teamType"
                      options={teamTypeOptions}
                      placeholder="선택하세요"
                      error={!!errors.teamType}
                    />
                  )}
                />
              </FieldBase>

              <FieldBase
                label="팀명"
                id="teamName"
                required
                error={errors.teamName?.message}
              >
                <InputText
                  {...register('teamName')}
                  id="teamName"
                  placeholder="팀명 입력"
                  error={!!errors.teamName}
                />
              </FieldBase>
            </Section>

            <Section title="일정">
              <FieldBase
                label="출발일"
                id="departureDate"
                required
                error={errors.departureDate?.message}
              >
                <InputDate
                  {...register('departureDate')}
                  id="departureDate"
                  error={!!errors.departureDate}
                />
              </FieldBase>

              <FieldBase
                label="도착일"
                id="returnDate"
                required
                error={errors.returnDate?.message}
              >
                <InputDate
                  {...register('returnDate')}
                  id="returnDate"
                  error={!!errors.returnDate}
                />
              </FieldBase>
            </Section>

            <Section title="구간">
              <FieldBase
                label="출발지"
                id="origin"
                required
                error={errors.origin?.message}
              >
                <Controller
                  name="origin"
                  control={control}
                  render={({ field }) => (
                    <InputSelect
                      {...field}
                      id="origin"
                      options={airportOptions}
                      placeholder="선택하세요"
                      error={!!errors.origin}
                    />
                  )}
                />
              </FieldBase>

              <FieldBase
                label="목적지"
                id="destination"
                required
                error={errors.destination?.message}
              >
                <Controller
                  name="destination"
                  control={control}
                  render={({ field }) => (
                    <InputSelect
                      {...field}
                      id="destination"
                      options={airportOptions}
                      placeholder="선택하세요"
                      error={!!errors.destination}
                    />
                  )}
                />
              </FieldBase>
            </Section>
          </Col>

          {/* Column 2: 상품 구성 */}
          <Col>
            
            {/* 항공편 */}
            <Section title="항공편">
              <Repeater
                title=""
                addButtonText="항공편 추가"
                onAdd={() => appendFlight({ airline: '', departureTime: '', arrivalTime: '' })}
              >
              {flightFields.map((field, index) => (
                <RepeaterItem
                  key={field.id}
                  title={`항공편 ${index + 1}`}
                  onRemove={() => removeFlight(index)}
                  removable={flightFields.length > 1}
                >
                  <FormCard>
                    <div className="space-y-2">
                      <FieldBase
                        label="항공사"
                        id={`flights.${index}.airline`}
                        error={errors.flights?.[index]?.airline?.message}
                      >
                        <Controller
                          name={`flights.${index}.airline`}
                          control={control}
                          render={({ field }) => (
                            <InputSelect
                              {...field}
                              id={`flights.${index}.airline`}
                              options={airlineOptions}
                              placeholder="선택"
                              error={!!errors.flights?.[index]?.airline}
                            />
                          )}
                        />
                      </FieldBase>

                      <div className="grid grid-cols-2 gap-3">
                        <FieldBase
                          label="출발 시간"
                          id={`flights.${index}.departureTime`}
                          error={errors.flights?.[index]?.departureTime?.message}
                        >
                          <InputTime
                            {...register(`flights.${index}.departureTime`)}
                            id={`flights.${index}.departureTime`}
                            error={!!errors.flights?.[index]?.departureTime}
                          />
                        </FieldBase>

                        <FieldBase
                          label="도착 시간"
                          id={`flights.${index}.arrivalTime`}
                          error={errors.flights?.[index]?.arrivalTime?.message}
                        >
                          <InputTime
                            {...register(`flights.${index}.arrivalTime`)}
                            id={`flights.${index}.arrivalTime`}
                            error={!!errors.flights?.[index]?.arrivalTime}
                          />
                        </FieldBase>
                      </div>
                    </div>
                  </FormCard>
                </RepeaterItem>
              ))}
              </Repeater>
            </Section>

            {/* 차량 */}
            <Section title="차량">
              <Repeater
                title=""
                addButtonText="차량 추가"
                onAdd={() => appendVehicle({ type: '', passengers: 1, duration: '', route: '' })}
              >
              {vehicleFields.map((field, index) => (
                <RepeaterItem
                  key={field.id}
                  title={`차량 ${index + 1}`}
                  onRemove={() => removeVehicle(index)}
                >
                  <FormCard>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FieldBase
                          label="차종"
                          id={`vehicles.${index}.type`}
                          error={errors.vehicles?.[index]?.type && typeof errors.vehicles[index].type === 'object' ? errors.vehicles[index].type.message : undefined}
                        >
                          <Controller
                            name={`vehicles.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <InputSelect
                                {...field}
                                id={`vehicles.${index}.type`}
                                options={vehicleTypeOptions}
                                placeholder="선택"
                                error={!!errors.vehicles?.[index]?.type}
                              />
                            )}
                          />
                        </FieldBase>

                        <FieldBase
                          label="인원"
                          id={`vehicles.${index}.passengers`}
                          error={errors.vehicles?.[index]?.passengers?.message}
                        >
                          <InputNumber
                            {...register(`vehicles.${index}.passengers`, { valueAsNumber: true })}
                            id={`vehicles.${index}.passengers`}
                            min={1}
                            placeholder="1"
                            error={!!errors.vehicles?.[index]?.passengers}
                          />
                        </FieldBase>
                      </div>

                      <FieldBase
                        label="이용 시간"
                        id={`vehicles.${index}.duration`}
                        error={errors.vehicles?.[index]?.duration?.message}
                      >
                        <InputText
                          {...register(`vehicles.${index}.duration`)}
                          id={`vehicles.${index}.duration`}
                          placeholder="예: 4시간"
                          error={!!errors.vehicles?.[index]?.duration}
                        />
                      </FieldBase>

                      <FieldBase
                        label="이동 구간"
                        id={`vehicles.${index}.route`}
                      >
                        <InputText
                          {...register(`vehicles.${index}.route`)}
                          id={`vehicles.${index}.route`}
                          placeholder="선택사항"
                        />
                      </FieldBase>
                    </div>
                  </FormCard>
                </RepeaterItem>
              ))}
              </Repeater>
            </Section>

            {/* 호텔 */}
            <Section title="호텔">
              <Repeater
                title=""
                addButtonText="호텔 추가"
                onAdd={() => appendHotel({ 
                  name: '', 
                  roomType: '', 
                  checkIn: '', 
                  checkOut: '' 
                })}
              >
              {hotelFields.map((field, index) => (
                <RepeaterItem
                  key={field.id}
                  title={`호텔 ${index + 1}`}
                  onRemove={() => removeHotel(index)}
                >
                  <FormCard>
                    <div className="space-y-2">
                      <FieldBase
                        label="호텔명"
                        id={`hotels.${index}.name`}
                        error={errors.hotels?.[index]?.name?.message}
                      >
                        <InputText
                          {...register(`hotels.${index}.name`)}
                          id={`hotels.${index}.name`}
                          placeholder="호텔명 입력"
                          error={!!errors.hotels?.[index]?.name}
                        />
                      </FieldBase>

                      <FieldBase
                        label="객실 타입"
                        id={`hotels.${index}.roomType`}
                        error={errors.hotels?.[index]?.roomType?.message}
                      >
                        <Controller
                          name={`hotels.${index}.roomType`}
                          control={control}
                          render={({ field }) => (
                            <InputSelect
                              {...field}
                              id={`hotels.${index}.roomType`}
                              options={roomTypeOptions}
                              placeholder="선택"
                              error={!!errors.hotels?.[index]?.roomType}
                            />
                          )}
                        />
                      </FieldBase>

                      <div className="grid grid-cols-2 gap-3">
                        <FieldBase
                          label="체크인"
                          id={`hotels.${index}.checkIn`}
                          error={errors.hotels?.[index]?.checkIn?.message}
                        >
                          <InputDate
                            {...register(`hotels.${index}.checkIn`)}
                            id={`hotels.${index}.checkIn`}
                            error={!!errors.hotels?.[index]?.checkIn}
                          />
                        </FieldBase>

                        <FieldBase
                          label="체크아웃"
                          id={`hotels.${index}.checkOut`}
                          error={errors.hotels?.[index]?.checkOut?.message}
                        >
                          <InputDate
                            {...register(`hotels.${index}.checkOut`)}
                            id={`hotels.${index}.checkOut`}
                            error={!!errors.hotels?.[index]?.checkOut}
                          />
                        </FieldBase>
                      </div>
                    </div>
                  </FormCard>
                </RepeaterItem>
              ))}
              </Repeater>
            </Section>
          </Col>

          {/* Column 3: 팀 구성원 정보 */}
          <Col>
            <Section title="팀 구성원">
              <FieldBase
                label="총 인원수"
                id="pax"
                required
                error={errors.pax?.message}
              >
                <InputNumber
                  {...register('pax', { valueAsNumber: true })}
                  id="pax"
                  min={1}
                  placeholder="1"
                  error={!!errors.pax}
                />
              </FieldBase>
            </Section>

            <Section title="고객 정보">
              <FieldBase label="대표자명" id="representative">
                <InputText
                  {...register('representative')}
                  id="representative"
                  placeholder="선택사항"
                />
              </FieldBase>

              <FieldBase label="연락처" id="contact">
                <InputText
                  {...register('contact')}
                  id="contact"
                  placeholder="선택사항"
                />
              </FieldBase>

              <FieldBase label="이메일" id="email" error={errors.email?.message}>
                <InputText
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="선택사항"
                  error={!!errors.email}
                />
              </FieldBase>
            </Section>

            <Section title="정산 정보">
              <Repeater
                title=""
                addButtonText="정산 추가"
                onAdd={() => appendSettlement({ 
                  type: 'income', 
                  currency: 'KRW', 
                  amount: 0,
                  exchangeRate: 1,
                  memo: '' 
                })}
              >
              {settlementFields.map((field, index) => (
                <RepeaterItem
                  key={field.id}
                  title={`정산 ${index + 1}`}
                  onRemove={() => removeSettlement(index)}
                >
                  <FormCard>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FieldBase
                          label="구분"
                          id={`settlements.${index}.type`}
                          error={errors.settlements?.[index]?.type && typeof errors.settlements[index].type === 'object' ? errors.settlements[index].type.message : undefined}
                        >
                          <Controller
                            name={`settlements.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <InputSelect
                                {...field}
                                id={`settlements.${index}.type`}
                                options={[
                                  { value: 'income', label: '입금' },
                                  { value: 'expense', label: '출금' }
                                ]}
                                error={!!errors.settlements?.[index]?.type}
                              />
                            )}
                          />
                        </FieldBase>

                        <FieldBase
                          label="통화"
                          id={`settlements.${index}.currency`}
                          error={errors.settlements?.[index]?.currency?.message}
                        >
                          <Controller
                            name={`settlements.${index}.currency`}
                            control={control}
                            render={({ field }) => (
                              <InputSelect
                                {...field}
                                id={`settlements.${index}.currency`}
                                options={currencyOptions}
                                error={!!errors.settlements?.[index]?.currency}
                              />
                            )}
                          />
                        </FieldBase>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FieldBase
                          label="금액"
                          id={`settlements.${index}.amount`}
                          error={errors.settlements?.[index]?.amount?.message}
                        >
                          <InputNumber
                            {...register(`settlements.${index}.amount`, { valueAsNumber: true })}
                            id={`settlements.${index}.amount`}
                            min={0.01}
                            step={0.01}
                            placeholder="0"
                            error={!!errors.settlements?.[index]?.amount}
                          />
                        </FieldBase>

                        <FieldBase
                          label="환율"
                          id={`settlements.${index}.exchangeRate`}
                          helperText="KRW 기준"
                        >
                          <InputNumber
                            {...register(`settlements.${index}.exchangeRate`, { valueAsNumber: true })}
                            id={`settlements.${index}.exchangeRate`}
                            min={0.01}
                            step={0.01}
                            placeholder="1"
                          />
                        </FieldBase>
                      </div>

                      <FieldBase
                        label="메모"
                        id={`settlements.${index}.memo`}
                      >
                        <InputText
                          {...register(`settlements.${index}.memo`)}
                          id={`settlements.${index}.memo`}
                          placeholder="선택사항"
                        />
                      </FieldBase>
                    </div>
                  </FormCard>
                </RepeaterItem>
              ))}
            </Repeater>
            </Section>

            <Section title="추가 메모">
              <FieldBase
                label="메모"
                id="memo"
                error={errors.memo?.message}
                helperText="500자 이내로 작성해주세요"
              >
                <TextArea
                  {...register('memo')}
                  id="memo"
                  rows={4}
                  placeholder="추가 메모사항을 입력하세요"
                  error={!!errors.memo}
                  className="resize-none"
                />
              </FieldBase>
            </Section>
            
            {/* 담당자 섹션 - 가장 우측 하단에 별도로 배치 */}
            <Section title="담당자">
              <FieldBase
                label="담당자"
                id="manager"
                required
                error={errors.manager?.message}
              >
                <Controller
                  name="manager"
                  control={control}
                  render={({ field }) => (
                    <InputSelect
                      {...field}
                      id="manager"
                      options={managerOptions}
                      placeholder="선택하세요"
                      error={!!errors.manager}
                    />
                  )}
                />
              </FieldBase>
            </Section>
          </Col>
        </div>
      </div>
    </form>
  );
}