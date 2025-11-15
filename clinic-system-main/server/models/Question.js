const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    authorId: { 
      type: DataTypes.BIGINT, 
      allowNull: true,  // Allow null in case user is deleted
      field: 'user_id'
    },
    specialtyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'specialty_id'
    },
    tags: { 
      type: DataTypes.JSON,
      field: 'tags_json',
      defaultValue: []
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of image URLs uploaded with the question'
    },
    status: { 
      type: DataTypes.ENUM('open', 'closed', 'hidden'), 
      defaultValue: 'open',
      comment: 'open=chờ duyệt, closed=đã duyệt, hidden=không duyệt'
    },
    viewsCount: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0,
      field: 'views'
    },
    answersCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'answers_count'
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'likes_count'
    },
    likedBy: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'liked_by',
      comment: 'Array of user IDs who liked this question'
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_anonymous'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason'
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at'
    },
    approvedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'approved_by'
    },
    deletedAt: { 
      type: DataTypes.DATE,
      field: 'deleted_at'
    },
  }, {
    tableName: 'questions',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  Question.associate = (models) => {
    Question.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
    Question.belongsTo(models.Specialty, { foreignKey: 'specialtyId', as: 'specialty' });
    Question.hasMany(models.Answer, { foreignKey: 'questionId', as: 'answers' });
    Question.hasMany(models.Interaction, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'question' } });
  };

  console.log('SUCCESS: Model Question đã được định nghĩa.');
  return Question;
};