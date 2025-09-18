'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add composite unique constraint to prevent duplicate joins
    await queryInterface.addConstraint('UserSessions', {
      fields: ['userId', 'sessionId'],
      type: 'unique',
      name: 'unique_user_session'
    });

    // Add indexes
    await queryInterface.addIndex('UserSessions', ['userId']);
    await queryInterface.addIndex('UserSessions', ['sessionId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserSessions');
  }
};