// server/models/ChatMessage.js
// Model tin nhắn chat real-time

const { DataTypes } = require('sequelize');
const crypto = require('crypto');
// Lấy key từ file .env
const ENCRYPTION_KEY = process.env.CHAT_ENCRYPTION_KEY; 
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Hàm mã hóa
function encrypt(text) {
  if (!text || !ENCRYPTION_KEY) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Trả về text gốc nếu lỗi
  }
}

// Hàm giải mã
function decrypt(text) {
  if (!text || !ENCRYPTION_KEY || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return text; // Trả về text mã hóa nếu lỗi
  }
}

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Buổi tư vấn
    consultation_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'consultations',
        key: 'id'
      }
    },
    
    // Người gửi
    sender_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Loại người gửi
    sender_type: {
      type: DataTypes.ENUM('patient', 'doctor', 'system'),
      allowNull: false,
      defaultValue: 'patient'
    },
    
    // Người nhận
    receiver_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Loại tin nhắn
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'file', 'voice', 'video', 'location', 'system'),
      allowNull: false,
      defaultValue: 'text'
    },
    
    // Nội dung tin nhắn (text)
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        // Tự động giải mã khi lấy dữ liệu
        const rawValue = this.getDataValue('content');
        return rawValue ? decrypt(rawValue) : rawValue;
      },
      set(value) {
        // Tự động mã hóa khi lưu dữ liệu
        this.setDataValue('content', encrypt(value));
      }
    },
    
    // File đính kèm
    file_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    
    file_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Thumbnail cho image/video
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Thời lượng voice/video (giây)
    voice_duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Trạng thái đã đọc
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Tin nhắn hệ thống
    is_system_message: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Đã xóa (soft delete)
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    deleted_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    
    // Reply to message
    reply_to_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'chat_messages',
        key: 'id'
      }
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    
    // Device info
    sent_from_device: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
    
  }, {
    tableName: 'chat_messages',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['consultation_id'] },
      { fields: ['sender_id'] },
      { fields: ['receiver_id'] },
      { fields: ['is_read'] },
      { fields: ['is_deleted'] },
      { fields: ['created_at'] },
      { fields: ['consultation_id', 'created_at'] }
    ]
  });

  // ==================== ASSOCIATIONS ====================
  
  ChatMessage.associate = (models) => {
    // Consultation
    ChatMessage.belongsTo(models.Consultation, {
      foreignKey: 'consultation_id',
      as: 'consultation'
    });
    
    // Sender
    ChatMessage.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    });
    
    // Receiver
    ChatMessage.belongsTo(models.User, {
      foreignKey: 'receiver_id',
      as: 'receiver'
    });
    
    // Reply to
    ChatMessage.belongsTo(ChatMessage, {
      foreignKey: 'reply_to_id',
      as: 'replyTo'
    });
    
    ChatMessage.hasMany(ChatMessage, {
      foreignKey: 'reply_to_id',
      as: 'replies'
    });
  };

  // ==================== INSTANCE METHODS ====================
  
  /**
   * Đánh dấu tin nhắn đã đọc
   */
  ChatMessage.prototype.markAsRead = async function() {
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
    console.log(`✅ Tin nhắn ${this.id} đã được đánh dấu là đã đọc`);
  };
  
  /**
   * Xóa tin nhắn (soft delete)
   */
  ChatMessage.prototype.softDelete = async function(deletedBy) {
    this.is_deleted = true;
    this.deleted_at = new Date();
    this.deleted_by = deletedBy;
    await this.save();
    console.log(`🗑️ Tin nhắn ${this.id} đã bị xóa bởi user ${deletedBy}`);
  };

  // ==================== CLASS METHODS ====================
  
  /**
   * Lấy tin nhắn chưa đọc
   */
  ChatMessage.getUnreadMessages = async function(consultationId, userId) {
    return await this.findAll({
      where: {
        consultation_id: consultationId,
        receiver_id: userId,
        is_read: false,
        is_deleted: false
      },
      order: [['created_at', 'ASC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        }
      ]
    });
  };
  
  /**
   * Đếm tin nhắn chưa đọc
   */
  ChatMessage.countUnreadMessages = async function(consultationId, userId) {
    return await this.count({
      where: {
        consultation_id: consultationId,
        receiver_id: userId,
        is_read: false,
        is_deleted: false
      }
    });
  };
  
  /**
   * Đánh dấu tất cả tin nhắn đã đọc
   */
  ChatMessage.markAllAsRead = async function(consultationId, userId) {
    const [count] = await this.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          consultation_id: consultationId,
          receiver_id: userId,
          is_read: false,
          is_deleted: false
        }
      }
    );
    
    console.log(`✅ Đã đánh dấu ${count} tin nhắn là đã đọc`);
    return count;
  };
  
  /**
   * Lấy tin nhắn cuối cùng của consultation
   */
  ChatMessage.getLastMessage = async function(consultationId) {
    return await this.findOne({
      where: {
        consultation_id: consultationId,
        is_deleted: false
      },
      order: [['created_at', 'DESC']]
    });
  };
  
  /**
   * Tạo tin nhắn hệ thống
   */
  ChatMessage.createSystemMessage = async function(consultationId, content, metadata = {}) {
    const consultation = await sequelize.models.Consultation.findByPk(consultationId);
    
    if (!consultation) {
      throw new Error('Consultation not found');
    }
    
    return await this.create({
      consultation_id: consultationId,
      sender_id: consultation.doctor_id, // System message từ doctor ID
      sender_type: 'system',
      receiver_id: consultation.patient_id,
      message_type: 'system',
      content,
      is_system_message: true,
      metadata
    });
  };

  console.log('✅ Model ChatMessage đã được định nghĩa thành công');
  return ChatMessage;
};