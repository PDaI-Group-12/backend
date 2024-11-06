import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// This is for verifying JWT tokens in protected routes

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Access denied, token missing" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
    }
};
