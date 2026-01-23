import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../middleware/logger';
import { initializeDatabase, dbOperations, closeDatabase } from './database';

// Storage interface
export interface IStorage {
  initialize(): Promise<void>;
  getAllTimeEntries(): Promise<any[]>;
  getTimeEntryById(id: string): Promise<any | null>;
  createTimeEntry(entry: any): Promise<any>;
  updateTimeEntry(id: string, updates: any): Promise<any>;
  deleteTimeEntry(id: string): Promise<boolean>;
  getAllProjects(): Promise<any[]>;
  getProjectByName(name: string): Promise<any | null>;
  createProject(project: any): Promise<any>;
  updateProject(name: string, updates: any): Promise<any>;
  deleteProject(name: string): Promise<boolean>;
  getLastModifiedTimestamp(): Promise<string>;
  close?(): Promise<void>;
}

// File-based storage implementation
class FileStorage implements IStorage {
  private dataFile: string;

  constructor(dataPath?: string) {
    if (dataPath) {
      this.dataFile = path.isAbsolute(dataPath) ? dataPath : path.resolve(dataPath);
    } else {
      this.dataFile = path.join(__dirname, '..', '..', 'timetracking-data.json');
    }
  }

  private async readData() {
    try {
      return await fs.readJson(this.dataFile);
    } catch (error) {
      logger.error('Error reading data file', { error: (error as Error).message });
      throw error;
    }
  }

  private async writeData(data: any): Promise<string> {
    try {
      data.metadata.lastModified = new Date().toISOString();
      await fs.writeJson(this.dataFile, data, { spaces: 2 });
      return data.metadata.lastModified;
    } catch (error) {
      logger.error('Error writing data file', { error: (error as Error).message });
      throw error;
    }
  }

  private async migrateDuplicateIds() {
    try {
      const data = await this.readData();
      const idCounts = new Map<string, number>();
      
      for (const entry of data.timeEntries) {
        idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1);
      }
      
      const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
      
      if (duplicateIds.length > 0) {
        logger.info(`Migrating ${duplicateIds.length} duplicate ID groups to UUIDs`);
        
        const processedIds = new Set<string>();
        
        for (const entry of data.timeEntries) {
          if (idCounts.get(entry.id)! > 1) {
            if (!processedIds.has(entry.id)) {
              processedIds.add(entry.id);
            } else {
              entry.id = randomUUID();
            }
          }
        }
        
        await this.writeData(data);
        logger.info('Migration completed: Fixed duplicate IDs');
      }
    } catch (error) {
      logger.error('Error during ID migration', { error: (error as Error).message });
    }
  }

  async initialize(): Promise<void> {
    try {
      if (!(await fs.pathExists(this.dataFile))) {
        const initialData = {
          metadata: {
            version: "1.0",
            lastModified: new Date().toISOString(),
            totalEntries: 0
          },
          timeEntries: [],
          projects: []
        };
        await fs.writeJson(this.dataFile, initialData, { spaces: 2 });
        logger.info('Initialized timetracking-data.json', { file: this.dataFile });
      } else {
        await this.migrateDuplicateIds();
      }
    } catch (error) {
      logger.error('Error initializing data file', { 
        error: (error as Error).message, 
        file: this.dataFile 
      });
      throw error;
    }
  }

  async getAllTimeEntries(): Promise<any[]> {
    const data = await this.readData();
    return data.timeEntries;
  }

  async getTimeEntryById(id: string): Promise<any | null> {
    const data = await this.readData();
    return data.timeEntries.find((entry: any) => entry.id === id) || null;
  }

  async createTimeEntry(entry: any): Promise<any> {
    const data = await this.readData();
    const newEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.timeEntries.push(newEntry);
    data.metadata.totalEntries = data.timeEntries.length;
    
    const timestamp = await this.writeData(data);
    return { ...newEntry, lastSaved: timestamp };
  }

  async updateTimeEntry(id: string, updates: any): Promise<any> {
    const data = await this.readData();
    const entryIndex = data.timeEntries.findIndex((entry: any) => entry.id === id);
    
    if (entryIndex === -1) {
      return null;
    }

    data.timeEntries[entryIndex] = {
      ...data.timeEntries[entryIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const timestamp = await this.writeData(data);
    return { ...data.timeEntries[entryIndex], lastSaved: timestamp };
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    const data = await this.readData();
    const entryIndex = data.timeEntries.findIndex((entry: any) => entry.id === id);
    
    if (entryIndex === -1) {
      return false;
    }
    
    data.timeEntries.splice(entryIndex, 1);
    data.metadata.totalEntries = data.timeEntries.length;
    
    await this.writeData(data);
    return true;
  }

  async getAllProjects(): Promise<any[]> {
    const data = await this.readData();
    return data.projects;
  }

  async getProjectByName(name: string): Promise<any | null> {
    const data = await this.readData();
    return data.projects.find((project: any) => project.name === name) || null;
  }

  async createProject(project: any): Promise<any> {
    const data = await this.readData();
    const newProject = {
      ...project,
      totalHours: 0,
      lastUsed: new Date().toISOString().split('T')[0]
    };
    
    data.projects.push(newProject);
    
    const timestamp = await this.writeData(data);
    return { ...newProject, lastSaved: timestamp };
  }

  async updateProject(name: string, updates: any): Promise<any> {
    const data = await this.readData();
    const projectIndex = data.projects.findIndex((project: any) => project.name === name);
    
    if (projectIndex === -1) {
      return null;
    }
    
    data.projects[projectIndex] = {
      ...data.projects[projectIndex],
      ...updates
    };
    
    const timestamp = await this.writeData(data);
    return { ...data.projects[projectIndex], lastSaved: timestamp };
  }

  async deleteProject(name: string): Promise<boolean> {
    const data = await this.readData();
    const projectIndex = data.projects.findIndex((project: any) => project.name === name);
    
    if (projectIndex === -1) {
      return false;
    }
    
    data.projects.splice(projectIndex, 1);
    
    await this.writeData(data);
    return true;
  }

  async getLastModifiedTimestamp(): Promise<string> {
    const data = await this.readData();
    return data.metadata.lastModified;
  }
}

// Database storage implementation
class DatabaseStorage implements IStorage {
  async initialize(): Promise<void> {
    try {
      initializeDatabase();
      // Test connection
      const metadata = await dbOperations.getMetadata();
      logger.info('Database storage initialized', { 
        version: metadata.version,
        totalEntries: metadata.totalEntries
      });
    } catch (error) {
      logger.error('Error initializing database storage', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  async getAllTimeEntries(): Promise<any[]> {
    return await dbOperations.getAllTimeEntries();
  }

  async getTimeEntryById(id: string): Promise<any | null> {
    return await dbOperations.getTimeEntryById(id);
  }

  async createTimeEntry(entry: any): Promise<any> {
    const newEntry = await dbOperations.createTimeEntry(entry);
    const timestamp = await dbOperations.updateMetadataTimestamp();
    return { ...newEntry, lastSaved: timestamp };
  }

  async updateTimeEntry(id: string, updates: any): Promise<any> {
    const updatedEntry = await dbOperations.updateTimeEntry(id, updates);
    if (!updatedEntry) {
      return null;
    }
    const timestamp = await dbOperations.updateMetadataTimestamp();
    return { ...updatedEntry, lastSaved: timestamp };
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    const deleted = await dbOperations.deleteTimeEntry(id);
    if (deleted) {
      await dbOperations.updateMetadataTimestamp();
    }
    return deleted;
  }

  async getAllProjects(): Promise<any[]> {
    return await dbOperations.getAllProjects();
  }

  async getProjectByName(name: string): Promise<any | null> {
    return await dbOperations.getProjectByName(name);
  }

  async createProject(project: any): Promise<any> {
    const newProject = await dbOperations.createProject(project);
    const timestamp = await dbOperations.updateMetadataTimestamp();
    return { ...newProject, lastSaved: timestamp };
  }

  async updateProject(name: string, updates: any): Promise<any> {
    const updatedProject = await dbOperations.updateProject(name, updates);
    if (!updatedProject) {
      return null;
    }
    const timestamp = await dbOperations.updateMetadataTimestamp();
    return { ...updatedProject, lastSaved: timestamp };
  }

  async deleteProject(name: string): Promise<boolean> {
    const deleted = await dbOperations.deleteProject(name);
    if (deleted) {
      await dbOperations.updateMetadataTimestamp();
    }
    return deleted;
  }

  async getLastModifiedTimestamp(): Promise<string> {
    const metadata = await dbOperations.getMetadata();
    return metadata.lastModified;
  }

  async close(): Promise<void> {
    await closeDatabase();
  }
}

// Factory function to create the appropriate storage instance
export const createStorage = (storageType?: string, dataPath?: string): IStorage => {
  const type = storageType || process.env.STORAGE_TYPE || 'file';
  
  if (type === 'database') {
    logger.info('Using database storage (PostgreSQL)');
    return new DatabaseStorage();
  } else {
    logger.info('Using file storage', { dataPath: dataPath || 'default' });
    return new FileStorage(dataPath);
  }
};
