'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '../primitives/Icon';
import type { NewTeamPayload } from '@entrip/shared';
import { BookingStatus } from '@entrip/shared';

interface NewTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewTeamPayload) => void;
  selectedDate?: string;
}

export const NewTeamModal: React.FC<NewTeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate
}) => {
  const [showFlight, setShowFlight] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  
  const [formData, setFormData] = useState({
    // 일정 정보
    teamCode: '',
    teamName: '',
    departureDate: selectedDate || '',
    returnDate: '',
    destination: '',
    nights: 0,
    days: 0,
    
    // 상품 정보
    productType: 'package',
    airline: '',
    flightDepartureTime: '',
    flightArrivalTime: '',
    hotel: '',
    hotelCheckIn: '',
    hotelCheckOut: '',
    roomType: 'twin',
    mealType: '조식',
    vehicleType: '',
    vehicleCapacity: 0,
    
    // 인원 정보
    adultCount: 0,
    childCount: 0,
    infantCount: 0,
    totalCount: 0,
    
    // 금액 정보 - 수입
    adultPrice: 0,
    childPrice: 0,
    totalPrice: 0,
    deposit: 0,
    balance: 0,
    
    // 금액 정보 - 지출
    airCost: 0,
    hotelCost: 0,
    transportCost: 0,
    mealCost: 0,
    tourCost: 0,
    insuranceCost: 0,
    otherCost: 0,
    totalCost: 0,
    netProfit: 0,
    
    // 고객 정보
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCompany: '',
    customerBirthDate: '',
    customerGender: '',
    customerAddress: '',
    customerNotes: '',
    
    // 담당자 정보
    managerId: '1',
    managerName: '',
    
    // 상태 및 메모
    status: BookingStatus.PENDING,
    memo: ''
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, departureDate: selectedDate, hotelCheckIn: selectedDate }));
    }
  }, [selectedDate]);

  // 박수/일수 자동 계산 및 호텔 체크인 날짜 동기화
  useEffect(() => {
    if (formData.departureDate && formData.returnDate) {
      const departure = new Date(formData.departureDate);
      const returnDate = new Date(formData.returnDate);
      const diffTime = Math.abs(returnDate.getTime() - departure.getTime());
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData(prev => ({ 
        ...prev, 
        nights, 
        days: nights + 1,
        hotelCheckIn: formData.departureDate,
        hotelCheckOut: formData.returnDate
      }));
    }
  }, [formData.departureDate, formData.returnDate]);

  // 총 인원 및 금액 자동 계산
  useEffect(() => {
    const totalCount = formData.adultCount + formData.childCount + formData.infantCount;
    const totalPrice = (formData.adultCount * formData.adultPrice) + (formData.childCount * formData.childPrice);
    const balance = totalPrice - formData.deposit;
    
    setFormData(prev => ({ 
      ...prev, 
      totalCount,
      totalPrice,
      balance
    }));
  }, [formData.adultCount, formData.childCount, formData.infantCount, formData.adultPrice, formData.childPrice, formData.deposit]);

  // 총 지출 및 순이익 자동 계산
  useEffect(() => {
    const totalCost = formData.airCost + formData.hotelCost + formData.transportCost + 
                      formData.mealCost + formData.tourCost + formData.insuranceCost + formData.otherCost;
    const netProfit = formData.totalPrice - totalCost;
    
    setFormData(prev => ({ 
      ...prev, 
      totalCost,
      netProfit
    }));
  }, [formData.airCost, formData.hotelCost, formData.transportCost, formData.mealCost, 
      formData.tourCost, formData.insuranceCost, formData.otherCost, formData.totalPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 ml-2">신규 팀 등록</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="ph:x-bold" className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* 좌측: 담당자/일정/상품 정보 */}
            <div className="space-y-6">
              {/* 담당자 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:user-circle-bold" className="w-5 h-5 text-indigo-600" />
                  담당자 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 ID
                    </label>
                    <input
                      id="managerId"
                      type="text"
                      value={formData.managerId}
                      onChange={(e) => setFormData({...formData, managerId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      readOnly
                    />
                  </div>
                  <div>
                    <label htmlFor="managerName" className="block text-sm font-medium text-gray-700 mb-1">
                      담당자명
                    </label>
                    <input
                      id="managerName"
                      type="text"
                      value={formData.managerName}
                      onChange={(e) => setFormData({...formData, managerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="담당자 이름"
                    />
                  </div>
                </div>
              </div>
              
              {/* 일정 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:calendar-bold" className="w-5 h-5 text-blue-600" />
                  일정 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="teamCode" className="block text-sm font-medium text-gray-700 mb-1">
                      팀 코드 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="teamCode"
                      type="text"
                      value={formData.teamCode}
                      onChange={(e) => setFormData({...formData, teamCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                      팀 명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={formData.teamName}
                      onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700 mb-1">
                      출발일 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="departureDate"
                        type="date"
                        value={formData.departureDate}
                        onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                      >
                        <Icon icon="ph:calendar-bold" className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700 mb-1">
                      도착일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="returnDate"
                      type="date"
                      value={formData.returnDate}
                      onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                      여행지 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="destination"
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="예: 제주도, 하와이, 유럽"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="nights" className="block text-sm font-medium text-gray-700 mb-1">박</label>
                    <input
                      id="nights"
                      type="number"
                      value={formData.nights}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">일</label>
                    <input
                      id="days"
                      type="number"
                      value={formData.days}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* 상품 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:package-bold" className="w-5 h-5 text-green-600" />
                  상품 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="productType" className="block text-sm font-medium text-gray-700 mb-1">상품 타입</label>
                    <select
                      id="productType"
                      value={formData.productType}
                      onChange={(e) => setFormData({...formData, productType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      <option value="package">패키지</option>
                      <option value="fit">자유여행</option>
                      <option value="group">단체여행</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">항공 정보</label>
                      <button
                        type="button"
                        onClick={() => setShowFlight(!showFlight)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {showFlight ? '제거' : '추가'}
                      </button>
                    </div>
                    {showFlight && (
                      <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-md">
                        <div>
                          <label htmlFor="airline" className="block text-sm font-medium text-gray-700 mb-1">항공사</label>
                          <input
                            id="airline"
                            type="text"
                            value={formData.airline}
                            onChange={(e) => setFormData({...formData, airline: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="예: 대한항공"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="flightDepartureTime" className="block text-sm font-medium text-gray-700 mb-1">출발 시간</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="시"
                                value={formData.flightDepartureTime ? formData.flightDepartureTime.split(':')[0] : ''}
                                onChange={(e) => {
                                  const hour = e.target.value.padStart(2, '0');
                                  const minute = formData.flightDepartureTime ? formData.flightDepartureTime.split(':')[1] : '00';
                                  setFormData({...formData, flightDepartureTime: `${hour}:${minute}`});
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="flex items-center">:</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="분"
                                value={formData.flightDepartureTime ? formData.flightDepartureTime.split(':')[1] : ''}
                                onChange={(e) => {
                                  const hour = formData.flightDepartureTime ? formData.flightDepartureTime.split(':')[0] : '00';
                                  const minute = e.target.value.padStart(2, '0');
                                  setFormData({...formData, flightDepartureTime: `${hour}:${minute}`});
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="flightArrivalTime" className="block text-sm font-medium text-gray-700 mb-1">도착 시간</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="시"
                                value={formData.flightArrivalTime ? formData.flightArrivalTime.split(':')[0] : ''}
                                onChange={(e) => {
                                  const hour = e.target.value.padStart(2, '0');
                                  const minute = formData.flightArrivalTime ? formData.flightArrivalTime.split(':')[1] : '00';
                                  setFormData({...formData, flightArrivalTime: `${hour}:${minute}`});
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="flex items-center">:</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="분"
                                value={formData.flightArrivalTime ? formData.flightArrivalTime.split(':')[1] : ''}
                                onChange={(e) => {
                                  const hour = formData.flightArrivalTime ? formData.flightArrivalTime.split(':')[0] : '00';
                                  const minute = e.target.value.padStart(2, '0');
                                  setFormData({...formData, flightArrivalTime: `${hour}:${minute}`});
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="hotel" className="block text-sm font-medium text-gray-700 mb-1">호텔</label>
                    <input
                      id="hotel"
                      type="text"
                      value={formData.hotel}
                      onChange={(e) => setFormData({...formData, hotel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="roomType" className="block text-sm font-medium text-gray-700 mb-1">객실 타입</label>
                    <select
                      id="roomType"
                      value={formData.roomType}
                      onChange={(e) => setFormData({...formData, roomType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      <option value="twin">트윈</option>
                      <option value="double">더블</option>
                      <option value="triple">트리플</option>
                      <option value="suite">스위트</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="mealType" className="block text-sm font-medium text-gray-700 mb-1">식사</label>
                    <select
                      id="mealType"
                      value={formData.mealType}
                      onChange={(e) => setFormData({...formData, mealType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      <option value="조식">조식</option>
                      <option value="중식">중식</option>
                      <option value="석식">석식</option>
                      <option value="조중석">조중석</option>
                      <option value="없음">없음</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">차량 정보</label>
                      <button
                        type="button"
                        onClick={() => setShowVehicle(!showVehicle)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {showVehicle ? '제거' : '추가'}
                      </button>
                    </div>
                    {showVehicle && (
                      <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-1">차량 타입</label>
                            <select
                              id="vehicleType"
                              value={formData.vehicleType}
                              onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            >
                              <option value="">선택</option>
                              <option value="승용차">승용차</option>
                              <option value="미니밴">미니밴</option>
                              <option value="소형버스">소형버스</option>
                              <option value="대형버스">대형버스</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="vehicleCapacity" className="block text-sm font-medium text-gray-700 mb-1">탑승 인원</label>
                            <input
                              id="vehicleCapacity"
                              type="number"
                              value={formData.vehicleCapacity}
                              onChange={(e) => setFormData({...formData, vehicleCapacity: parseInt(e.target.value) || 0})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              placeholder="최대 탑승 가능 인원"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 정산/고객 정보 */}
            <div className="space-y-6">
              {/* 인원 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:users-bold" className="w-5 h-5 text-purple-600" />
                  인원 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="adultCount" className="block text-sm font-medium text-gray-700 mb-1">성인</label>
                    <input
                      id="adultCount"
                      type="number"
                      value={formData.adultCount}
                      onChange={(e) => setFormData({...formData, adultCount: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="childCount" className="block text-sm font-medium text-gray-700 mb-1">아동</label>
                    <input
                      id="childCount"
                      type="number"
                      value={formData.childCount}
                      onChange={(e) => setFormData({...formData, childCount: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="infantCount" className="block text-sm font-medium text-gray-700 mb-1">유아</label>
                    <input
                      id="infantCount"
                      type="number"
                      value={formData.infantCount}
                      onChange={(e) => setFormData({...formData, infantCount: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div className="col-span-3">
                    <label htmlFor="totalCount" className="block text-sm font-medium text-gray-700 mb-1">총 인원</label>
                    <input
                      id="totalCount"
                      type="number"
                      value={(formData.adultCount || 0) + (formData.childCount || 0) + (formData.infantCount || 0)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 수입 정보 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:currency-krw-bold" className="w-5 h-5 text-green-600" />
                  수입 정보
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="adultPrice" className="block text-sm font-medium text-gray-700 mb-1">성인 단가</label>
                      <input
                        id="adultPrice"
                        type="number"
                        value={formData.adultPrice}
                        onChange={(e) => setFormData({...formData, adultPrice: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="childPrice" className="block text-sm font-medium text-gray-700 mb-1">아동 단가</label>
                      <input
                        id="childPrice"
                        type="number"
                        value={formData.childPrice}
                        onChange={(e) => setFormData({...formData, childPrice: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700 mb-1">총 수입</label>
                    <input
                      id="totalPrice"
                      type="text"
                      value={`₩${(formData.totalPrice || 0).toLocaleString()}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold text-lg text-green-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="deposit" className="block text-sm font-medium text-gray-700 mb-1">계약금</label>
                    <input
                      id="deposit"
                      type="number"
                      value={formData.deposit}
                      onChange={(e) => setFormData({...formData, deposit: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">잔금</label>
                    <input
                      id="balance"
                      type="text"
                      value={`₩${((formData.totalPrice || 0) - (formData.deposit || 0)).toLocaleString()}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 지출 정보 */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:money-bold" className="w-5 h-5 text-red-600" />
                  지출 정보
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="airCost" className="block text-sm font-medium text-gray-700 mb-1">항공료</label>
                      <input
                        id="airCost"
                        type="number"
                        value={formData.airCost}
                        onChange={(e) => setFormData({...formData, airCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="hotelCost" className="block text-sm font-medium text-gray-700 mb-1">숙박비</label>
                      <input
                        id="hotelCost"
                        type="number"
                        value={formData.hotelCost}
                        onChange={(e) => setFormData({...formData, hotelCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="transportCost" className="block text-sm font-medium text-gray-700 mb-1">교통비</label>
                      <input
                        id="transportCost"
                        type="number"
                        value={formData.transportCost}
                        onChange={(e) => setFormData({...formData, transportCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="mealCost" className="block text-sm font-medium text-gray-700 mb-1">식사비</label>
                      <input
                        id="mealCost"
                        type="number"
                        value={formData.mealCost}
                        onChange={(e) => setFormData({...formData, mealCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="tourCost" className="block text-sm font-medium text-gray-700 mb-1">관광비</label>
                      <input
                        id="tourCost"
                        type="number"
                        value={formData.tourCost}
                        onChange={(e) => setFormData({...formData, tourCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="insuranceCost" className="block text-sm font-medium text-gray-700 mb-1">보험료</label>
                      <input
                        id="insuranceCost"
                        type="number"
                        value={formData.insuranceCost}
                        onChange={(e) => setFormData({...formData, insuranceCost: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="otherCost" className="block text-sm font-medium text-gray-700 mb-1">기타 비용</label>
                    <input
                      id="otherCost"
                      type="number"
                      value={formData.otherCost}
                      onChange={(e) => setFormData({...formData, otherCost: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      placeholder="기타 추가 비용"
                    />
                  </div>
                  <div className="border-t pt-3">
                    <label htmlFor="totalCost" className="block text-sm font-medium text-gray-700 mb-1">총 지출</label>
                    <input
                      id="totalCost"
                      type="text"
                      value={`₩${(formData.totalCost || 0).toLocaleString()}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold text-lg text-red-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="netProfit" className="block text-sm font-medium text-gray-700 mb-1">순이익</label>
                    <input
                      id="netProfit"
                      type="text"
                      value={`₩${((formData.totalPrice || 0) - (formData.totalCost || 0)).toLocaleString()}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon icon="ph:user-bold" className="w-5 h-5 text-red-600" />
                  고객 정보
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                        고객명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="customerName"
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        연락처 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="010-0000-0000"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerBirthDate" className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                      <input
                        id="customerBirthDate"
                        type="date"
                        value={formData.customerBirthDate}
                        onChange={(e) => setFormData({...formData, customerBirthDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="customerGender" className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                      <select
                        id="customerGender"
                        value={formData.customerGender}
                        onChange={(e) => setFormData({...formData, customerGender: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      >
                        <option value="">선택</option>
                        <option value="M">남성</option>
                        <option value="F">여성</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="customerCompany" className="block text-sm font-medium text-gray-700 mb-1">소속</label>
                    <input
                      id="customerCompany"
                      type="text"
                      value={formData.customerCompany}
                      onChange={(e) => setFormData({...formData, customerCompany: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                    <input
                      id="customerAddress"
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="예: 서울특별시 강남구..."
                    />
                  </div>
                  <div>
                    <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 mb-1">특이사항</label>
                    <textarea
                      id="customerNotes"
                      value={formData.customerNotes}
                      onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="알레르기, 특별 요청사항 등"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon icon="ph:note-pencil-bold" className="w-5 h-5 text-gray-600" />
              <label htmlFor="memo">메모</label>
            </h3>
            <textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => setFormData({...formData, memo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="특이사항이나 요청사항을 입력하세요..."
            />
          </div>
        </form>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
          >
            <Icon icon="ph:printer-bold" className="w-5 h-5" />
            출력
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Icon icon="ph:floppy-disk-bold" className="w-5 h-5" />
            저장
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewTeamModal;