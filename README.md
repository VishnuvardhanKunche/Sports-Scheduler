# Sports Scheduler 🏆

A comprehensive web application built with Node.js and Express that allows users to organize and participate in sports sessions. The platform serves two types of users: **Administrators** who can create and manage different sports, and **Players** who can create sessions and join existing ones.

## ✨ Features

### For Players
- **Account Management**: Sign up and sign in with email/password
- **Session Creation**: Create sports sessions with date, time, venue, and player requirements
- **Session Discovery**: Browse and join available sessions created by other players
- **Dashboard**: Track created sessions, joined sessions, and available opportunities
- **Session Management**: Edit or cancel your own sessions with reason notifications

### For Administrators
- **Sports Management**: Create and manage different sports available on the platform
- **Session Creation**: Create sessions just like regular players
- **Analytics Dashboard**: View comprehensive reports on session activity
- **User Statistics**: Monitor total players, sessions, and sport popularity
- **Time-based Reports**: Generate reports for configurable time periods

### Core Functionality
- **Role-based Authentication**: Separate access levels for admins and players
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Validation**: Form validation with helpful error messages
- **Session Status Tracking**: Active, cancelled, and completed session states
- **Player Capacity Management**: Automatic tracking of available slots
- **Past Session Prevention**: Users cannot join sessions that have already occurred

## 🚀 Live Demo

**🌐 Live Application:** [Your deployment URL here]

## 📸 Screenshots

[Add screenshots of your application here]

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Passport.js with Local Strategy
- **Templating**: EJS (Embedded JavaScript)
- **Styling**: Bootstrap 5 with custom CSS
- **Validation**: Express-validator
- **Session Management**: Express-session
- **Password Security**: bcrypt
- **Development**: Nodemon, Jest for testing

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14 or higher)
- PostgreSQL database
- Git

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sports-scheduler.git
   cd sports-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create databases
   npm run db:create
   
   # Run migrations
   npm run db:migrate
   ```

4. **Environment Configuration**
   
   Update `config/config.json` with your database credentials:
   ```json
   {
     "development": {
       "username": "your_username",
       "password": "your_password",
       "database": "sports_scheduler_dev",
       "host": "127.0.0.1",
       "dialect": "postgresql"
     }
   }
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## 🎯 Usage Guide

### Getting Started

1. **Sign Up**: Create an account choosing either "Player" or "Admin" role
2. **Admin Users**: 
   - Create sports from the admin dashboard
   - View analytics and reports
   - Manage platform-wide activities
3. **Players**: 
   - Browse available sessions
   - Create your own sessions
   - Join sessions created by others

### Creating Your First Session

1. Navigate to "Create Session" from the dashboard
2. Select a sport (admins need to create sports first)
3. Set date, time, and venue
4. Specify how many players you need
5. Submit and wait for others to join!

### Joining Sessions

1. Browse available sessions from "Browse Sessions"
2. Filter by sport if desired
3. Click "Join" on sessions with available slots
4. View your joined sessions in your dashboard

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

This application is configured for easy deployment to platforms like Render, Heroku, or Railway.

### Environment Variables for Production

- `DATABASE_URL`: Your production database connection string
- `SESSION_SECRET`: A secure secret for session management
- `NODE_ENV`: Set to "production"

### Deploying to Render

1. Connect your GitHub repository to Render
2. Set environment variables in the Render dashboard
3. The app will automatically build and deploy

## 📁 Project Structure

```
sports-scheduler/
├── config/                 # Database configuration
├── migrations/             # Database migrations
├── models/                # Sequelize models
├── routes/                # Express routes
├── views/                 # EJS templates
├── public/                # Static files (CSS, JS)
├── middleware/            # Custom middleware
├── __tests__/             # Test files
├── app.js                 # Express app configuration
├── index.js               # Server entry point
└── package.json           # Dependencies and scripts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Features Implementation Status

- ✅ User authentication (login/signup)
- ✅ Role-based access (Admin/Player)
- ✅ Sports management (Admin)
- ✅ Session creation and management
- ✅ Session discovery and joining
- ✅ Session cancellation with reasons
- ✅ Comprehensive dashboards
- ✅ Activity reports and analytics
- ✅ Responsive design
- ✅ Form validation
- ✅ Flash messaging system

## 🐛 Known Issues

- None at the moment! Report any bugs you find.

## 📖 API Documentation

This application uses server-side rendering with EJS templates. For API endpoints, refer to the route files in the `/routes` directory.

## 🔒 Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection considerations
- Input validation and sanitization
- Role-based access control

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built as part of the WD201 Web Development course
- Inspired by the need for better sports community organization
- Thanks to the open-source community for the amazing tools and libraries

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/sports-scheduler/issues) page
2. Create a new issue if your problem isn't already listed
3. Provide detailed information about the problem and your environment

## 🎥 Video Demo

[Link to your video demo here - as required for capstone submission]

---

**Built with ❤️ using Node.js and Express**