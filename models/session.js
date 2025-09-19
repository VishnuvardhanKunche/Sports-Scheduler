'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Sport, {
        foreignKey: 'sportId',
        as: 'sport'
      });

      Session.belongsTo(models.User, {
        foreignKey: 'creatorId',
        as: 'creator'
      });

      Session.belongsToMany(models.User, {
        through: 'UserSessions',
        foreignKey: 'sessionId',
        as: 'players'
      });
    }

    isPast() {
      const now = new Date();
      const sessionDateTime = new Date(`${this.date}T${this.time}`);
      return sessionDateTime < now;
    }

    async isFull() {
      const playerCount = await this.countPlayers();
      return playerCount >= this.playersNeeded;
    }

    async getAvailableSlots() {
      const playerCount = await this.countPlayers();
      return Math.max(0, this.playersNeeded - playerCount);
    }

    async hasUserJoined(userId) {
      const players = await this.getPlayers();
      return players.some(player => player.id === userId);
    }

    async addPlayerToSession(userId) {
      const user = await sequelize.models.User.findByPk(userId);

      if (!user) throw new Error('User not found');
      if (await this.isFull()) throw new Error('Session is full');
      if (this.isPast()) throw new Error('Cannot join past sessions');
      if (await this.hasUserJoined(userId)) throw new Error('User already joined this session');

      await this.addPlayer(user);
      return true;
    }

    async cancelSession(reason) {
      this.status = 'cancelled';
      this.cancellationReason = reason;
      await this.save();
    }

    getFormattedDateTime() {
      const date = new Date(`${this.date}T${this.time}`);
      return {
        date: date.toDateString(),
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      };
    }

    static async getUpcomingSessions(limit = null) {
      const now = new Date();
      const options = {
        where: {
          date: { [Op.gte]: now.toISOString().split('T')[0] },
          status: 'active'
        },
        include: ['creator', 'sport', 'players'],
        order: [['date', 'ASC'], ['time', 'ASC']]
      };
      if (limit) options.limit = limit;
      return await Session.findAll(options);
    }
  }

  Session.init(
    {
      sportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Sports', key: 'id' }
      },
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: "Please enter a valid date" }
        }
      },
      time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: { notEmpty: { msg: "Time cannot be empty" } }
      },
      venue: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Venue cannot be empty" },
          len: { args: [2, 200], msg: "Venue must be between 2 and 200 characters" }
        }
      },
      playersNeeded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: "At least 1 player is needed" },
          max: { args: [50], msg: "Cannot exceed 50 players" }
        }
      },
      status: {
        type: DataTypes.ENUM('active', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'active'
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'Sessions'
    }
  );

  return Session;
};
