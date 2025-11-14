// client/src/components/MessageItem.js
import React, { useState } from 'react';
import './MessageItem.css';

const MessageItem = ({ message, isMyMessage, onReply, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const iconMap = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',
      docx: 'fa-file-word',
      xls: 'fa-file-excel',
      xlsx: 'fa-file-excel',
      ppt: 'fa-file-powerpoint',
      pptx: 'fa-file-powerpoint',
      zip: 'fa-file-archive',
      rar: 'fa-file-archive',
      txt: 'fa-file-alt',
      default: 'fa-file'
    };
    return iconMap[ext] || iconMap.default;
  };

  // Get file name from URL
  const getFileName = (url) => {
    if (!url) return 'file';
    return url.split('/').pop() || 'file';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Render message content based on type
  const renderContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="message-text">
            {message.reply_to && (
              <div className="reply-preview">
                <i className="fas fa-reply"></i>
                <span>Đã trả lời tin nhắn</span>
              </div>
            )}
            <p>{message.content}</p>
          </div>
        );

      case 'image':
        return (
          <div className="message-image">
            {message.content && <p className="image-caption">{message.content}</p>}
            {!imageError ? (
              <img 
                src={message.file_url} 
                alt="Hình ảnh"
                onClick={() => window.open(message.file_url, '_blank')}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="image-error">
                <i className="fas fa-image"></i>
                <span>Không thể tải hình ảnh</span>
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="message-file">
            <div className="file-icon">
              <i className={`fas ${getFileIcon(message.file_url)}`}></i>
            </div>
            <div className="file-info">
              <p className="file-name">{getFileName(message.file_url)}</p>
              {message.file_size && (
                <p className="file-size">{formatFileSize(message.file_size)}</p>
              )}
            </div>
            <a 
              href={message.file_url} 
              download 
              className="file-download"
              title="Tải xuống"
            >
              <i className="fas fa-download"></i>
            </a>
          </div>
        );

      case 'voice':
        return (
          <div className="message-voice">
            <audio controls>
              <source src={message.file_url} type="audio/mpeg" />
              Trình duyệt không hỗ trợ phát âm thanh.
            </audio>
          </div>
        );

      case 'system':
        return (
          <div className="message-system">
            <i className="fas fa-info-circle"></i>
            <span>{message.content}</span>
          </div>
        );

      default:
        return <p>{message.content}</p>;
    }
  };

  // System messages are rendered differently
  if (message.message_type === 'system') {
    return (
      <div className="message-item message-system-wrapper">
        {renderContent()}
      </div>
    );
  }

  return (
    <div 
      className={`message-item ${isMyMessage ? 'my-message' : 'other-message'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMyMessage && (
        <img 
          src={message.sender?.avatar_url || '/images/default-avatar.png'} 
          alt={message.sender?.full_name}
          className="sender-avatar"
        />
      )}

      <div className="message-content-wrapper">
        {!isMyMessage && (
          <div className="sender-name">{message.sender?.full_name || 'Người dùng'}</div>
        )}

        <div className={`message-bubble ${message.message_type}`}>
          {renderContent()}
          
          <div className="message-meta">
            <span className="message-time">{formatTime(message.created_at)}</span>
            {isMyMessage && (
              <span className={`message-status ${message.is_read ? 'read' : 'sent'}`}>
                {message.is_read ? (
                  <i className="fas fa-check-double"></i>
                ) : (
                  <i className="fas fa-check"></i>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Message Actions */}
        {showActions && message.message_type !== 'system' && (
          <div className="message-actions">
            {onReply && (
              <button 
                className="action-btn reply-btn"
                onClick={() => onReply(message.id)}
                title="Trả lời"
              >
                <i className="fas fa-reply"></i>
              </button>
            )}
            {isMyMessage && onDelete && (
              <button 
                className="action-btn delete-btn"
                onClick={() => onDelete(message.id)}
                title="Xóa"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {isMyMessage && (
        <img 
          src={message.sender?.avatar_url || '/images/default-avatar.png'} 
          alt="You"
          className="sender-avatar"
        />
      )}
    </div>
  );
};

export default MessageItem;