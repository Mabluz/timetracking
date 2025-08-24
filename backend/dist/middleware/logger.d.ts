import { Request, Response, NextFunction } from 'express';
interface LogData {
    [key: string]: any;
}
interface Logger {
    info: (message: string, data?: LogData) => void;
    warn: (message: string, data?: LogData) => void;
    error: (message: string, data?: LogData) => void;
    debug: (message: string, data?: LogData) => void;
}
declare const logger: Logger;
declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
declare const errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
export { logger, requestLogger, errorHandler };
//# sourceMappingURL=logger.d.ts.map