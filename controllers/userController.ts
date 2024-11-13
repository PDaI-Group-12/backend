import { Request, Response } from "express";
import { pool } from "../database/connection";

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
    const { userid } = req.body;

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

export const paymentRequest = async (req: Request, res: Response): Promise<void> => {
    const { userid } = req.params;

    if (!userid) {
        res.status(400).json({ message: "Missing userid" });
        return;
    }

    try {
        // Query to get total hours from the history table
        const totalHoursQuery = `
            SELECT SUM(hours) AS total_hours
            FROM history
            WHERE userid = $1
            GROUP BY userid;
        `;
        const totalHoursResult = await pool.query(totalHoursQuery, [userid]);

        // Check if any history records exist for the given userid
        if (totalHoursResult.rowCount === 0) {
            res.status(404).json({ message: "No history found for the user" });
            return;
        }

        const total_hours = totalHoursResult.rows[0].total_hours;

        // Query to get already requested hours from the request table
        const requestedHoursQuery = `
            SELECT COALESCE(SUM(hours), 0) AS requested_hours
            FROM request
            WHERE userid = $1
            GROUP BY userid;
        `;
        const requestedHoursResult = await pool.query(requestedHoursQuery, [userid]);

        // Extract requested hours, defaulting to 0 if no records found
        const requested_hours = requestedHoursResult.rows[0]?.requested_hours ?? 0;

        // Calculate remaining hours
        const remaining_hours = total_hours - requested_hours;

        if (remaining_hours <= 0) {
            res.status(400).json({ message: "No remaining hours to request" });
            return;
        }

        // Insert the remaining hours as a new request entry in the request table
        const insertQuery = `
            INSERT INTO request (userid, hours)
            VALUES ($1, $2)
                RETURNING userid, hours;
        `;
        const insertResult = await pool.query(insertQuery, [userid, remaining_hours]);

        // Return the inserted request record
        res.status(201).json({
            message: "Payment request added successfully",
            request: insertResult.rows[0]
        });
    } catch (error) {
        console.error("Error adding payment request:", error);
        res.status(500).json({ message: "Error adding payment request", error });
    }
};
