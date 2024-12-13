import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../database/connection";

// Here we define register and login crud's

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth: # arbitrary name for the security scheme
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT # optional, arbitrary value for documentation purposes
 *
 * # 2) Apply the security globally to all operations
 * security:
 *   - bearerAuth: [] # use the same name as above
 */


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *     - Authorization
 *     description: Creates a new user in the system with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: First name of the user
 *
 *               lastname:
 *                 type: string
 *                 description: Last name of the user
 *
 *               password:
 *                 type: string
 *                 description: User's password
 *               role:
 *                 type: string
 *                 description: Role assigned to the user
 *               iban:
 *                 type: string
 *                 description: IBAN number of the user
 *               username:
 *                 type: string
 *                 description: Username for login
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 userId:
 *                   type: integer
 *                   description: The ID of the registered user
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Registration failed due to a server error
 */

// Register crud
export const register = async (req: Request, res: Response): Promise<void> => {
    const { firstname, lastname, password, role, iban, username } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query =
            `INSERT INTO "user" (firstname, lastname, password, role, iban, username)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const result = await pool.query(query, [firstname, lastname, hashedPassword, role, iban, username]);
        const userId = result.rows[0].id;

        res.status(201).json({ message: `User registered successfully ${username}`, userId });
    } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'user_username_key') {
            // Adjust 'user_username_key' to your constraint name if it's different
            res.status(400).json({ message: "Username is already taken" });
        } else {
            res.status(500).json({message: "Registration failed", error});
        }
    }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags:
 *     - Authorization
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
    const { username, password } = req.body;

    try {
        const query = `SELECT * FROM "user" WHERE username = $1`;
        const result = await pool.query(query, [username]);

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
