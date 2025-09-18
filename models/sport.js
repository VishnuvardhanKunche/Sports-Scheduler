'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    static associate(models) {
      // Sport belongs to an admin user
      Sport.belongsTo(models.User, {
        foreignKey: 'adminId',
        as: 'admin'
      });
      
      // Sport can have many sessions
      Sport.hasMany(models.Session, {
        foreignKey: 'sportId',
        as: 'sessions'
      });
    }

    // Get all sessions for this sport
    async getSessions() {
      const { Session } = require('./index');
      return await Session.findAll({
        where: { sportId: this.id },
        include: ['creator', 'sport', 'players'],
        order: [['date', 'ASC'], ['time', 'ASC']]
      });
    }

    // Get upcoming sessions for this sport
    async getUpcomingSessions() {
      const { Session } = require('./index');
      const now = new Date();
      
      return await Session.findAll({
        where: { 
          sportId: this.id,
          date: {
            [sequelize.Op.gte]: now.toISOString().split('T')[0]
          },
          status: 'active'
        },
        include: ['creator', 'sport', 'players'],
        order: [['date', 'ASC'], ['time', 'ASC']]
      });
    }

    // Get session count for reporting
    async getSessionCount(startDate = null, endDate = null) {
      const { Session } = require('./index');
      const whereClause = { sportId: this.id };
      
      if (startDate && endDate) {
        whereClause.date = {
          [sequelize.Op.between]: [startDate, endDate]
        };
      }
      
      return await Session.count({
        where: whereClause
      });
    }
  }

  Sport.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Sport name cannot be empty"
        },
        len: {
          args: [2, 50],
          msg: "Sport name must be between 2 and 50 characters"
        }
      }
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Sport',
    tableName: 'Sports'
  });

  return Sport;
};