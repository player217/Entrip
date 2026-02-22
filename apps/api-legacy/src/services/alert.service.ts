import { SchemaIssue } from './schema-guardian.service';

export interface AlertConfig {
  enabled: boolean;
  slackWebhookUrl?: string;
  emailRecipients?: string[];
  minSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  alertInterval: number; // 동일 알림 재발송 방지 (분)
}

export interface Alert {
  id: string;
  type: 'SCHEMA_MISMATCH' | 'DATABASE_CONNECTION' | 'DATA_INCONSISTENCY';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Alert Service
 * 스키마 문제 및 시스템 이상 상황 알림 서비스
 */
export class AlertService {
  private config: AlertConfig;
  private alertHistory: Map<string, Date> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  
  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: process.env.ALERTS_ENABLED === 'true',
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailRecipients: process.env.ALERT_EMAILS?.split(','),
      minSeverity: (process.env.ALERT_MIN_SEVERITY as any) || 'MEDIUM',
      alertInterval: parseInt(process.env.ALERT_INTERVAL || '60'),
      ...config
    };
  }
  
  /**
   * 스키마 문제 알림
   */
  async alertSchemaIssues(issues: SchemaIssue[]): Promise<void> {
    if (!this.config.enabled || issues.length === 0) {
      return;
    }
    
    // 심각도별 필터링
    const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const minSeverityLevel = severityOrder[this.config.minSeverity];
    
    const criticalIssues = issues.filter(
      issue => severityOrder[issue.severity] >= minSeverityLevel
    );
    
    if (criticalIssues.length === 0) {
      return;
    }
    
    const alertId = this.generateAlertId('SCHEMA', criticalIssues);
    
    // 중복 알림 방지
    if (this.shouldSkipAlert(alertId)) {
      console.log(`[Alert Service] Skipping duplicate alert: ${alertId}`);
      return;
    }
    
    const alert: Alert = {
      id: alertId,
      type: 'SCHEMA_MISMATCH',
      severity: this.getHighestSeverity(criticalIssues),
      title: `🚨 Schema Mismatch Detected: ${criticalIssues.length} issues`,
      message: this.formatSchemaIssuesMessage(criticalIssues),
      details: criticalIssues,
      timestamp: new Date(),
      resolved: false
    };
    
    await this.sendAlert(alert);
    this.recordAlert(alert);
  }
  
  /**
   * 데이터베이스 연결 문제 알림
   */
  async alertDatabaseConnection(error: Error): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    
    const alertId = this.generateAlertId('DB_CONNECTION', error.message);
    
    if (this.shouldSkipAlert(alertId)) {
      return;
    }
    
    const alert: Alert = {
      id: alertId,
      type: 'DATABASE_CONNECTION',
      severity: 'HIGH',
      title: '🔴 Database Connection Failed',
      message: `Database connection error detected: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      },
      timestamp: new Date(),
      resolved: false
    };
    
    await this.sendAlert(alert);
    this.recordAlert(alert);
  }
  
  /**
   * 데이터 일관성 문제 알림
   */
  async alertDataInconsistency(details: any): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    
    const alertId = this.generateAlertId('DATA_INCONSISTENCY', details);
    
    if (this.shouldSkipAlert(alertId)) {
      return;
    }
    
    const alert: Alert = {
      id: alertId,
      type: 'DATA_INCONSISTENCY',
      severity: 'MEDIUM',
      title: '⚠️ Data Inconsistency Detected',
      message: 'Data validation failed',
      details,
      timestamp: new Date(),
      resolved: false
    };
    
    await this.sendAlert(alert);
    this.recordAlert(alert);
  }
  
  /**
   * 문제 해결 알림
   */
  async alertResolved(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return;
    }
    
    alert.resolved = true;
    
    const resolvedAlert: Alert = {
      ...alert,
      title: `✅ Resolved: ${alert.title}`,
      message: `Previously reported issue has been resolved.\n\nOriginal: ${alert.message}`,
      timestamp: new Date(),
      resolved: true
    };
    
    await this.sendAlert(resolvedAlert);
    this.activeAlerts.delete(alertId);
  }
  
  /**
   * 실제 알림 발송
   */
  private async sendAlert(alert: Alert): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Slack 알림
    if (this.config.slackWebhookUrl) {
      promises.push(this.sendSlackAlert(alert));
    }
    
    // 이메일 알림 (구현 필요 시)
    if (this.config.emailRecipients && this.config.emailRecipients.length > 0) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    // 콘솔 로깅 (항상)
    this.logAlert(alert);
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Slack 알림 발송
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      return;
    }
    
    const color = {
      HIGH: 'danger',
      MEDIUM: 'warning',
      LOW: 'good'
    }[alert.severity];
    
    const payload = {
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Type',
            value: alert.type,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp.toISOString(),
            short: true
          },
          {
            title: 'Status',
            value: alert.resolved ? 'Resolved' : 'Active',
            short: true
          }
        ],
        footer: 'Entrip Schema Guardian',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };
    
    try {
      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error('[Alert Service] Failed to send Slack alert:', response.statusText);
      }
    } catch (error) {
      console.error('[Alert Service] Error sending Slack alert:', error);
    }
  }
  
  /**
   * 이메일 알림 발송 (안전한 임시 구현)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (process.env.NODE_ENV === 'production' && process.env.ALERT_EMAIL_ENABLED === 'true') {
      // TODO: SendGrid/AWS SES 구현
      console.error('[ALERT-EMAIL-TODO] Production email not implemented', {
        recipients: this.config.emailRecipients,
        alert: alert.title
      });
    } else {
      console.log('[ALERT-EMAIL-DEV] Email alert would be sent to:', this.config.emailRecipients);
      console.log('[ALERT-EMAIL-DEV] Alert:', alert.title, '-', alert.message);
    }
  }
  
  /**
   * 콘솔 로깅
   */
  private logAlert(alert: Alert): void {
    const emoji = alert.resolved ? '✅' : 
                  alert.severity === 'HIGH' ? '🔴' :
                  alert.severity === 'MEDIUM' ? '🟡' : '🟢';
    
    console.log(`
${emoji} [Alert Service] ${alert.title}
Type: ${alert.type}
Severity: ${alert.severity}
Message: ${alert.message}
Timestamp: ${alert.timestamp.toISOString()}
Status: ${alert.resolved ? 'Resolved' : 'Active'}
    `);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Details:', JSON.stringify(alert.details, null, 2));
    }
  }
  
  /**
   * 알림 기록
   */
  private recordAlert(alert: Alert): void {
    this.alertHistory.set(alert.id, alert.timestamp);
    if (!alert.resolved) {
      this.activeAlerts.set(alert.id, alert);
    }
  }
  
  /**
   * 중복 알림 체크
   */
  private shouldSkipAlert(alertId: string): boolean {
    const lastAlert = this.alertHistory.get(alertId);
    if (!lastAlert) {
      return false;
    }
    
    const minutesSinceLastAlert = 
      (Date.now() - lastAlert.getTime()) / (1000 * 60);
    
    return minutesSinceLastAlert < this.config.alertInterval;
  }
  
  /**
   * 알림 ID 생성
   */
  private generateAlertId(type: string, data: any): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = this.simpleHash(dataStr);
    return `${type}_${hash}`;
  }
  
  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 최고 심각도 추출
   */
  private getHighestSeverity(issues: SchemaIssue[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (issues.some(i => i.severity === 'HIGH')) return 'HIGH';
    if (issues.some(i => i.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * 스키마 이슈 메시지 포맷팅
   */
  private formatSchemaIssuesMessage(issues: SchemaIssue[]): string {
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
    const lowCount = issues.filter(i => i.severity === 'LOW').length;
    
    const lines = [
      `Schema validation detected ${issues.length} issue(s):`,
      ''
    ];
    
    if (highCount > 0) lines.push(`🔴 HIGH: ${highCount} issues`);
    if (mediumCount > 0) lines.push(`🟡 MEDIUM: ${mediumCount} issues`);
    if (lowCount > 0) lines.push(`🟢 LOW: ${lowCount} issues`);
    
    lines.push('', 'Top issues:');
    
    // 상위 3개 이슈만 표시
    issues.slice(0, 3).forEach(issue => {
      lines.push(`• [${issue.severity}] ${issue.description}`);
    });
    
    if (issues.length > 3) {
      lines.push(`... and ${issues.length - 3} more`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 활성 알림 목록 조회
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }
  
  /**
   * 알림 히스토리 조회
   */
  getAlertHistory(): Map<string, Date> {
    return new Map(this.alertHistory);
  }
}