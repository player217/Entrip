// packages/types/tanstack.d.ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // 모듈은 이미 ESM 타입을 export 하므로, namespace 오류는
  // `export {}` 빈 내보내기로 해결 가능
  export {};
}