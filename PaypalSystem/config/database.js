const { Sequelize } = require('sequelize');

// SQLITE DATABASE
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

module.exports = sequelize;
