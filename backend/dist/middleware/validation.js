"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProjectHours = exports.validateTimeSequence = exports.validateProject = exports.validateTimeEntryUpdate = exports.validateTimeEntry = void 0;
const joi_1 = __importDefault(require("joi"));
// Time validation (24-hour format HH:MM)
const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
// Validation schemas
const projectSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    name: joi_1.default.string().required().min(1).max(100).trim(),
    hoursAllocated: joi_1.default.number().min(0).max(24).required(),
    comment: joi_1.default.string().allow('').max(500)
});
const timeEntrySchema = joi_1.default.object({
    date: joi_1.default.date().iso().required(),
    startTime: joi_1.default.string().pattern(timePattern).required().messages({
        'string.pattern.base': 'Start time must be in 24-hour format (HH:MM)'
    }),
    endTime: joi_1.default.string().pattern(timePattern).required().messages({
        'string.pattern.base': 'End time must be in 24-hour format (HH:MM)'
    }),
    hoursAway: joi_1.default.number().min(0).max(24).required(),
    totalHours: joi_1.default.number().min(0).max(24).optional(),
    projects: joi_1.default.array().items(projectSchema).default([])
});
const timeEntryUpdateSchema = joi_1.default.object({
    date: joi_1.default.date().iso().optional(),
    startTime: joi_1.default.string().pattern(timePattern).optional().messages({
        'string.pattern.base': 'Start time must be in 24-hour format (HH:MM)'
    }),
    endTime: joi_1.default.string().pattern(timePattern).optional().messages({
        'string.pattern.base': 'End time must be in 24-hour format (HH:MM)'
    }),
    hoursAway: joi_1.default.number().min(0).max(24).optional(),
    totalHours: joi_1.default.number().min(0).max(24).optional(),
    projects: joi_1.default.array().items(projectSchema).optional()
});
const projectCreateSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(1).max(100).trim()
});
// Custom validation functions
const validateTimeSequence = (startTime, endTime, hoursAway) => {
    if (!startTime || !endTime)
        return true; // Skip if times not provided
    let [startHour, startMinute] = startTime.split(':').map(Number);
    let [endHour, endMinute] = endTime.split(':').map(Number);
    if (!startMinute) {
        startMinute = 0;
    }
    if (!startHour) {
        startHour = 0;
    }
    if (!endHour) {
        endHour = 0;
    }
    if (!endMinute) {
        endMinute = 0;
    }
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    let totalMinutes = endTotalMinutes - startTotalMinutes;
    // Handle overnight shifts
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }
    const totalHours = totalMinutes / 60;
    // Check if hours away exceeds total time
    if (hoursAway && hoursAway > totalHours) {
        return false;
    }
    return true;
};
exports.validateTimeSequence = validateTimeSequence;
const validateProjectHours = (projects, totalHours) => {
    if (!projects || !totalHours)
        return true;
    const sumProjectHours = projects.reduce((sum, project) => sum + (project.hoursAllocated || 0), 0);
    return sumProjectHours <= totalHours;
};
exports.validateProjectHours = validateProjectHours;
// Middleware functions
const validateTimeEntry = (req, res, next) => {
    const { error, value } = timeEntrySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });
    if (error) {
        const errors = error.details.map(detail => detail.message);
        res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
        return;
    }
    // Custom validations
    const { startTime, endTime, hoursAway, totalHours, projects } = value;
    if (!validateTimeSequence(startTime, endTime, hoursAway)) {
        res.status(400).json({
            error: 'Validation failed',
            details: ['Hours away cannot exceed total work time']
        });
        return;
    }
    if (!validateProjectHours(projects, totalHours)) {
        res.status(400).json({
            error: 'Validation failed',
            details: ['Sum of project hours cannot exceed total hours']
        });
        return;
    }
    req.body = value;
    next();
};
exports.validateTimeEntry = validateTimeEntry;
const validateTimeEntryUpdate = (req, res, next) => {
    const { error, value } = timeEntryUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });
    if (error) {
        const errors = error.details.map(detail => detail.message);
        res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
        return;
    }
    // Custom validations for updates
    const { startTime, endTime, hoursAway, totalHours, projects } = value;
    if (startTime && endTime && hoursAway !== undefined) {
        if (!validateTimeSequence(startTime, endTime, hoursAway)) {
            res.status(400).json({
                error: 'Validation failed',
                details: ['Hours away cannot exceed total work time']
            });
            return;
        }
    }
    if (projects && totalHours !== undefined) {
        if (!validateProjectHours(projects, totalHours)) {
            res.status(400).json({
                error: 'Validation failed',
                details: ['Sum of project hours cannot exceed total hours']
            });
            return;
        }
    }
    req.body = value;
    next();
};
exports.validateTimeEntryUpdate = validateTimeEntryUpdate;
const validateProject = (req, res, next) => {
    const { error, value } = projectCreateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });
    if (error) {
        const errors = error.details.map(detail => detail.message);
        res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
        return;
    }
    req.body = value;
    next();
};
exports.validateProject = validateProject;
//# sourceMappingURL=validation.js.map