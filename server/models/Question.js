const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    tags_json: { type: DataTypes.JSON },
    status: { type: DataTypes.ENUM('open', 'closed', 'hidden'), defaultValue: 'open' },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'questions',
    timestamps: true,
    underscored: true
  });

  Question.associate = (models) => {
    Question.belongsTo(models.User, { foreignKey: 'user_id' });
    Question.hasMany(models.Answer, { foreignKey: 'question_id' });
    Question.hasMany(models.Interaction, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'question' } });
  };

  console.log('SUCCESS: Model Question đã được định nghĩa.');
  return Question;
};