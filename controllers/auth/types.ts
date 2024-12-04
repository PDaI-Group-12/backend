import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        firstname?: string;
        lastname?: string;
        role: string;
    };
}
