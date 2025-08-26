#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface GrafanaDashboard {
  dashboard: {
    id?: number;
    uid?: string;
    title: string;
    version: number;
    [key: string]: any;
  };
}

const DASHBOARD_PATH = path.join(__dirname, '../monitoring/grafana/provisioning/dashboards/flight.json');
const FIXED_UID = 'flight-api-monitoring-v1';

function loadDashboard(): GrafanaDashboard {
  try {
    const content = fs.readFileSync(DASHBOARD_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load dashboard: ${error}`);
    process.exit(1);
  }
}

function saveDashboard(dashboard: GrafanaDashboard): void {
  try {
    const content = JSON.stringify(dashboard, null, 2);
    fs.writeFileSync(DASHBOARD_PATH, content, 'utf8');
    console.log(`✅ Dashboard saved to ${DASHBOARD_PATH}`);
  } catch (error) {
    console.error(`Failed to save dashboard: ${error}`);
    process.exit(1);
  }
}

function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Could not get git commit hash, using timestamp');
    return Date.now().toString(36);
  }
}

function bumpVersion(): void {
  console.log('🔧 Bumping Grafana dashboard version...');
  
  const dashboard = loadDashboard();
  const currentVersion = dashboard.dashboard.version || 0;
  const newVersion = currentVersion + 1;
  const commitHash = getGitCommitHash();
  
  // Set fixed UID for consistency
  dashboard.dashboard.uid = FIXED_UID;
  dashboard.dashboard.version = newVersion;
  
  // Add metadata tags
  if (!dashboard.dashboard.tags) {
    dashboard.dashboard.tags = [];
  }
  
  // Remove old version tags and add new one
  dashboard.dashboard.tags = dashboard.dashboard.tags.filter(
    (tag: string) => !tag.startsWith('v') && tag !== 'auto-generated'
  );
  dashboard.dashboard.tags.push(`v${newVersion}`, 'auto-generated', `commit-${commitHash}`);
  
  // Add version annotation
  if (!dashboard.dashboard.annotations) {
    dashboard.dashboard.annotations = { list: [] };
  }
  
  dashboard.dashboard.annotations.list = dashboard.dashboard.annotations.list || [];
  dashboard.dashboard.annotations.list.push({
    builtIn: 1,
    datasource: '-- Grafana --',
    enable: true,
    hide: true,
    iconColor: 'rgba(0, 211, 255, 1)',
    name: 'Version Updates',
    type: 'dashboard'
  });
  
  // Update modification timestamp
  dashboard.dashboard.time = dashboard.dashboard.time || {};
  dashboard.dashboard.refresh = dashboard.dashboard.refresh || '30s';
  
  console.log(`📊 Dashboard: ${dashboard.dashboard.title}`);
  console.log(`🔢 Version: ${currentVersion} → ${newVersion}`);
  console.log(`🔗 UID: ${FIXED_UID}`);
  console.log(`📝 Commit: ${commitHash}`);
  
  saveDashboard(dashboard);
  
  console.log('✅ Dashboard version bump completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Commit the updated dashboard file');
  console.log('2. Restart Grafana or reload provisioned dashboards');
  console.log('3. Verify the new version appears in Grafana UI');
}

function validateDashboard(): boolean {
  console.log('🔍 Validating dashboard structure...');
  
  const dashboard = loadDashboard();
  const errors: string[] = [];
  
  if (!dashboard.dashboard) {
    errors.push('Missing dashboard object');
  }
  
  if (!dashboard.dashboard.title) {
    errors.push('Missing dashboard title');
  }
  
  if (!dashboard.dashboard.panels || !Array.isArray(dashboard.dashboard.panels)) {
    errors.push('Missing or invalid panels array');
  }
  
  if (dashboard.dashboard.panels.length === 0) {
    errors.push('Dashboard has no panels');
  }
  
  // Check for required panel types
  const panelTitles = dashboard.dashboard.panels.map((p: any) => p.title?.toLowerCase() || '');
  const hasRatePanel = panelTitles.some(title => title.includes('rate') || title.includes('request'));
  const hasLatencyPanel = panelTitles.some(title => title.includes('latency') || title.includes('response'));
  
  if (!hasRatePanel) {
    errors.push('Missing request rate panel');
  }
  
  if (!hasLatencyPanel) {
    errors.push('Missing latency panel');
  }
  
  if (errors.length > 0) {
    console.error('❌ Dashboard validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  console.log('✅ Dashboard validation passed');
  return true;
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0] || 'bump';
  
  switch (command) {
    case 'bump':
      if (!validateDashboard()) {
        process.exit(1);
      }
      bumpVersion();
      break;
      
    case 'validate':
      const isValid = validateDashboard();
      process.exit(isValid ? 0 : 1);
      break;
      
    case 'info':
      const dashboard = loadDashboard();
      console.log(`Dashboard: ${dashboard.dashboard.title}`);
      console.log(`Version: ${dashboard.dashboard.version || 0}`);
      console.log(`UID: ${dashboard.dashboard.uid || 'not set'}`);
      console.log(`Panels: ${dashboard.dashboard.panels?.length || 0}`);
      break;
      
    default:
      console.log('Usage: ts-node bump_dashboard_version.ts [bump|validate|info]');
      console.log('  bump     - Increment version and update metadata');
      console.log('  validate - Check dashboard structure');
      console.log('  info     - Show current dashboard info');
      break;
  }
}

if (require.main === module) {
  main();
}