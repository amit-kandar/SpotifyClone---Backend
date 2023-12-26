// Import necessary types from 'express'
import { Request } from 'express';
import { UserDocument } from '../models/user.model';

// Augment the 'express' Request type definition to include the 'user' property
declare global {
    namespace Express {
        interface Request {
            user?: UserDocument; // Define 'user' property
        }
    }
}