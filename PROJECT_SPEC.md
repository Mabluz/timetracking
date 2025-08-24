# Time Tracking Web Application - Project Specification

## Project Overview
A Vue.js-based time tracking application for personal use with local database storage. The application will provide an Excel-like interface for tracking daily work hours across multiple projects.

## Core Requirements

### Functional Requirements
1. **Daily Time Tracking**
   - Record start time for each workday
   - Record end time for each workday
   - Track hours away from work (lunch breaks, appointments, etc.)
   - Automatic calculation of total hours worked (excluding hours away)
   - View all tracked days in a calendar/grid format

2. **Project-Based Time Allocation**
   - Ability to split daily hours across multiple projects
   - Add comments/notes for each project entry
   - Track hours per project per day

3. **Data Management**
   - Local database storage (no backend required)
   - Persistent data storage between sessions
   - Basic CRUD operations for time entries

### Non-Functional Requirements
- Local development only (no production deployment needed)
- Excel-like UI/UX for familiar user experience
- Custom port configuration to avoid conflicts
- Simple, lightweight architecture

## Technical Architecture

### Frontend Stack
- **Framework**: Vue 3 with Composition API
- **UI Library**: Consider Vuetify or PrimeVue for Excel-like grid components
- **State Management**: Pinia for application state
- **HTTP Client**: Axios for API communication
- **Build Tool**: Vite
- **Storage**: Backend API calls with localStorage backup

### Backend Stack
- **Framework**: Node.js with Express
- **File System**: Direct JSON file manipulation
- **CORS**: Enabled for frontend communication
- **Port**: 3002 (API server)
- **Data Storage**: JSON file in project root

### Data Storage Strategy
- **Primary Storage**: JSON file in project root managed by backend server
- **API Communication**: RESTful API endpoints for CRUD operations
- **Browser Cache**: localStorage for temporary data and offline access
- **Backend Storage**: Node.js server handles file read/write operations
- **Backup**: JSON file can be placed in Dropbox folder for automatic sync
- **API Endpoints**:
  - `GET /api/timeentries` - Fetch all time entries
  - `POST /api/timeentries` - Create new time entry
  - `PUT /api/timeentries/:id` - Update existing time entry
  - `DELETE /api/timeentries/:id` - Delete time entry
  - `GET /api/projects` - Fetch all projects
  - `POST /api/projects` - Create new project
- **Auto-save Features**:
  - Immediate API call on any field change (no debounce delay)
  - Backend updates JSON file and returns timestamp
  - Frontend displays "Last saved: HH:MM:SS" notification
  - Sticky notification in bottom-right corner with auto-fade after 3 seconds

### Development Configuration
- **Frontend Port**: 3001 (Vue.js development server)
- **Backend Port**: 3002 (Node.js API server)
- **Launch**: Single batch file starts both frontend and backend servers
- **Data File**: `timetracking-data.json` in project root (managed by backend, can be symlinked to Dropbox)
- **Concurrent Servers**: Both servers run simultaneously during development

## Data Structure

### JSON Schema

#### Main Data File: `timetracking-data.json`
```json
{
  "metadata": {
    "version": "1.0",
    "lastModified": "2024-01-20T10:30:00Z",
    "totalEntries": 150
  },
  "timeEntries": [
    {
      "id": "2024-01-20",
      "date": "2024-01-20",
      "startTime": "09:00",
      "endTime": "17:00",
      "hoursAway": 0.5,
      "totalHours": 7.5,
      "projects": [
        {
          "id": "proj-1",
          "name": "Project Alpha",
          "hoursAllocated": 5.0,
          "comment": "Worked on frontend components"
        },
        {
          "id": "proj-2",
          "name": "Project Beta",
          "hoursAllocated": 2.5,
          "comment": "Bug fixes and testing"
        }
      ],
      "createdAt": "2024-01-20T09:00:00Z",
      "updatedAt": "2024-01-20T17:30:00Z"
    }
  ],
  "projects": [
    {
      "name": "Project Alpha",
      "totalHours": 120.5,
      "lastUsed": "2024-01-20"
    }
  ]
}
```

## User Interface Design

### Main View - Excel-like Grid
- **Layout**: Spreadsheet-style interface with rows and columns
- **Columns**:
  - Date
  - Start Time
  - Hours Away (lunch, breaks, etc.)
  - End Time
  - Total Hours (calculated: end_time - start_time - hours_away)
  - Projects (expandable/collapsible)
  - Comments
- **Features**:
  - Inline editing capabilities
  - Date picker integration
  - Time picker components (24-hour format)
  - Real-time auto-save on all changes via backend API
  - Last saved notification (sticky, bottom-right corner with timestamp)
  - Keyboard navigation (Tab, Enter, Arrow keys)
  - Default values: Start Time (09:00), End Time (17:00), Hours Away (0.5)

### Project Allocation Sub-grid
- Nested rows for multiple projects per day
- Project name dropdown/autocomplete
- Hours input with validation
- Comment field for each project

## Key Features

### 1. Time Calculation
- Automatic calculation: `total_hours = end_time - start_time - hours_away`
- Handle overnight shifts (crossing midnight)
- Validation: end_time must be after start_time
- Validation: hours_away must be less than total time between start and end
- Support for multiple break periods (lunch, appointments, etc.)
- Time format: 24-hour format (HH:MM)
- Default values: Start Time (09:00), End Time (17:00), Hours Away (0.5 hours = 30 minutes)

### 2. Project Management
- Dynamic project creation
- Project name autocomplete from previous entries
- Hours validation (sum of project hours ≤ total daily hours)

### 3. Data Validation
- Date format validation
- Time format validation (24-hour format only: HH:MM)
- Hours allocation validation
- Hours away validation (cannot exceed total time span)
- Required field validation
- Logical time sequence validation (start < end, breaks within work hours)

### 4. User Experience
- Auto-save changes to JSON file via backend API on every modification
- Last saved timestamp notification (sticky, bottom-right corner)
- Undo/Redo functionality
- Export to CSV/Excel
- Import from CSV
- Dark/Light theme toggle
- One-click launch via batch file
- Automatic Dropbox sync (if JSON file placed in Dropbox folder)

## Development Setup

### Directory Structure
```
timeforing/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── utils/
│   │   └── services/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── timeentries.js
│   │   └── projects.js
│   ├── middleware/
│   │   └── cors.js
│   ├── utils/
│   │   └── fileHandler.js
│   └── package.json
├── timetracking-data.json (managed by backend, can be symlinked to Dropbox)
├── package.json (root - for running both servers)
├── start.bat (main launch script)
├── start-backend.bat (backend launcher)
└── PROJECT_SPEC.md
```

### Launch Configuration

#### `start.bat` (Main launcher)
```batch
@echo off
echo Starting Time Tracking App...
echo Starting backend server...
start /B npm run start:backend
echo Starting frontend server...
timeout /t 2 /nobreak > nul
npm run dev
```

#### `start-backend.bat` (Backend launcher)
```batch
@echo off
echo Starting Backend API Server...
cd backend
node server.js
```

#### `package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "start:backend": "node backend/server.js",
    "start:both": "concurrently \"npm run start:backend\" \"npm run dev\""
  }
}
```

#### `vite.config.js`
```javascript
export default {
  server: {
    port: 3001,
    open: true // Auto-open browser
  }
}
```

#### Backend: `backend/server.js` configuration
```javascript
const PORT = process.env.PORT || 3002;
const DATA_FILE = './timetracking-data.json';
```

#### Environment Variables
```env
VITE_PORT=3001
VITE_API_URL=http://localhost:3002
BACKEND_PORT=3002
DATA_FILE=./timetracking-data.json
```

## Implementation Phases

### Phase 1: Basic Setup ✅ COMPLETED
- ✅ Project initialization with Vue 3 + TypeScript + Vite (frontend)
- ✅ Node.js Express server setup (backend)
- ✅ JSON data structure setup
- ✅ Basic Vue app structure with routing and Pinia
- ✅ Backend API routes and middleware setup
- ✅ Launch scripts (start.bat for both servers) creation
- ✅ CORS configuration for frontend-backend communication

### Phase 2: Backend Development ✅ COMPLETED
- ✅ RESTful API endpoints implementation
- ✅ JSON file manipulation utilities
- ✅ Express middleware for request handling
- ✅ Data validation on the backend
- ✅ Error handling and logging
- ✅ API testing with tools like Postman or Thunder Client

### Phase 3: Frontend Core Features ✅ COMPLETED
- ✅ Excel-like grid implementation with TimeTrackingGrid component
- ✅ Time calculation logic with automatic total hours computation
- ✅ Project allocation with expandable rows and project management
- ✅ API service layer using Axios for backend communication
- ✅ Pinia store for state management with API integration
- ✅ LocalStorage fallback for offline functionality

### Phase 4: Enhanced UX ✅ COMPLETED
- ✅ Keyboard navigation with Tab, Enter, Arrow keys support
- ✅ Real-time auto-save functionality on every change via backend API
- ✅ Last saved timestamp notification (sticky, bottom-right corner)
- ✅ Data validation with real-time error display
- ✅ Import/Export features for JSON data
- ✅ Offline mode detection and graceful fallback

### Phase 5: Polish & Integration ✅ COMPLETED
- ✅ Excel-like UI/UX with proper styling and hover effects
- ✅ Comprehensive error handling and validation messages
- ✅ TypeScript configuration and type safety for both frontend and backend
- ✅ Responsive design and accessibility features
- ✅ Performance optimization and testing

## Success Criteria ✅ ALL COMPLETED
1. ✅ Can track daily start/end times with time picker inputs
2. ✅ Calculates total hours automatically (end_time - start_time - hours_away)
3. ✅ Supports multiple projects per day with expandable project details
4. ✅ Excel-like interface for easy data entry with keyboard navigation
5. ✅ Data persists between sessions using JSON file + localStorage fallback
6. ✅ Runs on custom ports (3001/3002) without conflicts
7. ✅ Intuitive and fast to use with auto-save and keyboard shortcuts

## Future Enhancements (Optional)
- Weekly/Monthly reports
- Project statistics
- Time goals and tracking
- Calendar integration
- Backup/Restore functionality
- Multiple user support (if needed later)