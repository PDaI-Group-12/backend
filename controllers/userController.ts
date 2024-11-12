import { Request, Response } from "express";
import { pool } from "../database/connection";

// Function to get user data and salary by user ID
export const getUserDataAndSalary = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
        const query = `
            SELECT "user".id, "user".firstname, "user".lastname, "user".role, "user".iban, hour_salary.salary
            FROM "user"
            JOIN hour_salary ON "user".id = hour_salary.userid
            WHERE "user".id = $1
        `;

        const result = await pool.query(query, [userId]);

        if (result.rowCount === 0) {
            console.log(`User with ID ${userId} not found.`);
            res.status(404).json({ message: "User not found" });
            return;
        }

        const userData = result.rows[0];
        res.json({
            user: {
                id: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                role: userData.role,
                iban: userData.iban
            },
            salary: userData.salary || "No salary data available"
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error fetching user data", error });
    }
};
export const addUserHistory = async (req: Request, res: Response): Promise<void> => {
    const { userid, hours } = req.body;

    // Tarkistetaan, että hours on positiivinen luku
    if (hours <= 0) {
        res.status(400).json({ message: "Hours must be a positive number" });
        return;
    }

    try {
        const query = `
            INSERT INTO history (userid, hours)
            VALUES ($1, $2)
            RETURNING userid, hours
        `;
        const result = await pool.query(query, [userid, hours]);

        res.status(201).json({ message: "History entry added successfully", entry: result.rows[0] });
    } catch (error) {
        console.error("Error adding user history:", error);
        res.status(500).json({ message: "Error adding user history", error });
    }
};

export const getUserHistory = async (req: Request, res: Response): Promise<void> => {
    const { userid } = req.params;  // Haetaan userId URL-parametrista

    try {
        const query = `
            SELECT id, userid, hours
            FROM history
            WHERE userid = $1
        `;
        const result = await pool.query(query, [userid]);

        if (result.rowCount === 0) {
            res.status(404).json({ message: "No history found for this user" });
            return;
        }

        res.json({ history: result.rows });
    } catch (error) {
        console.error("Error fetching user history:", error);
        res.status(500).json({ message: "Error fetching user history", error });
    }
};
