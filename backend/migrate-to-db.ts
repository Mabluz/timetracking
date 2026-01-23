import fs from 'fs-extra';
import path from 'path';
import { config } from 'dotenv';
import { initializeDatabase, dbOperations, closeDatabase } from './services/database';
import { logger } from './middleware/logger';

// Load environment variables
config();

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

async function migrateFileToDatabase(filePath: string) {
  try {
    // Initialize database connection
    initializeDatabase();
    logger.info('Database connection initialized');

    // Read JSON file
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    logger.info('Reading data from file', { file: absolutePath });
    const fileData: FileData = await fs.readJson(absolutePath);

    logger.info('File data loaded', {
      timeEntries: fileData.timeEntries.length,
      projects: fileData.projects.length
    });

    // Migrate projects first
    logger.info('Migrating projects...');
    let projectsCreated = 0;
    let projectsSkipped = 0;

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

    logger.info('Projects migration completed', { created: projectsCreated, skipped: projectsSkipped });

    // Migrate time entries
    logger.info('Migrating time entries...');
    let entriesCreated = 0;
    let entriesFailed = 0;

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

    logger.info('Time entries migration completed', {
      created: entriesCreated,
      failed: entriesFailed,
      total: fileData.timeEntries.length
    });

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Projects: ${projectsCreated} created, ${projectsSkipped} skipped`);
    console.log(`Time Entries: ${entriesCreated} created, ${entriesFailed} failed`);
    console.log('=========================\n');

    if (entriesFailed === 0 && projectsSkipped === fileData.projects.length - projectsCreated) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with warnings. Check logs for details.');
    }

  } catch (error) {
    logger.error('Migration failed', { error: (error as Error).message });
    console.error('❌ Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Get file path from command line arguments or environment variable
const filePath = process.argv[2] || process.env.DATA_PATH || path.join(__dirname, '..', 'timetracking-data.json');

console.log('Starting migration from file to database...');
console.log(`Source file: ${filePath}`);
console.log(`Target database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}\n`);

migrateFileToDatabase(filePath)
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
