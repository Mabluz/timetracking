import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { validateTimeEntry, validateTimeEntryUpdate, validateProject } from './middleware/validation';
import { logger, requestLogger, errorHandler } from './middleware/logger';
import { requireAuth, authenticatePassword, isPasswordProtectionEnabled } from './middleware/auth';
import { createStorage, IStorage } from './services/storage';
import { initializeDatabase, dbOperations, closeDatabase } from './services/database';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3010;

// Initialize storage (file or database based on STORAGE_TYPE env variable)
const storage: IStorage = createStorage(process.env.STORAGE_TYPE, process.env.DATA_PATH);

// Interfaces for migration
interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hoursAway: number;
  totalHours: number;
  projects: Array<{
    id: string;
    name: string;
    billable: boolean;
    hoursAllocated: number;
    comment: string;
  }>;
  imported?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  name: string;
  billable: boolean;
  totalHours?: number;
  lastUsed?: string;
  lastSaved?: string;
}

interface FileData {
  metadata: {
    version: string;
    lastModified: string;
    totalEntries: number;
  };
  timeEntries: TimeEntry[];
  projects: Project[];
}

// Migration function to load dump file into database on startup
async function runDataMigrationIfEnabled() {
  try {
    const migrationEnabled = process.env.MIGRATE_ON_STARTUP === 'true';
    
    if (!migrationEnabled) {
      return;
    }

    const migrationFilePath = process.env.MIGRATION_FILE_PATH || path.join(__dirname, '..', 'backend', 'timetracking-dump.json');
    
    logger.info('Checking for data migration', { filePath: migrationFilePath });

    // Check if file exists
    if (!(await fs.pathExists(migrationFilePath))) {
      logger.warn('Migration file not found, skipping migration', { filePath: migrationFilePath });
      return;
    }

    logger.info('Found migration file, starting data migration...', { filePath: migrationFilePath });

    // Initialize database connection
    initializeDatabase();
    logger.info('Database connection initialized for migration');

    // Read JSON file
    const fileData: FileData = await fs.readJson(migrationFilePath);

    logger.info('Migration file data loaded', {
      timeEntries: fileData.timeEntries?.length || 0,
      projects: fileData.projects?.length || 0
    });

    // Migrate projects first
    logger.info('Migrating projects...');
    let projectsCreated = 0;
    let projectsSkipped = 0;

    if (fileData.projects && Array.isArray(fileData.projects)) {
      for (const project of fileData.projects) {
        try {
          await dbOperations.createProject({
            name: project.name,
            billable: project.billable || false,
            totalHours: project.totalHours || 0,
            lastUsed: project.lastUsed || new Date().toISOString().split('T')[0]
          });
          projectsCreated++;
          logger.info(`Created project: ${project.name}`);
        } catch (error) {
          // Project might already exist
          if ((error as Error).message.includes('duplicate') || (error as Error).message.includes('unique')) {
            projectsSkipped++;
            logger.warn(`Project already exists: ${project.name}`);
          } else {
            throw error;
          }
        }
      }
    }

    logger.info('Projects migration completed', { created: projectsCreated, skipped: projectsSkipped });

    // Migrate time entries
    logger.info('Migrating time entries...');
    let entriesCreated = 0;
    let entriesFailed = 0;

    if (fileData.timeEntries && Array.isArray(fileData.timeEntries)) {
      for (const entry of fileData.timeEntries) {
        try {
          await dbOperations.createTimeEntry({
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            hoursAway: entry.hoursAway || 0,
            totalHours: entry.totalHours,
            projects: entry.projects,
            imported: entry.imported || false
          });
          entriesCreated++;
          
          if (entriesCreated % 10 === 0) {
            logger.info(`Progress: ${entriesCreated}/${fileData.timeEntries.length} entries migrated`);
          }
        } catch (error) {
          entriesFailed++;
          logger.error('Failed to migrate entry', {
            entryId: entry.id,
            error: (error as Error).message
          });
        }
      }
    }

    logger.info('Time entries migration completed', {
      created: entriesCreated,
      failed: entriesFailed,
      total: fileData.timeEntries?.length || 0
    });

    logger.info('Data migration completed successfully', {
      projectsCreated,
      projectsSkipped,
      entriesCreated,
      entriesFailed
    });

  } catch (error) {
    logger.error('Data migration failed', { error: (error as Error).message });
    throw error;
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Public auth routes (no password protection needed)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const token = authenticatePassword(password);

  if (!token) {
    logger.warn('Failed login attempt');
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  logger.info('User authenticated successfully');
  res.json({ token, message: 'Authentication successful' });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const isProtected = isPasswordProtectionEnabled();
  res.json({ 
    protected: isProtected,
    requiresAuth: isProtected
  });
});

// Data routes - apply authentication middleware only to these routes
const protectedRoutes = [
  '/api/timeentries',
  '/api/projects',
  '/api/health'
];

// Apply authentication middleware only to protected routes
app.use((req: Request, res: Response, next: NextFunction) => {
  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => req.path.startsWith(route));
  
  if (isProtectedRoute) {
    // Apply auth middleware
    requireAuth(req, res, next);
  } else {
    // Allow public routes
    next();
  }
});

// Routes
app.get('/api/timeentries', async (req, res) => {
  try {
    const timeEntries = await storage.getAllTimeEntries();
    res.json(timeEntries);
  } catch (error) {
    logger.error('Error fetching time entries', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

app.post('/api/timeentries', validateTimeEntry, async (req, res) => {
  try {
    const newEntry = await storage.createTimeEntry(req.body);
    res.json(newEntry);
  } catch (error) {
    logger.error('Error creating time entry', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

app.put('/api/timeentries/:id', async (req, res) => {
  try {
    if (!req.params.id) {
      res.status(400).json({ error: 'Entry ID is required' });
      return;
    }
    const updatedEntry = await storage.updateTimeEntry(req.params.id, req.body);
    
    if (!updatedEntry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    res.json(updatedEntry);
  } catch (error) {
    logger.error('Error updating time entry', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

app.delete('/api/timeentries/:id', async (req, res): Promise<void> => {
  try {
    const deleted = await storage.deleteTimeEntry(req.params.id);
    
    if (!deleted) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    const timestamp = await storage.getLastModifiedTimestamp();
    res.json({ message: 'Time entry deleted', lastSaved: timestamp });
  } catch (error) {
    logger.error('Error deleting time entry', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await storage.getAllProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error fetching projects', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', validateProject, async (req, res) => {
  try {
    const newProject = await storage.createProject(req.body);
    res.json(newProject);
  } catch (error) {
    logger.error('Error creating project', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:name', async (req, res): Promise<void> => {
  try {
    const projectName = decodeURIComponent(req.params.name);
    const updatedProject = await storage.updateProject(projectName, req.body);
    
    if (!updatedProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json(updatedProject);
  } catch (error) {
    logger.error('Error updating project', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:name', async (req, res): Promise<void> => {
  try {
    const projectName = decodeURIComponent(req.params.name);
    const deleted = await storage.deleteProject(projectName);
    
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const timestamp = await storage.getLastModifiedTimestamp();
    res.json({ message: 'Project deleted', lastSaved: timestamp });
  } catch (error) {
    logger.error('Error deleting project', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Run data migration if enabled
    await runDataMigrationIfEnabled();

    await storage.initialize();
    app.listen(PORT, () => {
      logger.info('Backend server started', { 
        port: PORT, 
        url: `http://localhost:${PORT}`,
        storageType: process.env.STORAGE_TYPE || 'file'
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully');
  if (storage.close) {
    await storage.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully');
  if (storage.close) {
    await storage.close();
  }
  process.exit(0);
});

startServer();