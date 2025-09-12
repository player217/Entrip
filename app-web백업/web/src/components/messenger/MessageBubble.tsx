'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MessageBubbleProps {
  message: any;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.senderId === localStorage.getItem('userId');

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
        {!isMe && (
          <div className="flex items-center mb-1">
            <span className="text-xs font-medium text-gray-600">
              {message.sender?.name || 'Unknown'}
            </span>
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isMe
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded ${isMe ? 'bg-blue-600' : 'bg-gray-200'} text-sm opacity-75`}>
              <div className="font-medium text-xs mb-1">
                {message.replyTo.sender?.name}
              </div>
              <div className="truncate">
                {message.replyTo.content}
              </div>
            </div>
          )}
          <p className="break-words">{message.content}</p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2">
              {message.attachments.map((attachment: any) => (
                <div key={attachment.id} className="mt-1">
                  {attachment.fileType.startsWith('image/') ? (
                    <img
                      src={attachment.thumbnailUrl || attachment.fileUrl}
                      alt={attachment.fileName}
                      className="rounded max-w-full"
                    />
                  ) : (
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-3 py-1 rounded ${
                        isMe ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm">{attachment.fileName}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`flex items-center mt-1 text-xs text-gray-500 ${isMe ? 'justify-end' : ''}`}>
          <span>
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: ko,
            })}
          </span>
          {message.isEdited && (
            <span className="ml-2">(수정됨)</span>
          )}
          {isMe && message.readBy && message.readBy.length > 1 && (
            <span className="ml-2">읽음 {message.readBy.length - 1}</span>
          )}
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
            {message.reactions.map((reaction: any) => (
              <span
                key={reaction.id}
                className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-xs"
              >
                <span>{reaction.emoji}</span>
                <span className="ml-1">{reaction.user?.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}