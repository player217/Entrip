import { apiClient } from './unified-api-client';

/**
 * 마이그레이션 어댑터
 * 기존 코드의 호환성을 유지하면서 점진적 마이그레이션을 지원합니다.
 */

// 기존 apiClient 인터페이스 유지
const axiosInst = apiClient.getAxiosInstance();
export const legacyApiClient = {
  // axios 인스턴스 호환
  request: axiosInst.request.bind(axiosInst),
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  
  // 기존 메서드 호환성
  interceptors: axiosInst.interceptors,
  defaults: axiosInst.defaults,
};

// 기존 axiosInstance 대체
export const axiosInstance = axiosInst;

// 기존 api 대체 - 필요한 메서드만 노출
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
};

// 타입 호환성
export type { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse,
  AxiosError
} from 'axios';