import { Router, Request, Response } from 'express';
import { getMonitoringScheduler } from '../services/monitoring-scheduler.service';
import { SchemaGuardian } from '../services/schema-guardian.service';
import { AlertService } from '../services/alert.service';

const router: Router = Router();

/**
 * 모니터링 대시보드 라우트
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  const monitoring = getMonitoringScheduler();
  const guardian = new SchemaGuardian();
  const alertService = new AlertService();
  
  try {
    // 현재 상태 수집
    const monitoringStatus = monitoring.getStatus();
    const healthResult = await guardian.checkHealth();
    const activeAlerts = alertService.getActiveAlerts();
    
    // HTML 대시보드 생성
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Entrip Schema Monitoring Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-indicator {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        .status-healthy { background: #10b981; }
        .status-unhealthy { background: #ef4444; }
        .status-warning { background: #f59e0b; }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #6b7280;
            font-size: 0.9em;
        }
        
        .metric-value {
            font-weight: bold;
            color: #111827;
            font-size: 1.1em;
        }
        
        .severity-HIGH { color: #ef4444; }
        .severity-MEDIUM { color: #f59e0b; }
        .severity-LOW { color: #10b981; }
        
        .issue-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .issue-item {
            background: #f9fafb;
            border-left: 4px solid;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
        }
        
        .issue-HIGH { border-color: #ef4444; }
        .issue-MEDIUM { border-color: #f59e0b; }
        .issue-LOW { border-color: #10b981; }
        
        .alert-item {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }
        
        .alert-title {
            font-weight: bold;
            color: #991b1b;
            margin-bottom: 5px;
        }
        
        .alert-time {
            color: #6b7280;
            font-size: 0.85em;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background: #6366f1;
            color: white;
        }
        
        .btn-primary:hover {
            background: #4f46e5;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .btn-success:hover {
            background: #059669;
        }
        
        .btn-warning {
            background: #f59e0b;
            color: white;
        }
        
        .btn-warning:hover {
            background: #d97706;
        }
        
        .timestamp {
            color: #9ca3af;
            font-size: 0.85em;
            text-align: center;
            margin-top: 30px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .stat-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #1f2937;
        }
        
        .stat-label {
            color: #6b7280;
            font-size: 0.85em;
            margin-top: 5px;
        }
    </style>
    <script>
        // 30초마다 자동 새로고침
        setTimeout(() => location.reload(), 30000);
        
        async function triggerCheck() {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Checking...';
            
            try {
                const response = await fetch('/api/monitoring/trigger', { method: 'POST' });
                if (response.ok) {
                    location.reload();
                }
            } catch (error) {
                alert('Failed to trigger check');
            }
        }
        
        async function runAutoFix() {
            if (!confirm('Run auto-fix for all fixable issues?')) return;
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Fixing...';
            
            try {
                const response = await fetch('/api/schema/health/schema/fix', { method: 'POST' });
                if (response.ok) {
                    alert('Auto-fix completed!');
                    location.reload();
                }
            } catch (error) {
                alert('Failed to run auto-fix');
            }
        }
    </script>
</head>
<body>
    <div class="container">
        <h1>🛡️ Entrip Schema Monitoring Dashboard</h1>
        
        <div class="dashboard">
            <!-- 시스템 상태 카드 -->
            <div class="card">
                <h2>
                    <span class="status-indicator ${healthResult.healthy ? 'status-healthy' : 'status-unhealthy'}"></span>
                    System Status
                </h2>
                <div class="metric">
                    <span class="metric-label">Schema Health</span>
                    <span class="metric-value ${healthResult.healthy ? 'severity-LOW' : 'severity-HIGH'}">
                        ${healthResult.healthy ? 'HEALTHY' : 'UNHEALTHY'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Monitoring Service</span>
                    <span class="metric-value ${monitoringStatus.running ? 'severity-LOW' : 'severity-HIGH'}">
                        ${monitoringStatus.running ? 'RUNNING' : 'STOPPED'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Checks</span>
                    <span class="metric-value">${monitoringStatus.checkCount}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Count</span>
                    <span class="metric-value ${monitoringStatus.errorCount > 0 ? 'severity-HIGH' : ''}">
                        ${monitoringStatus.errorCount}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Check</span>
                    <span class="metric-value">
                        ${monitoringStatus.lastCheckTime ? new Date(monitoringStatus.lastCheckTime).toLocaleString('ko-KR') : 'Never'}
                    </span>
                </div>
            </div>
            
            <!-- 이슈 통계 카드 -->
            <div class="card">
                <h2>📊 Issue Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-number severity-HIGH">${healthResult.issues.filter(i => i.severity === 'HIGH').length}</div>
                        <div class="stat-label">HIGH</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number severity-MEDIUM">${healthResult.issues.filter(i => i.severity === 'MEDIUM').length}</div>
                        <div class="stat-label">MEDIUM</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number severity-LOW">${healthResult.issues.filter(i => i.severity === 'LOW').length}</div>
                        <div class="stat-label">LOW</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${healthResult.issues.filter(i => i.autoFixable).length}</div>
                        <div class="stat-label">AUTO-FIXABLE</div>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="triggerCheck()">Run Check Now</button>
                    ${healthResult.issues.filter(i => i.autoFixable).length > 0 ? 
                      '<button class="btn btn-success" onclick="runAutoFix()">Auto Fix Issues</button>' : ''}
                </div>
            </div>
            
            <!-- 활성 알림 카드 -->
            <div class="card">
                <h2>🚨 Active Alerts (${activeAlerts.length})</h2>
                ${activeAlerts.length === 0 ? 
                    '<p style="color: #6b7280; text-align: center; padding: 20px;">No active alerts</p>' :
                    '<div class="alert-list">' + 
                    activeAlerts.map(alert => `
                        <div class="alert-item">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-time">${new Date(alert.timestamp).toLocaleString('ko-KR')}</div>
                        </div>
                    `).join('') + 
                    '</div>'
                }
            </div>
        </div>
        
        <!-- 상세 이슈 목록 -->
        ${healthResult.issues.length > 0 ? `
        <div class="card">
            <h2>📋 Detailed Issues (${healthResult.issues.length})</h2>
            <div class="issue-list">
                ${healthResult.issues.map(issue => `
                    <div class="issue-item issue-${issue.severity}">
                        <strong>[${issue.severity}] ${issue.type}</strong><br>
                        ${issue.description}<br>
                        <small>Table: ${issue.table}, Field: ${issue.field}</small><br>
                        <small>Auto-fixable: ${issue.autoFixable ? '✅ Yes' : '❌ No'}</small>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <!-- 권장사항 -->
        ${healthResult.recommendations.length > 0 ? `
        <div class="card">
            <h2>💡 Recommendations</h2>
            <ul style="padding-left: 20px; color: #4b5563;">
                ${healthResult.recommendations.map(rec => `<li style="margin: 10px 0;">${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="timestamp">
            Last updated: ${new Date().toLocaleString('ko-KR')} | Auto-refresh in 30 seconds
        </div>
    </div>
</body>
</html>
    `;
    
    res.type('text/html').send(html);
    
  } catch (error) {
    console.error('[Monitoring Dashboard] Error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: red;">Dashboard Error</h1>
          <p>Failed to load monitoring dashboard</p>
          <pre>${error}</pre>
        </body>
      </html>
    `);
  } finally {
    await guardian.cleanup();
  }
});

// 수동 검사 트리거 엔드포인트
router.post('/trigger', async (req: Request, res: Response) => {
  const monitoring = getMonitoringScheduler();
  
  try {
    const result = await monitoring.triggerCheck();
    res.json({
      status: 'success',
      result
    });
  } catch (error) {
    console.error('[Monitoring] Error triggering check:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to trigger check'
    });
  }
});

// 모니터링 상태 API
router.get('/status', (req: Request, res: Response) => {
  const monitoring = getMonitoringScheduler();
  const status = monitoring.getStatus();
  res.json(status);
});

export default router;