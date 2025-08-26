/**
 * Notification service stub
 * To be implemented in the Notifications module
 */

export async function sendApprovalResult(payload: {
  approvalId: string;
  result: 'approved' | 'rejected';
  to: string[];
  message: string;
}) {
  // eslint-disable-next-line no-console
  console.log('[NOTIFY]', payload);
  // TODO: Implement actual notification logic
  // - Email notifications
  // - Push notifications
  // - In-app notifications
}