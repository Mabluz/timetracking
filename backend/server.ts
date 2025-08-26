import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { validateTimeEntry, validateTimeEntryUpdate, validateProject } from './middleware/validation';
import { logger, requestLogger, errorHandler } from './middleware/logger';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3010;

// Get data file path from environment variable or use default
const getDataFilePath = (): string => {
  const dataPath = process.env.DATA_PATH;
  
  if (dataPath) {
    // If path is absolute, use as-is; if relative, resolve from current directory
    return path.isAbsolute(dataPath) ? dataPath : path.resolve(dataPath);
  }
  
  // Default to project root
  return path.join(__dirname, '..', 'timetracking-data.json');
};

const DATA_FILE = getDataFilePath();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Migrate existing duplicate IDs to UUIDs
const migrateDuplicateIds = async () => {
  try {
    const data = await readData();
    const idCounts = new Map<string, number>();
    
    // Count occurrences of each ID
    for (const entry of data.timeEntries) {
      idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1);
    }
    
    // Check if migration is needed
    const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
    
    if (duplicateIds.length > 0) {
      logger.info(`Migrating ${duplicateIds.length} duplicate ID groups to UUIDs`);
      
      const processedIds = new Set<string>();
      
      for (const entry of data.timeEntries) {
        // If this ID has duplicates and we haven't processed the first occurrence yet
        if (idCounts.get(entry.id)! > 1) {
          if (!processedIds.has(entry.id)) {
            // Keep the first occurrence with original ID
            processedIds.add(entry.id);
          } else {
            // Give subsequent duplicates new UUIDs
            entry.id = randomUUID();
          }
        }
      }
      
      await writeData(data);
      logger.info('Migration completed: Fixed duplicate IDs');
    }
  } catch (error) {
    logger.error('Error during ID migration', { error: (error as Error).message });
  }
};

// Initialize data file if it doesn't exist
const initializeDataFile = async () => {
  try {
    if (!(await fs.pathExists(DATA_FILE))) {
      const initialData = {
        metadata: {
          version: "1.0",
          lastModified: new Date().toISOString(),
          totalEntries: 0
        },
        timeEntries: [],
        projects: []
      };
      await fs.writeJson(DATA_FILE, initialData, { spaces: 2 });
      logger.info('Initialized timetracking-data.json', { file: DATA_FILE });
    } else {
      // Run migration on existing data
      await migrateDuplicateIds();
    }
  } catch (error) {
    logger.error('Error initializing data file', { error: (error as Error).message, file: DATA_FILE });
  }
};

// Helper function to read data
const readData = async () => {
  try {
    return await fs.readJson(DATA_FILE);
  } catch (error) {
    console.error('Error reading data file:', error);
    throw error;
  }
};

// Helper function to write data
const writeData = async (data: any): Promise<string> => {
  try {
    data.metadata.lastModified = new Date().toISOString();
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    return data.metadata.lastModified;
  } catch (error) {
    console.error('Error writing data file:', error);
    throw error;
  }
};

// Routes
app.get('/api/timeentries', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.timeEntries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

app.post('/api/timeentries', validateTimeEntry, async (req, res) => {
  try {
    const data = await readData();
    const newEntry = {
      ...req.body,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.timeEntries.push(newEntry);
    data.metadata.totalEntries = data.timeEntries.length;
    
    const timestamp = await writeData(data);
    res.json({ ...newEntry, lastSaved: timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

app.put('/api/timeentries/:id', validateTimeEntryUpdate, async (req, res): Promise<void> => {
  try {
    const data = await readData();
    const entryIndex = data.timeEntries.findIndex((entry: any) => entry.id === req.params.id);
    
    if (entryIndex === -1) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }

    console.log("req.body: ", req.body);
    data.timeEntries[entryIndex] = {
      ...data.timeEntries[entryIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    const timestamp = await writeData(data);
    res.json({ ...data.timeEntries[entryIndex], lastSaved: timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

app.delete('/api/timeentries/:id', async (req, res): Promise<void> => {
  try {
    const data = await readData();
    const entryIndex = data.timeEntries.findIndex((entry: any) => entry.id === req.params.id);
    
    if (entryIndex === -1) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    data.timeEntries.splice(entryIndex, 1);
    data.metadata.totalEntries = data.timeEntries.length;
    
    const timestamp = await writeData(data);
    res.json({ message: 'Time entry deleted', lastSaved: timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', validateProject, async (req, res) => {
  try {
    const data = await readData();
    const newProject = {
      ...req.body,
      totalHours: 0,
      lastUsed: new Date().toISOString().split('T')[0]
    };
    
    data.projects.push(newProject);
    
    const timestamp = await writeData(data);
    res.json({ ...newProject, lastSaved: timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:name', async (req, res): Promise<void> => {
  try {
    const data = await readData();
    const projectName = decodeURIComponent(req.params.name);
    const projectIndex = data.projects.findIndex((project: any) => project.name === projectName);
    
    if (projectIndex === -1) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    data.projects[projectIndex] = {
      ...data.projects[projectIndex],
      ...req.body
    };
    
    const timestamp = await writeData(data);
    res.json({ ...data.projects[projectIndex], lastSaved: timestamp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:name', async (req, res): Promise<void> => {
  try {
    const data = await readData();
    const projectName = decodeURIComponent(req.params.name);
    const projectIndex = data.projects.findIndex((project: any) => project.name === projectName);
    
    if (projectIndex === -1) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    data.projects.splice(projectIndex, 1);
    
    const timestamp = await writeData(data);
    res.json({ message: 'Project deleted', lastSaved: timestamp });
  } catch (error) {
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
  await initializeDataFile();
  app.listen(PORT, () => {
    logger.info('Backend server started', { 
      port: PORT, 
      url: `http://localhost:${PORT}`,
      dataFile: DATA_FILE 
    });
  });
};

startServer();