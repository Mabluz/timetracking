# Time Tracking Application

A comprehensive time tracking web application built with Vue.js frontend and Node.js/Express backend. Track your work hours, analyze productivity patterns, and generate detailed reports with overtime calculations.

The backend´s .env file needs to point to a .json file that holds the data. I have this .json file in my dropbox folder, making it auto backup when I preform changes on the webpage. 

## 🚀 Features

- **Time Entry Management**: Log work hours with start/end times or duration
- **Project Tracking**: Organize time entries by projects and tasks
- **Calendar View**: Visual calendar interface for viewing and managing time entries
- **Analytics & Reports**:
  - Monthly reports with overtime calculations
  - Yearly statistics with top projects
  - Work week analysis and productivity insights
  - Interactive charts and visualizations
- **Data Management**: Import/export functionality for time tracking data
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **Vue Datepicker** - Date/time input components

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **Joi** - Data validation
- **CORS** - Cross-origin resource sharing
- **fs-extra** - Enhanced file system operations

## 📋 Prerequisites

- Node.js (v20.19.0 or v22.12.0+)
- npm (comes with Node.js)

## 🚀 Quick Start

### Option 1: Using Clickable Scripts (Mac/Linux)
Double-click on these files in Finder/File Explorer:
- `start.command` - Start both frontend and backend servers
- `kill-servers.command` - Stop all running servers

### Option 2: Using Terminal Commands

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd timetracking
   npm run install:all
   ```

2. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run start:both

   # Or start individually
   npm run start:backend  # Backend only (port 3010)
   npm run start:frontend # Frontend only (port 5173)
   ```

3. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3010

## 📁 Project Structure

```
timetracking/
├── frontend/                 # Vue.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable Vue components
│   │   │   ├── analytics/   # Analytics and reporting components
│   │   │   ├── calendar/    # Calendar view components
│   │   │   ├── charts/      # Chart visualization components
│   │   │   ├── common/      # Common UI components
│   │   │   ├── grid/        # Time tracking grid components
│   │   │   └── navigation/  # Navigation components
│   │   ├── views/           # Page-level components
│   │   ├── stores/          # Pinia state management
│   │   └── router/          # Vue Router configuration
│   └── package.json
├── backend/                 # Node.js/Express backend
│   ├── server.ts           # Main server file
│   ├── middleware/         # Express middleware
│   ├── dist/              # Compiled TypeScript output
│   └── package.json
├── start.command          # Clickable start script (Mac)
├── kill-servers.command   # Clickable stop script (Mac)
└── package.json          # Root package.json with scripts
```

## 🔧 Available Scripts

### Root Level
- `npm run start:both` - Start both frontend and backend concurrently
- `npm run start:frontend` - Start frontend development server
- `npm run start:backend` - Start backend development server
- `npm run install:all` - Install dependencies for all modules
- `npm run build` - Build frontend for production
- `npm run build:backend` - Compile backend TypeScript to JavaScript

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Backend
- `npm run dev` - Start development server with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled JavaScript (production)
- `npm run watch` - Start development server with file watching

## 🏗️ Development Workflow

### Making Backend Changes
⚠️ **Important**: After making changes to TypeScript files in the backend:
```bash
npm run build:backend
```
This compiles TypeScript to JavaScript in the `dist/` folder. Without this step, changes won't be reflected when running the application.

### Type Checking
Always run type checking after making changes:
```bash
# Frontend
cd frontend && npm run type-check

# Backend
cd backend && npx tsc --noEmit
```

## 📊 Key Features Overview

### Time Tracking
- Add, edit, and delete time entries
- Support for both time ranges and duration input
- Project and task categorization
- Comments and descriptions for entries

### Calendar Interface
- Monthly calendar view with time entries
- Visual indicators for work days and overtime
- Quick entry creation from calendar

### Analytics & Reporting
- **Monthly Reports**: Detailed breakdown with overtime calculations
- **Yearly Statistics**: Annual overview with top projects
- **Work Week Analysis**: Productivity patterns and insights
- **Interactive Charts**: Visual representation of time data

### Data Management
- Import existing time tracking data
- Export reports and data
- Data validation and integrity checks

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   ./kill-servers.command  # or kill-servers.sh on Linux
   ```

2. **Backend Changes Not Reflected**
   ```bash
   npm run build:backend
   ```

3. **Type Errors**
   ```bash
   # Check frontend types
   cd frontend && npm run type-check

   # Check backend types
   cd backend && npx tsc --noEmit
   ```

4. **Installation Issues**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   npm run install:all
   ```

## 🔧 Configuration

### Environment Variables
Backend configuration can be managed through environment variables. Create a `.env` file in the backend directory:

```env
PORT=3010
NODE_ENV=development
```

### Frontend Configuration
Frontend build configuration is handled through `vite.config.ts` in the frontend directory.

## 📝 API Documentation

The backend provides RESTful API endpoints for:
- Time entry CRUD operations
- Project management
- Data import/export
- Analytics and reporting

API runs on `http://localhost:3010` in development mode.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking and linting
5. Test your changes
6. Submit a pull request

## 📄 License

ISC License - see package.json for details

## 🆘 Support

For issues and feature requests, please use the project's issue tracker or contact the development team.