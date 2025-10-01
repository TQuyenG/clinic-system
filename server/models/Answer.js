const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Answer = sequelize.define('Answer', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    question_id: { type: DataTypes.BIGINT, allowNull: false },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    is_pinned: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'answers',
    timestamps: true,
    underscored: true
  });

  Answer.associate = (models) => {
    Answer.belongsTo(models.Question, { foreignKey: 'question_id' });
    Answer.belongsTo(models.User, { foreignKey: 'user_id' });
    Answer.hasMany(models.Interaction, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'answer' } });
  };

  console.log('SUCCESS: Model Answer đã được định nghĩa.');
  return Answer;
};