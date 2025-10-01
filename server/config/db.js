const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

async function initializeDatabase() {
  // Create database if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
  await connection.end();
}

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false // Disable SQL query logging (enable for debug if needed)
});

// Import all models
const models = {
  User: require('../models/User')(sequelize),
  Patient: require('../models/Patient')(sequelize),
  Staff: require('../models/Staff')(sequelize),
  Doctor: require('../models/Doctor')(sequelize),
  Admin: require('../models/Admin')(sequelize),
  Specialty: require('../models/Specialty')(sequelize),
  Category: require('../models/Category')(sequelize),
  Medicine: require('../models/Medicine')(sequelize),
  Disease: require('../models/Disease')(sequelize),
  Article: require('../models/Article')(sequelize),
  Interaction: require('../models/Interaction')(sequelize),
  Appointment: require('../models/Appointment')(sequelize),
  Schedule: require('../models/Schedule')(sequelize),
  Consultation: require('../models/Consultation')(sequelize),
  ChatMessage: require('../models/ChatMessage')(sequelize),
  Discount: require('../models/Discount')(sequelize),
  Payment: require('../models/Payment')(sequelize),
  Notification: require('../models/Notification')(sequelize),
  SystemSetting: require('../models/SystemSetting')(sequelize),
  Question: require('../models/Question')(sequelize),
  Answer: require('../models/Answer')(sequelize),
  MedicalRecord: require('../models/MedicalRecord')(sequelize),
  AuditLog: require('../models/AuditLog')(sequelize)
};

// Define associations
Object.values(models).forEach(model => {
  if (model.associate) model.associate(models);
});

module.exports = { sequelize, models, initializeDatabase };