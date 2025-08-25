import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Time validation (24-hour format HH:MM)
const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Validation schemas
const projectSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100).trim(),
  hoursAllocated: Joi.number().min(0).max(24).required(),
  comment: Joi.string().allow('').max(500)
});

const timeEntrySchema = Joi.object({
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'Start time must be in 24-hour format (HH:MM)'
  }),
  endTime: Joi.string().pattern(timePattern).required().messages({
    'string.pattern.base': 'End time must be in 24-hour format (HH:MM)'
  }),
  hoursAway: Joi.number().min(0).max(24).required(),
  totalHours: Joi.number().min(0).max(24).optional(),
  projects: Joi.array().items(projectSchema).default([]),
  imported: Joi.boolean().default(false).optional()
});

const timeEntryUpdateSchema = Joi.object({
  date: Joi.date().iso().optional(),
  startTime: Joi.string().pattern(timePattern).optional().messages({
    'string.pattern.base': 'Start time must be in 24-hour format (HH:MM)'
  }),
  endTime: Joi.string().pattern(timePattern).optional().messages({
    'string.pattern.base': 'End time must be in 24-hour format (HH:MM)'
  }),
  hoursAway: Joi.number().min(0).max(24).optional(),
  totalHours: Joi.number().min(0).max(24).optional(),
  projects: Joi.array().items(projectSchema).optional(),
  imported: Joi.boolean().optional()
});

const projectCreateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).trim()
});

// Custom validation functions
const validateTimeSequence = (startTime: string, endTime: string, hoursAway: number): boolean => {
  if (!startTime || !endTime) return true; // Skip if times not provided
  
  let [startHour, startMinute] = startTime.split(':').map(Number);
  let [endHour, endMinute] = endTime.split(':').map(Number);

  if(!startMinute) {
    startMinute = 0;
  }
  if(!startHour) {
    startHour = 0;
  }
  if(!endHour) {
    endHour = 0;
  }
  if(!endMinute) {
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

const validateProjectHours = (projects: any[], totalHours: number): boolean => {
  if (!projects || !totalHours) return true;
  
  const sumProjectHours = projects.reduce((sum, project) => sum + (project.hoursAllocated || 0), 0);
  return sumProjectHours <= totalHours;
};

// Middleware functions
const validateTimeEntry = (req: Request, res: Response, next: NextFunction): void => {
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

const validateTimeEntryUpdate = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = timeEntryUpdateSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: false,
    allowUnknown: false
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

const validateProject = (req: Request, res: Response, next: NextFunction): void => {
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

export {
  validateTimeEntry,
  validateTimeEntryUpdate,
  validateProject,
  validateTimeSequence,
  validateProjectHours
};