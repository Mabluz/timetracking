"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const dotenv_1 = require("dotenv");
const validation_1 = require("./middleware/validation");
const logger_1 = require("./middleware/logger");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3010;
// Get data file path from environment variable or use default
const getDataFilePath = () => {
    const dataPath = process.env.DATA_PATH;
    if (dataPath) {
        // If path is absolute, use as-is; if relative, resolve from current directory
        return path_1.default.isAbsolute(dataPath) ? dataPath : path_1.default.resolve(dataPath);
    }
    // Default to project root
    return path_1.default.join(__dirname, '..', 'timetracking-data.json');
};
const DATA_FILE = getDataFilePath();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(logger_1.requestLogger);
// Migrate existing duplicate IDs to UUIDs
const migrateDuplicateIds = async () => {
    try {
        const data = await readData();
        const idCounts = new Map();
        // Count occurrences of each ID
        for (const entry of data.timeEntries) {
            idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1);
        }
        // Check if migration is needed
        const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1);
        if (duplicateIds.length > 0) {
            logger_1.logger.info(`Migrating ${duplicateIds.length} duplicate ID groups to UUIDs`);
            const processedIds = new Set();
            for (const entry of data.timeEntries) {
                // If this ID has duplicates and we haven't processed the first occurrence yet
                if (idCounts.get(entry.id) > 1) {
                    if (!processedIds.has(entry.id)) {
                        // Keep the first occurrence with original ID
                        processedIds.add(entry.id);
                    }
                    else {
                        // Give subsequent duplicates new UUIDs
                        entry.id = (0, crypto_1.randomUUID)();
                    }
                }
            }
            await writeData(data);
            logger_1.logger.info('Migration completed: Fixed duplicate IDs');
        }
    }
    catch (error) {
        logger_1.logger.error('Error during ID migration', { error: error.message });
    }
};
// Initialize data file if it doesn't exist
const initializeDataFile = async () => {
    try {
        if (!(await fs_extra_1.default.pathExists(DATA_FILE))) {
            const initialData = {
                metadata: {
                    version: "1.0",
                    lastModified: new Date().toISOString(),
                    totalEntries: 0
                },
                timeEntries: [],
                projects: []
            };
            await fs_extra_1.default.writeJson(DATA_FILE, initialData, { spaces: 2 });
            logger_1.logger.info('Initialized timetracking-data.json', { file: DATA_FILE });
        }
        else {
            // Run migration on existing data
            await migrateDuplicateIds();
        }
    }
    catch (error) {
        logger_1.logger.error('Error initializing data file', { error: error.message, file: DATA_FILE });
    }
};
// Helper function to read data
const readData = async () => {
    try {
        return await fs_extra_1.default.readJson(DATA_FILE);
    }
    catch (error) {
        console.error('Error reading data file:', error);
        throw error;
    }
};
// Helper function to write data
const writeData = async (data) => {
    try {
        data.metadata.lastModified = new Date().toISOString();
        await fs_extra_1.default.writeJson(DATA_FILE, data, { spaces: 2 });
        return data.metadata.lastModified;
    }
    catch (error) {
        console.error('Error writing data file:', error);
        throw error;
    }
};
// Routes
app.get('/api/timeentries', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.timeEntries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch time entries' });
    }
});
app.post('/api/timeentries', validation_1.validateTimeEntry, async (req, res) => {
    try {
        const data = await readData();
        const newEntry = {
            ...req.body,
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        data.timeEntries.push(newEntry);
        data.metadata.totalEntries = data.timeEntries.length;
        const timestamp = await writeData(data);
        res.json({ ...newEntry, lastSaved: timestamp });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create time entry' });
    }
});
app.put('/api/timeentries/:id', validation_1.validateTimeEntryUpdate, async (req, res) => {
    try {
        const data = await readData();
        const entryIndex = data.timeEntries.findIndex((entry) => entry.id === req.params.id);
        if (entryIndex === -1) {
            res.status(404).json({ error: 'Time entry not found' });
            return;
        }
        data.timeEntries[entryIndex] = {
            ...data.timeEntries[entryIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        const timestamp = await writeData(data);
        res.json({ ...data.timeEntries[entryIndex], lastSaved: timestamp });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update time entry' });
    }
});
app.delete('/api/timeentries/:id', async (req, res) => {
    try {
        const data = await readData();
        const entryIndex = data.timeEntries.findIndex((entry) => entry.id === req.params.id);
        if (entryIndex === -1) {
            res.status(404).json({ error: 'Time entry not found' });
            return;
        }
        data.timeEntries.splice(entryIndex, 1);
        data.metadata.totalEntries = data.timeEntries.length;
        const timestamp = await writeData(data);
        res.json({ message: 'Time entry deleted', lastSaved: timestamp });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete time entry' });
    }
});
app.get('/api/projects', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.projects);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
app.post('/api/projects', validation_1.validateProject, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware (must be last)
app.use(logger_1.errorHandler);
// Start server
const startServer = async () => {
    await initializeDataFile();
    app.listen(PORT, () => {
        logger_1.logger.info('Backend server started', {
            port: PORT,
            url: `http://localhost:${PORT}`,
            dataFile: DATA_FILE
        });
    });
};
startServer();
//# sourceMappingURL=server.js.map