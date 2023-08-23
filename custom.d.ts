// types.ts
import { Request } from 'express';

export interface IRequestWithSession extends Request {
    authToken?: string;
    userId?: number;
}