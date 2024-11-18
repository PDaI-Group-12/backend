import express, { Request, Response } from 'express';
// Import the JWT authentication middleware
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Secure endpoint that requires authentication
router.get('/secure-endpoint', authenticateToken, (req: Request, res: Response) => {
    res.json({ message: 'You are authorized!' });
});

export { router as testRouter };
