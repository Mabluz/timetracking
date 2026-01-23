import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { validateTimeEntry, validateTimeEntryUpdate, validateProject } from './middleware/validation';
import { logger, requestLogger, errorHandler } from './middleware/logger';
import { createStorage, IStorage } from './services/storage';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3010;

// Initialize storage (file or database based on STORAGE_TYPE env variable)
const storage: IStorage = createStorage(process.env.STORAGE_TYPE, process.env.DATA_PATH);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

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