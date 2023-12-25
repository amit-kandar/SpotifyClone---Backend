// Import necessary types from 'express'
import { Request } from 'express';
import { UserDocument } from '../models/user.model';

// Augment the 'express' Request type definition to include the 'user' property
declare module 'express' {
    interface Request {
        user?: UserDocument; // Replace 'any' with the actual type of your user object
        // Add any other custom properties or methods related to user information
    }
}