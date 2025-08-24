const Joi = require('joi');

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
  projects: Joi.array().items(projectSchema).default([])
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
  projects: Joi.array().items(projectSchema).optional()
});

const projectCreateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).trim()
});

// Custom validation functions
const validateTimeSequence = (startTime, endTime, hoursAway) => {
  if (!startTime || !endTime) return true; // Skip if times not provided
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
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

const validateProjectHours = (projects, totalHours) => {
  if (!projects || !totalHours) return true;
  
  const sumProjectHours = projects.reduce((sum, project) => sum + (project.hoursAllocated || 0), 0);
  return sumProjectHours <= totalHours;
};

// Middleware functions
const validateTimeEntry = (req, res, next) => {
  const { error, value } = timeEntrySchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }
  
  // Custom validations
  const { startTime, endTime, hoursAway, totalHours, projects } = value;
  
  if (!validateTimeSequence(startTime, endTime, hoursAway)) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: ['Hours away cannot exceed total work time'] 
    });
  }
  
  if (!validateProjectHours(projects, totalHours)) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: ['Sum of project hours cannot exceed total hours'] 
    });
  }
  
  req.body = value;
  next();
};

const validateTimeEntryUpdate = (req, res, next) => {
  const { error, value } = timeEntryUpdateSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }
  
  // Custom validations for updates
  const { startTime, endTime, hoursAway, totalHours, projects } = value;
  
  if (startTime && endTime && hoursAway !== undefined) {
    if (!validateTimeSequence(startTime, endTime, hoursAway)) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: ['Hours away cannot exceed total work time'] 
      });
    }
  }
  
  if (projects && totalHours !== undefined) {
    if (!validateProjectHours(projects, totalHours)) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: ['Sum of project hours cannot exceed total hours'] 
      });
    }
  }
  
  req.body = value;
  next();
};

const validateProject = (req, res, next) => {
  const { error, value } = projectCreateSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }
  
  req.body = value;
  next();
};

module.exports = {
  validateTimeEntry,
  validateTimeEntryUpdate,
  validateProject,
  validateTimeSequence,
  validateProjectHours
};