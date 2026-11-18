'use client';
import printStyles from '@/components/pages/records-print.module.css';
import { MessengerWorkspace } from '@/components/messenger/MessengerWorkspace';
export default function ChatPage() { return <div className={`h-full min-h-[480px] ${printStyles.chatPage}`}><MessengerWorkspace /></div>; }
