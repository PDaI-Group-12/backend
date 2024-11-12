import { Request, Response } from "express";
import { pool } from "../database/connection";

// Function to post data to the hour_salary table
export const setHourSalary = async (req: Request, res: Response): Promise<void> => {
    const { userid, salary } = req.body;

    // Basic input validation
    if (typeof userid !== 'number' || typeof salary !== 'number') {
        res.status(400).json({ message: "Invalid input. 'userid' and 'salary' must be numbers." });
        return;
    }

    try {
        const query = `INSERT INTO hour_salary (userid, salary) VALUES ($1, $2) RETURNING *;`;
        const result = await pool.query(query, [userid, salary]);

        res.status(201).json({ message: "Salary entry created successfully", data: result.rows[0] });
    } catch (error) {
        console.error('Error posting to hour_salary:', error);
        res.status(500).json({ message: "Failed to create salary entry", error });
    }
};


/*import { Request, Response } from "express";
import { pool } from "../database/connection";

export const setSalary = async (req: Request, res: Response): Promise<void> => {
    const { userid, salary } = req.body;

    try{
        const query =
            `INSERT INTO "hour_salary" (userid, salary)
            VALUES ($1, $2) RETURNING *;
        `;
        const result = await pool.query(query, [userid, salary]);
        const userId = result.rows[0].id;

        res.status(201).json({ message: "Updated salary successfully", userId });
        } catch (error) {
        res.status(500).json({ message: "Salary post failed", error });
    }

};*/