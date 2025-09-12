'use client';

import React, { useState } from 'react';
import { Icon, Button } from '@entrip/ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'active' | 'inactive';
  joinDate: Date;
}

interface TeamType {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export default function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState<'employees' | 'teamTypes'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Employee | TeamType | null>(null);

  // 더미 직원 데이터
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: '김철수',
      email: 'kim.cs@entrip.com',
      department: '영업팀',
      role: '팀장',
      status: 'active',
      joinDate: new Date('2020-03-15')
    },
    {
      id: '2',
      name: '이영희',
      email: 'lee.yh@entrip.com',
      department: '기획팀',
      role: '과장',
      status: 'active',
      joinDate: new Date('2021-06-20')
    },
    {
      id: '3',
      name: '박민수',
      email: 'park.ms@entrip.com',
      department: '영업팀',
      role: '대리',
      status: 'active',
      joinDate: new Date('2022-09-10')
    },
    {
      id: '4',
      name: '정수현',
      email: 'jung.sh@entrip.com',
      department: '운영팀',
      role: '사원',
      status: 'active',
      joinDate: new Date('2023-01-05')
    }
  ]);

  // 더미 팀 타입 데이터
  const [teamTypes, setTeamTypes] = useState<TeamType[]>([
    {
      id: '1',
      name: '골프',
      code: 'GOLF',
      description: '골프 관련 여행 상품',
      isActive: true
    },
    {
      id: '2',
      name: '인센티브',
      code: 'INCENTIVE',
      description: '기업 인센티브 여행',
      isActive: true
    },
    {
      id: '3',
      name: '허니문',
      code: 'HONEYMOON',
      description: '신혼여행 패키지',
      isActive: true
    },
    {
      id: '4',
      name: '에어텔',
      code: 'AIRTEL',
      description: '항공+호텔 패키지',
      isActive: true
    },
    {
      id: '5',
      name: 'FIT',
      code: 'FIT',
      description: '개별 자유여행',
      isActive: true
    },
    {
      id: '6',
      name: '단체',
      code: 'GROUP',
      description: '단체 관광 상품',
      isActive: true
    },
    {
      id: '7',
      name: 'MICE',
      code: 'MICE',
      description: '국제회의 및 전시 관련',
      isActive: true
    }
  ]);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeamTypes = teamTypes.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = () => {
    alert('직원 추가 기능은 추후 구현 예정입니다.');
    setShowAddModal(false);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedItem(employee);
    setShowEditModal(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('정말로 이 직원을 삭제하시겠습니까?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  const handleAddTeamType = () => {
    alert('팀 타입 추가 기능은 추후 구현 예정입니다.');
    setShowAddModal(false);
  };

  const handleEditTeamType = (teamType: TeamType) => {
    setSelectedItem(teamType);
    setShowEditModal(true);
  };

  const handleToggleTeamType = (id: string) => {
    setTeamTypes(prev =>
      prev.map(type =>
        type.id === id ? { ...type, isActive: !type.isActive } : type
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">맞춤설정</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon 
                icon="ph:magnifying-glass" 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
              />
              <input
                type="text"
                placeholder={activeTab === 'employees' ? '직원 검색...' : '팀 타입 검색...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-primary text-white hover:bg-brand-hover"
            >
              <Icon icon="ph:plus" className="w-4 h-4 mr-2" />
              {activeTab === 'employees' ? '직원 추가' : '팀 타입 추가'}
            </Button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 border-b-2 font-medium transition-colors ${
              activeTab === 'employees'
                ? 'text-brand-primary border-brand-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            직원 관리
          </button>
          <button
            onClick={() => setActiveTab('teamTypes')}
            className={`pb-3 border-b-2 font-medium transition-colors ${
              activeTab === 'teamTypes'
                ? 'text-brand-primary border-brand-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            팀 타입 관리
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'employees' ? (
          <div className="bg-white rounded-lg shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직급
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입사일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {employee.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(employee.joinDate, 'yyyy-MM-dd', { locale: ko })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeamTypes.map((type) => (
              <div
                key={type.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{type.code}</p>
                  </div>
                  <button
                    onClick={() => handleToggleTeamType(type.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      type.isActive ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        type.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      type.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {type.isActive ? '활성' : '비활성'}
                  </span>
                  <button
                    onClick={() => handleEditTeamType(type)}
                    className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    편집
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">
              {activeTab === 'employees' ? '직원 정보 수정' : '팀 타입 수정'}
            </h2>
            <p className="text-gray-600 mb-4">
              수정 기능은 추후 구현 예정입니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}