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

export const getUnpaid = async (req: Request, res: Response): Promise<void> => {
    console.log("request body", req.params);
    const { userid } = req.params;  // Get userid from request body

    try {
        // SQL query
        const query = `
            SELECT
                hour_salary.userid AS hour_userid,
                hour_salary.salary AS hour_salary,
                permanent_salary.userid AS permanent_userid,
                permanent_salary.salary AS permanent_salary
            FROM
                hour_salary
                    LEFT JOIN
                permanent_salary ON hour_salary.userid = permanent_salary.userid
            WHERE
                hour_salary.userid = $1
            UNION
            SELECT
                permanent_salary.userid AS hour_userid,
                NULL AS hour_salary,
                permanent_salary.userid AS permanent_userid,
                permanent_salary.salary AS permanent_salary
            FROM
                permanent_salary
                    LEFT JOIN
                hour_salary ON permanent_salary.userid = hour_salary.userid
            WHERE
                permanent_salary.userid = $1

        `;
        const result = await pool.query(query, [Number(userid)]);  // Execute query


        if (result.rowCount === 0) {
            res.status(404).json({ message: "No unpaid salaries found for this user" });
            return;
        }

        // Prepare response to simplify and make it more readable
        const response: any = {
            hour_salary: [],
            permanent_salary: []
        };

        result.rows.forEach(row => {
            // Add to hour_salary if it exists
            if (row.hour_salary !== null) {
                response.hour_salary.push({
                    userid: row.hour_userid,
                    salary: row.hour_salary
                });
            }

            // Add to permanent_salary if it exists
            if (row.permanent_salary !== null) {
                response.permanent_salary.push({
                    userid: row.permanent_userid,
                    salary: row.permanent_salary
                });
            }
        });

        // Remove empty arrays from the response
        if (response.hour_salary.length === 0) delete response.hour_salary;
        if (response.permanent_salary.length === 0) delete response.permanent_salary;

        // Return simplified salary response
        res.json(response);
    } catch (error) {
        console.error("Error fetching user history:", error);
        res.status(500).json({ message: "Error fetching user history", error });
    }
};