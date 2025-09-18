'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User can create many sports (as admin)
      User.hasMany(models.Sport, {
        foreignKey: 'adminId',
        as: 'createdSports'
      });
      
      // User can create many sessions
      User.hasMany(models.Session, {
        foreignKey: 'creatorId',
        as: 'createdSessions'
      });
      
      // User can join many sessions (many-to-many)
      User.belongsToMany(models.Session, {
        through: 'UserSessions',
        foreignKey: 'userId',
        as: 'joinedSessions'
      });
    }

    // Instance method to check password
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Static method to create user with hashed password
    static async createUser({ name, email, password, role = 'player' }) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      return await User.create({
        name,
        email,
        password: hashedPassword,
        role
      });
    }

    // Check if user is admin
    isAdmin() {
      return this.role === 'admin';
    }

    // Check if user is player
    isPlayer() {
      return this.role === 'player';
    }
  }

  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Name cannot be empty"
        },
        len: {
          args: [2, 100],
          msg: "Name must be between 2 and 100 characters"
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Please enter a valid email address"
        },
        notEmpty: {
          msg: "Email cannot be empty"
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Password cannot be empty"
        },
        len: {
          args: [6, 255],
          msg: "Password must be at least 6 characters long"
        }
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'player'),
      allowNull: false,
      defaultValue: 'player',
      validate: {
        isIn: {
          args: [['admin', 'player']],
          msg: "Role must be either 'admin' or 'player'"
        }
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });

  return User;
};