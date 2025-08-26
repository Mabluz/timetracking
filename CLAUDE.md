# Claude Development Notes

## Important Reminders

### Backend Development
**CRITICAL**: Always run `npm run build:backend` after making changes to TypeScript files in the backend directory. This compiles the TypeScript to JavaScript in the dist folder.

Without this step, changes to backend TypeScript files will not be reflected when running the application, as the Node.js server runs from `dist/server.js`.

### TypeScript Development
**IMPORTANT**: Always run TypeScript type checking after making changes to ensure code quality and catch errors early.

**Frontend TypeScript Commands:**
- `cd frontend && npm run type-check` - Runs vue-tsc to check for TypeScript errors in Vue components
- `cd frontend && npx vue-tsc --noEmit` - Alternative command for type checking without building

**Backend TypeScript Commands:**
- `cd backend && npx tsc --noEmit` - Checks for TypeScript errors in backend files

### Commands to Remember
- `npm run build:backend` - Compiles backend TypeScript to dist folder
- `npm run start:backend` - Runs backend in development mode with ts-node
- `npm run start:both` - Runs both frontend and backend concurrently