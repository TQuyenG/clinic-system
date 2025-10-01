const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('open', 'answered', 'closed'), defaultValue: 'open' },
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
  };

  console.log('SUCCESS: Model Question đã được định nghĩa.');
  return Question;
};