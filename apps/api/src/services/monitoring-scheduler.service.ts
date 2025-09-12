import { SchemaGuardian } from './schema-guardian.service';
import { AlertService } from './alert.service';

export interface MonitoringConfig {
  enabled: boolean;
  checkInterval: number; // 분 단위
  autoFix: boolean;
  alertOnIssues: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

/**
 * Monitoring Scheduler Service
 * 주기적으로 스키마 상태를 검사하고 문제 발생 시 알림/자동 수정
 */
export class MonitoringScheduler {
  private config: MonitoringConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private guardian: SchemaGuardian;
  private alertService: AlertService;
  private checkCount: number = 0;
  private errorCount: number = 0;
  private lastCheckTime: Date | null = null;
  private lastCheckResult: any = null;
  
  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: process.env.MONITORING_ENABLED !== 'false', // 기본값 true
      checkInterval: parseInt(process.env.MONITORING_INTERVAL || '30'),
      autoFix: process.env.MONITORING_AUTOFIX !== 'false', // 기본값 true
      alertOnIssues: process.env.MONITORING_ALERT !== 'false', // 기본값 true
      retryOnFailure: true,
      maxRetries: 3,
      ...config
    };
    
    this.guardian = new SchemaGuardian();
    this.alertService = new AlertService();
  }
  
  /**
   * 모니터링 시작
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[Monitoring] Monitoring is disabled');
      return;
    }
    
    if (this.isRunning) {
      console.log('[Monitoring] Already running');
      return;
    }
    
    console.log(`[Monitoring] Starting schema monitoring (interval: ${this.config.checkInterval} minutes)`);
    
    // 즉시 첫 검사 실행
    this.performCheck();
    
    // 주기적 검사 설정
    this.intervalId = setInterval(
      () => this.performCheck(),
      this.config.checkInterval * 60 * 1000
    );
    
    this.isRunning = true;
  }
  
  /**
   * 모니터링 중지
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('[Monitoring] Schema monitoring stopped');
  }
  
  /**
   * 스키마 검사 수행
   */
  private async performCheck(retryCount: number = 0): Promise<void> {
    console.log(`[Monitoring] Performing schema check #${++this.checkCount}`);
    
    try {
      // 스키마 상태 확인
      const result = await this.guardian.checkHealth();
      this.lastCheckTime = new Date();
      this.lastCheckResult = result;
      
      console.log(`[Monitoring] Check completed - Status: ${result.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      
      if (!result.healthy) {
        console.log(`[Monitoring] Found ${result.issues.length} issue(s)`);
        
        // 알림 발송
        if (this.config.alertOnIssues) {
          await this.alertService.alertSchemaIssues(result.issues);
        }
        
        // 자동 수정 시도
        if (this.config.autoFix) {
          await this.attemptAutoFix(result.issues);
        }
      } else {
        console.log('[Monitoring] Schema is healthy');
        
        // 이전에 문제가 있었다면 해결 알림
        if (this.errorCount > 0) {
          console.log('[Monitoring] Issues resolved after errors');
          this.errorCount = 0;
        }
      }
      
      // 성공 시 에러 카운트 리셋
      this.errorCount = 0;
      
    } catch (error) {
      console.error('[Monitoring] Error during check:', error);
      this.errorCount++;
      
      // 데이터베이스 연결 문제 알림
      if (error instanceof Error && error.message.includes('connect')) {
        await this.alertService.alertDatabaseConnection(error);
      }
      
      // 재시도 로직
      if (this.config.retryOnFailure && retryCount < this.config.maxRetries) {
        console.log(`[Monitoring] Retrying in 1 minute (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        setTimeout(() => this.performCheck(retryCount + 1), 60000);
      }
    }
  }
  
  /**
   * 자동 수정 시도
   */
  private async attemptAutoFix(issues: any[]): Promise<void> {
    const autoFixable = issues.filter(i => i.autoFixable);
    
    if (autoFixable.length === 0) {
      console.log('[Monitoring] No auto-fixable issues found');
      return;
    }
    
    console.log(`[Monitoring] Attempting to auto-fix ${autoFixable.length} issue(s)`);
    
    try {
      const fixResult = await this.guardian.autoFix(autoFixable);
      
      console.log(`[Monitoring] Auto-fix results:`);
      console.log(`  - Fixed: ${fixResult.fixed.length}`);
      console.log(`  - Failed: ${fixResult.failed.length}`);
      
      if (fixResult.fixed.length > 0) {
        // 수정 후 재검사
        const recheck = await this.guardian.checkHealth();
        
        if (recheck.healthy) {
          console.log('[Monitoring] All issues resolved after auto-fix');
          
          // 해결 알림
          if (this.config.alertOnIssues) {
            // 기존 알림들을 resolved로 표시
            const activeAlerts = this.alertService.getActiveAlerts();
            for (const alert of activeAlerts) {
              if (alert.type === 'SCHEMA_MISMATCH') {
                await this.alertService.alertResolved(alert.id);
              }
            }
          }
        } else {
          console.log(`[Monitoring] ${recheck.issues.length} issue(s) remain after auto-fix`);
        }
      }
    } catch (error) {
      console.error('[Monitoring] Error during auto-fix:', error);
    }
  }
  
  /**
   * 모니터링 상태 조회
   */
  getStatus(): {
    running: boolean;
    checkCount: number;
    errorCount: number;
    lastCheckTime: Date | null;
    lastCheckResult: any;
    config: MonitoringConfig;
  } {
    return {
      running: this.isRunning,
      checkCount: this.checkCount,
      errorCount: this.errorCount,
      lastCheckTime: this.lastCheckTime,
      lastCheckResult: this.lastCheckResult,
      config: this.config
    };
  }
  
  /**
   * 수동 검사 트리거
   */
  async triggerCheck(): Promise<any> {
    console.log('[Monitoring] Manual check triggered');
    await this.performCheck();
    return this.lastCheckResult;
  }
}

// 싱글톤 인스턴스
let monitoringInstance: MonitoringScheduler | null = null;

export function getMonitoringScheduler(): MonitoringScheduler {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringScheduler();
  }
  return monitoringInstance;
}