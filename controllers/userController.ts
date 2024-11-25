
import { Request, Response } from "express";
import { pool } from "../database/connection";

// Fetch user data along with hourly salary based on user ID
export const getUserDataAndSalary = async (req: Request, res: Response): Promise<void> => {
    const { userid } = req.params;  // Destructure userId from request parameters

    try {
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

// Add a new user history entry for the specified user
export const addHours = async (req: Request, res: Response): Promise<void> => {
    const { userid, hours } = req.body;  // Destructure userid and hours from request body

    // Validate that hours is a positive number
    if (hours <= 0) {
        res.status(400).json({ message: "Hours must be a positive number" });
        return;
    }

    try {
        // SQL query to insert history entry into the database
        const query = `
            INSERT INTO request (userid, hours)
            VALUES ($1, $2)
            RETURNING userid, hours
        `;
        const result = await pool.query(query, [userid, hours]);  // Execute query to insert data

        res.status(201).json({ message: "Hours added successfully", entry: result.rows[0] });
    } catch (error) {
        console.error("Error adding user history:", error);
        res.status(500).json({ message: "Error adding user history", error });
    }
};

export const addPermamentSalary = async (req: Request, res: Response): Promise<void> => {
    const { userid, salary } = req.body;  // Destructure userid and hours from request body

    // Validate that hours is a positive number
    if (salary <= 0) {
        res.status(400).json({ message: "Permanent salary must be positive value" });
        return;
    }

    try {
        // SQL query to insert history entry into the database
        const query = `
            INSERT INTO permanent_salary (userid, salary)
            VALUES ($1, $2)
                RETURNING userid, salary
        `;
        const result = await pool.query(query, [userid, salary]);  // Execute query to insert data

        res.status(201).json({ message: "Permanent salary added successfully", entry: result.rows[0] });
    } catch (error) {
        console.error("Error adding user history:", error);
        res.status(500).json({ message: "Error adding permanent salary", error });
    }
};

// Fetch the user's history (hours worked)
export const getUserHistory = async (req: Request, res: Response): Promise<void> => {
    const { userid } = req.params;  // Get userid from request body

    try {
        // SQL query to get the user's history (worked hours)
        const query = `
            SELECT id, userid, hours
            FROM history
            WHERE userid = $1
        `;
        const result = await pool.query(query, [userid]);  // Execute query to fetch history

        // If no history is found, return 404 error
        if (result.rowCount === 0) {
            res.status(404).json({ message: "No history found for this user" });
            return;
        }

        // Return the user's history in the response
        res.json({ history: result.rows });
    } catch (error) {
        console.error("Error fetching user history:", error);
        res.status(500).json({ message: "Error fetching user history", error });
    }
};

// Process a payment request based on total hours worked and remaining hours
export const paymentRequest = async (req: Request, res: Response): Promise<void> => {
    const { userid } = req.params;  // Get userid from request parameters

    if (!userid) {
        res.status(400).json({ message: "Missing userid" });
        return;
    }

    try {
        // Query to get total hours worked by the user from history
        const totalHoursQuery = `
            SELECT SUM(hours) AS total_hours
            FROM history
            WHERE userid = $1
            GROUP BY userid;
        `;
        const totalHoursResult = await pool.query(totalHoursQuery, [userid]);

        // If no history found for the user, return 404 error
        if (totalHoursResult.rowCount === 0) {
            res.status(404).json({ message: "No hours found for the user" });
            return;
        }

        const total_hours = totalHoursResult.rows[0].total_hours;  // Total hours worked

        // Query to check how many hours have already been requested for payment
        const requestedHoursQuery = `
            SELECT COALESCE(SUM(hours), 0) AS requested_hours
            FROM request
            WHERE userid = $1
            GROUP BY userid;
        `;
        const requestedHoursResult = await pool.query(requestedHoursQuery, [userid]);

        const requested_hours = requestedHoursResult.rows[0]?.requested_hours ?? 0;  // Total requested hours (default to 0 if not found)

        // Calculate remaining hours that can be requested
        const remaining_hours = total_hours - requested_hours;

        if (remaining_hours <= 0) {
            res.status(400).json({ message: "No remaining hours to request" });
            return;
        }

        // Insert the remaining hours as a new request entry in the database
        const insertQuery = `
            INSERT INTO request (userid, hours)
            VALUES ($1, $2)
            RETURNING userid, hours;
        `;
        const insertResult = await pool.query(insertQuery, [userid, remaining_hours]);

        // Return the payment request record
        res.status(201).json({
            message: "Payment request added successfully",
            request: insertResult.rows[0]
        });
    } catch (error) {
        console.error("Error adding payment request:", error);
        res.status(500).json({ message: "Error adding payment request", error });
    }
};

// Get all employers from the user table
export const getAllEmployers = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("Fetching employers...");  // Log for debugging

        const query = `SELECT id,firstname,lastname FROM "user" WHERE "role" = 'employer'`;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log("No employers found");  // Log when no employers are found
            res.status(404).json({ message: "No employers found" });
            return;
        }

        console.log("Employers found:", result.rows);  // Log when employers are found
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching employers:", error);
        res.status(500).json({ error: "Failed to fetch employers" });
    }
};

export const paymentDone = async (req: Request, res: Response): Promise<void> => {
    const { employerId, employeeId } = req.params;

    try {
        // 1. Check if employerId is valid and user is employer
        const employerCheckQuery = `SELECT id, role FROM "user" WHERE id = $1 AND role = 'employer'`;
        const employerResult = await pool.query(employerCheckQuery, [employerId]);

        if (employerResult.rowCount === 0) {
            res.status(403).json({ message: "Sorry, you are not authorized to make payment requests" });
            return;
        }

        // 2. Check if employee has unpaid salaries
        const salaryCheckQuery = `
            SELECT userid FROM request WHERE userid = $1
            UNION
            SELECT userid FROM permanent_salary WHERE userid = $1
        `;
        const salaryCheckResult = await pool.query(salaryCheckQuery, [employeeId]);

        if (salaryCheckResult.rowCount === 0) {
            res.status(404).json({ message: "Employee has no unpaid salaries" });
            return;
        }

        // 3. Sum of requested hours
        const hoursQuery = `
            SELECT COALESCE(SUM(hours), 0) AS total_hours 
            FROM request 
            WHERE userid = $1
            `;
        const hoursResult = await pool.query(hoursQuery, [employeeId]);
        const totalHours = hoursResult.rows[0]?.total_hours || 0;

        // 4. Fetch hourly salary
        const salaryQuery = `
            SELECT COALESCE(salary, 0) AS salary 
            FROM hour_salary 
            WHERE userid = $1
            `;
        const salaryResult = await pool.query(salaryQuery, [employeeId]);
        const hourlySalary = salaryResult.rows[0]?.salary || 0;

        // 5. Sum of unpaid permanent salaries
        const permanentSalaryQuery = `
            SELECT COALESCE(SUM(salary), 0) AS permanentsalary 
            FROM permanent_salary 
            WHERE userid = $1
            `;
        const permanentSalaryResult = await pool.query(permanentSalaryQuery, [employeeId]);
        const permanentSalary = permanentSalaryResult.rows[0]?.permanentsalary || 0;
        console.log('Permanent Salary Query Result:', permanentSalaryResult.rows);

        // 6. Calculate total salary
        const totalSalary = (totalHours * hourlySalary) + permanentSalary;

        // 7. Delete rows from `request` and `permanent_salary` tables
        await pool.query("BEGIN");

        // Delete from `request`
        const deleteRequestQuery = `DELETE FROM request WHERE userid = $1`;
        await pool.query(deleteRequestQuery, [employeeId]);

        // Delete from `permanent_salary`
        const deletePermanentSalaryQuery = `DELETE FROM permanent_salary WHERE userid = $1`;
        await pool.query(deletePermanentSalaryQuery, [employeeId]);

        // 8. Insert payment details into history table
        const historyInsertQuery = `
            INSERT INTO history (userid, hours, permanent)
            VALUES ($1, $2, $3)
        `;
        await pool.query(historyInsertQuery, [employeeId, totalHours, permanentSalary]);

        await pool.query("COMMIT"); // Commit the transaction

        // 9. Send response
        res.status(200).json({
            employeeId: employeeId,
            totalHours: totalHours,
            hourlySalary: hourlySalary,
            permanentSalary: permanentSalary,
            totalSalary: totalSalary.toFixed(2),
            message: "Payment processed and paid salaries moved to history successfully",
        });

    } catch (error) {
        await pool.query("ROLLBACK"); // Rollback transaction in case of error
        console.error("Error processing payment:", error);
        res.status(500).json({ message: "Error processing payment", error });
    }
};
