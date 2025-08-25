# Claude Development Notes

## Important Reminders

### Backend Development
**CRITICAL**: Always run `npm run build:backend` after making changes to TypeScript files in the backend directory. This compiles the TypeScript to JavaScript in the dist folder.

Without this step, changes to backend TypeScript files will not be reflected when running the application, as the Node.js server runs from `dist/server.js`.

### Commands to Remember
- `npm run build:backend` - Compiles backend TypeScript to dist folder
- `npm run start:backend` - Runs backend in development mode with ts-node
- `npm run start:both` - Runs both frontend and backend concurrently