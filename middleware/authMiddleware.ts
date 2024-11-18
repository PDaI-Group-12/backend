import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";

// Define authenticateToken as a RequestHandler to align with Express's type signature
export const authenticateToken: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ message: "Access denied, token missing" });
        return; // Ensure the function returns `void` after sending a response
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded; // Attaching decoded token payload to `req.user`
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
        return; // Explicitly return `void` after sending a response
    }
};