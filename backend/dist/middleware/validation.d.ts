import { Request, Response, NextFunction } from 'express';
declare const validateTimeSequence: (startTime: string, endTime: string, hoursAway: number) => boolean;
declare const validateProjectHours: (projects: any[], totalHours: number) => boolean;
declare const validateTimeEntry: (req: Request, res: Response, next: NextFunction) => void;
declare const validateTimeEntryUpdate: (req: Request, res: Response, next: NextFunction) => void;
declare const validateProject: (req: Request, res: Response, next: NextFunction) => void;
export { validateTimeEntry, validateTimeEntryUpdate, validateProject, validateTimeSequence, validateProjectHours };
//# sourceMappingURL=validation.d.ts.map