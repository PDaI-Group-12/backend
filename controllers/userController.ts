import { Request, Response } from "express";
import { pool } from "../database/connection";

/*
List of functions:
- getUserDataAndSalary
- GetUserHistory
- GetAllEmployers
- editUser
- deleteUser
*/


// getUserDataAndSalary - fetch user data along with hourly salary based on user ID

export const getUserDataAndSalary = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        // SQL query to fetch user data and associated salary
        const userDataQuery = `
            SELECT "user".id, "user".firstname, "user".lastname, "user".role, "user".iban, hour_salary.salary
            FROM "user"
            LEFT JOIN hour_salary ON "user".id = hour_salary.userid
            WHERE "user".Id = $1
        `;
        const user_data = await pool.query(userDataQuery, [userid]);  // Execute query with userId
        console.log('User Data Query Result:', user_data.rows);

        // If no user is found, return 404 error
        if (user_data.rowCount === 0) {
            console.log(`User with ID ${userid} not found.`);
            res.status(404).json({ message: "User not found" });
            return;
        }

        // If user is found, send user data and salary in response
        const userData = user_data.rows[0];
        res.json({
            user: {
                id: userData.id,
                firstname: userData.firstname,
                lastname: userData.lastname,
                role: userData.role,
                iban: userData.iban
            },
            hourlySalary: userData.salary || "No salary data available"  // Return salary or a default message if not available
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error fetching user data", error });
    }
};


//GetUserHistory - fetch the user's history (sum of hours worked and permanent salaries)

export const getUserHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        // SQL query to get the user's history (worked hours)
        const query = `
            SELECT COALESCE(SUM(hours), 0) AS totalhours, COALESCE(SUM(permanent), 0) AS permanentsalary
            FROM history
            WHERE userid = $1
            `;
        const result = await pool.query(query, [userid]); // Execute query to fetch history

        // If no history is found, return 404 error
        if (result.rowCount === 0) {
            res.status(404).json({ message: "No history found for this user" });
            return;
        }

        // Extract totals from query result
        const { totalhours, permanentsalary } = result.rows[0];

        // Return the user's history in the response
        res.status(200).json({
            message: "History retrieved successfully",
            data: {
                userid,
                totalhours,
                permanentsalary
            },
        });
    } catch (error) {
        console.error("Error fetching user history:", error);
        res.status(500).json({ message: "Error fetching user history", error });
    }
};


// GetAllEmployers - get all employers from the user table

export const getAllEmployers = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT id, firstname, lastname 
            FROM "user" 
            WHERE "role" = 'employer'
            `;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log("No employers found");  // Log when no employers are found
            res.status(404).json({ message: "No employers found" });
            return;
        }

        res.status(200).json(result.rows);

    } catch (error) {
        console.error("Error fetching employers:", error);
        res.status(500).json({ error: "Failed to fetch employers" });
    }
};


// Edit user

export const editUser = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user; // Accessing user info from the token
    const userid = user?.id;
    const { firstname, lastname, role, iban } = req.body;

    try {
        if (!firstname && !lastname && !role && !iban) {
            res.status(400).json({ message: "No all required fields provided for update" });
            return;
        }

        const query = `
            UPDATE "user"
            SET
                firstname = COALESCE($1, firstname),
                lastname = COALESCE($2, lastname),
                role = COALESCE($3, role),
                iban = COALESCE($4, iban)
            WHERE id = $5
            RETURNING id, firstname, lastname, role, iban
            `;
        const values = [firstname, lastname, role, iban, userid];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            res.status(404).json({ message: `User with ID not found` });
            return;
        }

        res.status(200).json({
            message: "User data updated successfully",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).json({ message: "Error updating user", error });
    }
};


// deleteUser

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user; // Accessing user info from the token
    const userid = user?.id;

    try {
        const checkUserQuery = `
            SELECT id FROM "user" 
            WHERE id = $1
        `;
        const userExists = await pool.query(checkUserQuery, [userid]);

        if (userExists.rowCount === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const deleteHourSalaryQuery = `
            DELETE FROM hour_salary 
            WHERE userid = $1
            `;
        await pool.query(deleteHourSalaryQuery, [userid]);

        const deletePermanentSalaryQuery = `
            DELETE FROM permanent_salary 
            WHERE userid = $1
            `;
        await pool.query(deletePermanentSalaryQuery, [userid]);

        const deleteQuery = `
            DELETE FROM "user" 
            WHERE id = $1 
            RETURNING id
            `;
        const deleteResult = await pool.query(deleteQuery, [userid]);

        if (deleteResult.rowCount === 0) {
            res.status(500).json({ message: `Failed to delete user with ID ${userid}` });
            return;
        }

        const deletedUserId = deleteResult.rows[0].id;
        res.status(200).json({
            message: `User with ID ${deletedUserId} and their associated data deleted successfully`,
        });
    } catch (error) {
        console.error(`Error deleting user with ID ${userid}:`, error);
        res.status(500).json({ message: "Error deleting user and associated data", error });
    }
};
