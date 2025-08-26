'use client';

import React, { useState } from 'react';
import { FieldBase } from './FieldBase';
import { InputText } from './InputText';
import { InputSelectV2 } from './InputSelectV2';
import { InputNumberV2 } from './InputNumberV2';
import { TextAreaV2 } from './TextAreaV2';

export function DemoPage() {
  const [formData, setFormData] = useState({
    teamName: '',
    teamType: '',
    pax: 1,
    memo: ''
  });

  const teamTypeOptions = [
    { value: 'GOLF', label: '골프 투어' },
    { value: 'INCENTIVE', label: '인센티브 여행' },
    { value: 'HONEYMOON', label: '허니문' },
    { value: 'MICE', label: 'MICE' }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900">스타일리시한 Input Components V2</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normal State */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">기본 상태</h3>
          <div className="space-y-4">
            <FieldBase label="팀명" id="team1">
              <InputText
                id="team1"
                placeholder="팀명을 입력하세요"
                value={formData.teamName}
                onChange={(e) => setFormData({...formData, teamName: e.target.value})}
              />
            </FieldBase>
            
            <FieldBase label="팀 타입" id="type1">
              <InputSelectV2
                options={teamTypeOptions}
                placeholder="팀 타입을 선택하세요"
                value={formData.teamType}
                onChange={(value) => setFormData({...formData, teamType: value})}
              />
            </FieldBase>
            
            <FieldBase label="인원수" id="pax1">
              <InputNumberV2
                id="pax1"
                min={1}
                max={50}
                value={formData.pax}
                onChange={(e) => setFormData({...formData, pax: Number(e.target.value)})}
              />
            </FieldBase>
            
            <FieldBase label="메모" id="memo1" helperText="500자 이내로 작성해주세요">
              <TextAreaV2
                id="memo1"
                placeholder="추가 요청사항을 입력하세요"
                value={formData.memo}
                onChange={(e) => setFormData({...formData, memo: e.target.value})}
                showCharCount
                maxCharCount={500}
              />
            </FieldBase>
          </div>
        </div>

        {/* Success State */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">성공 상태</h3>
          <div className="space-y-4">
            <FieldBase label="팀명" id="team2">
              <InputText
                id="team2"
                value="즐거운 제주도 여행팀"
                success
                readOnly
              />
            </FieldBase>
            
            <FieldBase label="팀 타입" id="type2">
              <InputSelectV2
                options={teamTypeOptions}
                value="GOLF"
                success
              />
            </FieldBase>
            
            <FieldBase label="인원수" id="pax2">
              <InputNumberV2
                id="pax2"
                value={20}
                success
                showControls={false}
              />
            </FieldBase>
            
            <FieldBase label="메모" id="memo2">
              <TextAreaV2
                id="memo2"
                value="골프백은 별도 차량으로 운송 부탁드립니다."
                success
                showCharCount
                maxCharCount={500}
              />
            </FieldBase>
          </div>
        </div>

        {/* Error State */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">에러 상태</h3>
          <div className="space-y-4">
            <FieldBase label="팀명" id="team3" error="팀명은 필수 입력 항목입니다">
              <InputText
                id="team3"
                placeholder="팀명을 입력하세요"
                error
              />
            </FieldBase>
            
            <FieldBase label="팀 타입" id="type3" error="팀 타입을 선택해주세요">
              <InputSelectV2
                options={teamTypeOptions}
                placeholder="팀 타입을 선택하세요"
                error
              />
            </FieldBase>
            
            <FieldBase label="인원수" id="pax3" error="인원수는 1명 이상이어야 합니다">
              <InputNumberV2
                id="pax3"
                value={0}
                error
                min={1}
              />
            </FieldBase>
            
            <FieldBase label="메모" id="memo3" error="메모는 500자를 초과할 수 없습니다">
              <TextAreaV2
                id="memo3"
                value={"긴 텍스트...".repeat(100)}
                error
                showCharCount
                maxCharCount={500}
              />
            </FieldBase>
          </div>
        </div>

        {/* Disabled State */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">비활성 상태</h3>
          <div className="space-y-4">
            <FieldBase label="팀명" id="team4">
              <InputText
                id="team4"
                value="수정 불가"
                disabled
              />
            </FieldBase>
            
            <FieldBase label="팀 타입" id="type4">
              <InputSelectV2
                options={teamTypeOptions}
                value="MICE"
                disabled
              />
            </FieldBase>
            
            <FieldBase label="인원수" id="pax4">
              <InputNumberV2
                id="pax4"
                value={30}
                disabled
              />
            </FieldBase>
            
            <FieldBase label="메모" id="memo4">
              <TextAreaV2
                id="memo4"
                value="비활성화된 메모 필드입니다."
                disabled
              />
            </FieldBase>
          </div>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">향상된 기능들</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium mb-2">Radix UI Select</h4>
            <p className="text-sm text-gray-600 mb-3">완벽한 스타일링과 애니메이션</p>
            <InputSelectV2
              options={[
                { value: '1', label: '✈️ 항공권 포함' },
                { value: '2', label: '🏨 호텔 포함' },
                { value: '3', label: '🚌 차량 포함' },
                { value: '4', label: '🎫 입장권 포함' }
              ]}
              placeholder="옵션을 선택하세요"
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Number with Controls</h4>
            <p className="text-sm text-gray-600 mb-3">마우스 홀드로 연속 증감</p>
            <InputNumberV2
              min={0}
              max={100}
              step={5}
              value={25}
            />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">TextArea with Counter</h4>
            <p className="text-sm text-gray-600 mb-3">실시간 글자 수 표시</p>
            <TextAreaV2
              placeholder="메시지를 입력하세요"
              showCharCount
              maxCharCount={100}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}