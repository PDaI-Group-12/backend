import { Request, Response } from "express";
import { pool } from "../../database/connection";
import {AuthenticatedRequest} from "../auth/types";
import {UserHistory, User, EditUserRequestBody, UpdatedUser, Employer, DeletedUser} from "./types";

/*
List of functions:
- getUserDataAndSalary
- GetUserHistory
- GetAllEmployees
- editUser
- deleteUser
*/


// getUserDataAndSalary - fetch user data along with hourly salary based on user ID

/**
 * @swagger
 * /user/:
 *   get:
 *     summary: Get user data and hourly salary
 *     description: Fetches the logged-in user's data along with their hourly salary.
 *     responses:
 *       200:
 *         description: User data and salary returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The user's ID
 *                     firstname:
 *                       type: string
 *                       description: The user's first name
 *                     lastname:
 *                       type: string
 *                       description: The user's last name
 *                     role:
 *                       type: string
 *                       description: The user's role (e.g., employee, employer)
 *                     iban:
 *                       type: string
 *                       description: The user's IBAN (International Bank Account Number)
 *                 hourlySalary:
 *                   type: integer
 *                   description: The user's hourly salary or a message if salary data is unavailable
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

export const getUserDataAndSalary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = req.user; // Access user info from the middleware
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
        const result = await pool.query(userDataQuery, [userid]);  // Execute query with userId


        // If no user is found, return 404 error
        if (result.rowCount === 0) {
            console.log(`User with ID ${userid} not found.`);
            res.status(404).json({ message: "User not found" });
            return;
        }

        // If user is found, send user data and salary in response
        const userData: User = result.rows[0];

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

/**
 * @swagger
 * /user/history:
 *   get:
 *     summary: Get user's salary history
 *     description: Fetches the total hours worked and permanent salary for the logged-in user.
 *     responses:
 *       200:
 *         description: User history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     userid:
 *                       type: integer
 *                       description: The user's ID
 *                     totalhours:
 *                       type: integer
 *                       description: Total hours worked by the user
 *                     permanentsalary:
 *                       type: integer
 *                       description: Total permanent salary accumulated by the user
 *       404:
 *         description: No history found for the user
 *       500:
 *         description: Internal server error
 */

export const getUserHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = req.user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        // SQL query to get the user's history (worked hours)
        const query = `
            SELECT COALESCE(SUM(hours)::integer, 0) AS totalhours,
                   COALESCE(SUM(permanent)::integer, 0) AS permanentsalary
            FROM history
            WHERE userid = $1;
            `;
        const result = await pool.query(query, [userid]); // Execute query to fetch history

        // If no history is found, return 404 error
        if (result.rowCount === 0) {
            res.status(404).json({ message: "No history found for this user" });
            return;
        }

        // Extract totals from query result
        const { totalhours, permanentsalary }: UserHistory = result.rows[0];

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


// GetAllEmployees - get all employers from the user table

/**
 * @swagger
 * /user/employees:
 *   get:
 *     summary: Get all employees
 *     description: Fetches all users with the role of 'user'.
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The ID of the employee
 *                   firstname:
 *                     type: string
 *                     description: The first name of the employee
 *                   lastname:
 *                     type: string
 *                     description: The last name of the employee
 *       404:
 *         description: No employees found
 *       500:
 *         description: Internal server error
 */


export const getAllEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT id, firstname, lastname 
            FROM "user" 
            WHERE LOWER("role") != 'employer'
            `;
        const result = await pool.query<Employer>(query);

        if (result.rows.length === 0) {
            res.status(404).json({ message: "No employees found" });
            return;
        }

        res.status(200).json({
            message: "Employees retrieved successfully",
            employees: result.rows,
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ error: "Failed to fetch employees" });
    }
};


// Edit user

/**
 * @swagger
 * /user/edit:
 *   put:
 *     summary: Edit user data
 *     description: Edits the logged-in user's data.
 *     parameters:
 *       - in: body
 *         name: user
 *         description: User data to be updated
 *         schema:
 *           type: object
 *           properties:
 *             firstname:
 *               type: string
 *             lastname:
 *               type: string
 *             role:
 *               type: string
 *             iban:
 *               type: string
 *
 *     responses:
 *       200:
 *         description: User data updated successfully
 *       400:
 *         description: No fields provided for update
 *       404:
 *         description: User not found
 */

export const editUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user; // Accessing user info from the token
    const userid = user?.id;


    try {

        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        const { firstname, lastname, role, iban }: EditUserRequestBody = req.body;

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

        const result = await pool.query<UpdatedUser>(query, values);

        if (result.rowCount === 0) {
            res.status(404).json({ message: `User with ID not found` });
            return;
        }

        const updatedUser: UpdatedUser = result.rows[0];
        res.status(200).json({
            message: "User data updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).json({ message: "Error updating user", error });
    }
};


// deleteUser

/**
 * @swagger
 * /user/delete:
 *   delete:
 *     summary: Delete user account and associated data
 *     description: Deletes the logged-in user's account and associated data.
 *     responses:
 *       200:
 *         description: User and associated data deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to delete user
 */

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user; // Accessing user info from the token
    const userid = user?.id;

    try {
        const checkUserQuery = `
            SELECT id FROM "user" 
            WHERE id = $1
        `;
        const userExists = await pool.query<DeletedUser>(checkUserQuery, [userid]);

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
        const deleteResult = await pool.query<DeletedUser>(deleteQuery, [userid]);

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
