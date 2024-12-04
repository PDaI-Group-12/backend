import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../database/connection";

// Here we define register and login crud's

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               iban:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */

// Register crud
export const register = async (req: Request, res: Response): Promise<void> => {
    const { firstname, lastname, password, role, iban } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query =
            `INSERT INTO "user" (firstname, lastname, password, role, iban)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `;
        const result = await pool.query(query, [firstname, lastname, hashedPassword, role, iban]);
        const userId = result.rows[0].id;

        res.status(201).json({ message: "User registered successfully", userId });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error });
    }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Incorrect username or password
 */

// Login crud...
export const login = async (req: Request, res: Response): Promise<void> => {
    const { firstname, password } = req.body;

    try {
        const query = `SELECT * FROM "user" WHERE firstname = $1`;
        const result = await pool.query(query, [firstname]);

        if (result.rowCount === 0) {
            res.status(400).json({ message: "Username or password incorrect" });
            return;
        }

        const user = result.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            res.status(400).json({ message: "Username or password incorrect" });
            return;
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error });
    }
};
