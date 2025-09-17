/**
 * Notification service stub
 * To be implemented in the Notifications module
 */

import { logger } from '../lib/logger';

export async function sendApprovalResult(payload: {
  approvalId: string;
  result: 'approved' | 'rejected';
  to: string[];
  message: string;
}) {
  logger.info('[NOTIFY] Sending approval result notification', payload);
  // TODO: Implement actual notification logic
  // - Email notifications
  // - Push notifications
  // - In-app notifications
}