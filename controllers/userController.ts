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
