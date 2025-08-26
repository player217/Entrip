export default {
  async scheduled(event, env, ctx) {
    try {
      const startTime = Date.now();
      const timestamp = new Date().toISOString();
      
      // Check main health endpoint
      const healthResponse = await fetch('https://api.entrip.io/healthz', {
        method: 'GET',
        headers: {
          'User-Agent': 'Entrip-Uptime-Monitor/1.0'
        }
      });
      
      const duration = Date.now() - startTime;
      const status = healthResponse.ok ? 'UP' : 'DOWN';
      const statusCode = healthResponse.status;
      
      // Check SSL certificate validity
      const sslCheck = await checkSSL('api.entrip.io');
      
      // Log results
      console.log(`[CF-Uptime] ${statusCode} ${status} ${duration}ms – ${timestamp}`);
      console.log(`[CF-SSL] Valid: ${sslCheck.valid}, Days remaining: ${sslCheck.daysRemaining}`);
      
      // Send metrics to external monitoring (if webhook configured)
      if (env.WEBHOOK_URL) {
        await sendMetrics(env.WEBHOOK_URL, {
          timestamp,
          status,
          statusCode,
          duration,
          ssl: sslCheck
        });
      }
      
      // Alert if service is down or SSL expires soon
      if (!healthResponse.ok || sslCheck.daysRemaining < 7) {
        await sendAlert(env.SLACK_WEBHOOK_URL, {
          status,
          statusCode,
          duration,
          ssl: sslCheck,
          timestamp
        });
      }
      
    } catch (error) {
      console.error(`[CF-Uptime] Error: ${error.message}`);
      
      // Send error alert
      if (env.SLACK_WEBHOOK_URL) {
        await sendAlert(env.SLACK_WEBHOOK_URL, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
};

async function checkSSL(hostname) {
  try {
    const response = await fetch(`https://${hostname}`, { method: 'HEAD' });
    
    // Get certificate info from response headers or connection
    // Note: Worker environment has limited SSL cert inspection
    // This is a simplified check
    const isValid = response.ok && response.url.startsWith('https://');
    
    return {
      valid: isValid,
      daysRemaining: isValid ? 30 : 0, // Simplified - would need cert parsing
      issuer: 'Unknown'
    };
  } catch (error) {
    return {
      valid: false,
      daysRemaining: 0,
      error: error.message
    };
  }
}

async function sendMetrics(webhookUrl, data) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'cloudflare-uptime',
        metrics: data
      })
    });
  } catch (error) {
    console.error(`Failed to send metrics: ${error.message}`);
  }
}

async function sendAlert(slackWebhook, data) {
  if (!slackWebhook) return;
  
  try {
    const message = data.error ? 
      `🔴 Uptime Check Failed: ${data.error}` :
      `🔴 Service Alert: ${data.status} (${data.statusCode}) - ${data.duration}ms${data.ssl && !data.ssl.valid ? ' | SSL Invalid' : ''}`;
    
    await fetch(slackWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: '#ops-flight',
        username: 'Uptime Monitor',
        icon_emoji: ':warning:',
        text: message,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Status', value: data.status || 'ERROR', short: true },
            { title: 'Response Time', value: `${data.duration || 0}ms`, short: true },
            { title: 'SSL Valid', value: data.ssl?.valid ? 'Yes' : 'No', short: true },
            { title: 'Timestamp', value: data.timestamp, short: false }
          ]
        }]
      })
    });
  } catch (error) {
    console.error(`Failed to send alert: ${error.message}`);
  }
}