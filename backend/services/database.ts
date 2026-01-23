import { Pool, PoolClient } from 'pg';
import { logger } from '../middleware/logger';

// Database connection pool
let pool: Pool | null = null;

export const initializeDatabase = (): Pool => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'timetracking',
      user: process.env.DB_USER || 'timetracking_user',
      password: process.env.DB_PASSWORD || 'timetracking_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err: Error) => {
      logger.error('Unexpected database pool error', { error: err.message });
    });

    logger.info('PostgreSQL connection pool initialized');
  }

  return pool;
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
};

// Database operations
export const dbOperations = {
  // Get metadata
  async getMetadata() {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM metadata WHERE id = 1');
    if (result.rows.length === 0) {
      throw new Error('Metadata not found');
    }
    return {
      version: result.rows[0].version,
      lastModified: result.rows[0].last_modified,
      totalEntries: result.rows[0].total_entries
    };
  },

  // Update metadata timestamp
  async updateMetadataTimestamp(): Promise<string> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE metadata SET last_modified = NOW() WHERE id = 1 RETURNING last_modified'
    );
    return result.rows[0].last_modified;
  },

  // Time Entries Operations
  async getAllTimeEntries() {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        te.id,
        te.date,
        te.start_time as "startTime",
        te.end_time as "endTime",
        te.hours_away as "hoursAway",
        te.total_hours as "totalHours",
        te.imported,
        te.created_at as "createdAt",
        te.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', tep.project_id,
              'name', tep.project_name,
              'billable', tep.billable,
              'hoursAllocated', tep.hours_allocated,
              'comment', tep.comment
            ) ORDER BY tep.id
          ) FILTER (WHERE tep.id IS NOT NULL),
          '[]'::json
        ) as projects
      FROM time_entries te
      LEFT JOIN time_entry_projects tep ON te.id = tep.time_entry_id
      GROUP BY te.id
      ORDER BY te.date DESC, te.created_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      hoursAway: parseFloat(row.hoursAway) || 0,
      totalHours: parseFloat(row.totalHours) || 0,
      projects: row.projects.map((p: any) => ({
        ...p,
        hoursAllocated: parseFloat(p.hoursAllocated) || 0
      }))
    }));
  },

  async getTimeEntryById(id: string) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        te.id,
        te.date,
        te.start_time as "startTime",
        te.end_time as "endTime",
        te.hours_away as "hoursAway",
        te.total_hours as "totalHours",
        te.imported,
        te.created_at as "createdAt",
        te.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', tep.project_id,
              'name', tep.project_name,
              'billable', tep.billable,
              'hoursAllocated', tep.hours_allocated,
              'comment', tep.comment
            ) ORDER BY tep.id
          ) FILTER (WHERE tep.id IS NOT NULL),
          '[]'::json
        ) as projects
      FROM time_entries te
      LEFT JOIN time_entry_projects tep ON te.id = tep.time_entry_id
      WHERE te.id = $1
      GROUP BY te.id
    `, [id]);

    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      hoursAway: parseFloat(row.hoursAway) || 0,
      totalHours: parseFloat(row.totalHours) || 0,
      projects: row.projects.map((p: any) => ({
        ...p,
        hoursAllocated: parseFloat(p.hoursAllocated) || 0
      }))
    };
  },

  async createTimeEntry(entry: any) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert time entry
      const result = await client.query(`
        INSERT INTO time_entries (
          id, date, start_time, end_time, hours_away, total_hours, imported, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING id, created_at, updated_at
      `, [
        entry.date,
        entry.startTime,
        entry.endTime,
        entry.hoursAway || 0,
        entry.totalHours,
        entry.imported || false
      ]);

      const timeEntryId = result.rows[0].id;
      const createdAt = result.rows[0].created_at;
      const updatedAt = result.rows[0].updated_at;

      // Insert projects for this time entry
      if (entry.projects && entry.projects.length > 0) {
        for (const project of entry.projects) {
          await client.query(`
            INSERT INTO time_entry_projects (
              time_entry_id, project_id, project_name, billable, hours_allocated, comment
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            timeEntryId,
            project.id,
            project.name,
            project.billable || false,
            project.hoursAllocated,
            project.comment || ''
          ]);
        }
      }

      await client.query('COMMIT');

      return {
        id: timeEntryId,
        ...entry,
        createdAt,
        updatedAt
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async updateTimeEntry(id: string, updates: any) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update time entry
      const result = await client.query(`
        UPDATE time_entries
        SET 
          date = COALESCE($1, date),
          start_time = COALESCE($2, start_time),
          end_time = COALESCE($3, end_time),
          hours_away = COALESCE($4, hours_away),
          total_hours = COALESCE($5, total_hours),
          imported = COALESCE($6, imported),
          updated_at = NOW()
        WHERE id = $7
        RETURNING id, updated_at
      `, [
        updates.date,
        updates.startTime,
        updates.endTime,
        updates.hoursAway,
        updates.totalHours,
        updates.imported,
        id
      ]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update projects if provided
      if (updates.projects) {
        // Delete existing projects
        await client.query('DELETE FROM time_entry_projects WHERE time_entry_id = $1', [id]);

        // Insert new projects
        for (const project of updates.projects) {
          await client.query(`
            INSERT INTO time_entry_projects (
              time_entry_id, project_id, project_name, billable, hours_allocated, comment
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            project.id,
            project.name,
            project.billable || false,
            project.hoursAllocated,
            project.comment || ''
          ]);
        }
      }

      await client.query('COMMIT');

      // Return the updated entry
      return await this.getTimeEntryById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteTimeEntry(id: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM time_entries WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  },

  // Projects Operations
  async getAllProjects() {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        name,
        billable,
        total_hours as "totalHours",
        last_used as "lastUsed",
        last_saved as "lastSaved"
      FROM projects
      ORDER BY last_used DESC NULLS LAST, name ASC
    `);
    
    return result.rows.map(row => ({
      ...row,
      totalHours: parseFloat(row.totalHours) || 0
    }));
  },

  async getProjectByName(name: string) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        name,
        billable,
        total_hours as "totalHours",
        last_used as "lastUsed",
        last_saved as "lastSaved"
      FROM projects
      WHERE name = $1
    `, [name]);

    return result.rows[0] || null;
  },

  async createProject(project: any) {
    const pool = getPool();
    const result = await pool.query(`
      INSERT INTO projects (name, billable, total_hours, last_used, last_saved)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING name, billable, total_hours as "totalHours", last_used as "lastUsed", last_saved as "lastSaved"
    `, [
      project.name,
      project.billable || false,
      project.totalHours || 0,
      project.lastUsed || new Date().toISOString().split('T')[0]
    ]);

    return result.rows[0];
  },

  async updateProject(name: string, updates: any) {
    const pool = getPool();
    const result = await pool.query(`
      UPDATE projects
      SET 
        name = COALESCE($1, name),
        billable = COALESCE($2, billable),
        total_hours = COALESCE($3, total_hours),
        last_used = COALESCE($4, last_used),
        last_saved = NOW()
      WHERE name = $5
      RETURNING name, billable, total_hours as "totalHours", last_used as "lastUsed", last_saved as "lastSaved"
    `, [
      updates.name,
      updates.billable,
      updates.totalHours,
      updates.lastUsed,
      name
    ]);

    return result.rows[0] || null;
  },

  async deleteProject(name: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM projects WHERE name = $1 RETURNING name', [name]);
    return result.rows.length > 0;
  }
};
