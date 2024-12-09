import { Request, Response } from "express";
import nodemailer from 'nodemailer';
import { pool } from "../../database/connection";
import { AuthenticatedRequest} from "../auth/types";
import {
    RequestDetails,
    ErrorResponse,
    PermanentSalary,
    PaymentRequestData,
    PaymentDoneData,
    SetHourSalaryResponse,
    EditHourSalaryResponse, GetUnpaidResponse
} from "../salary/types"

/* List of functions:
- addhours
- AddPermanent Salary
- PaymentRequest
- paymentDone
- SetHourSalary
- editHoursalary
- GetUnpaid (need to be updated, unpaid hours are stored in request table)
*/

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});


// addhours
/**
 * @swagger
 * /salary/hours:
 *   post:
 *     summary: Add working hours
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: The user's ID
 *                 example: 1
 *               hours:
 *                 type: integer
 *                 description: Number of hours to add
 *                 example: 30
 *     responses:
 *       201:
 *         description: Hours added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 entry:
 *                   type: object
 *                   properties:
 *                     userid:
 *                       type: integer
 *                       description: The user's ID
 *                     hours:
 *                       type: integer
 *                       description: Added hours
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

export const addHours = async (req: AuthenticatedRequest, res: Response<ErrorResponse| { message: string; entry: RequestDetails }>): Promise<void> => {
    const { hours } = req.body;  // Destructure userid and hours from request body
    const user = req.user; // Accessing user info from the token
    const userid = user?.id;

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

        const entry: RequestDetails = {
            userid: result.rows[0].userid,
            hours: result.rows[0].hours,
            requestDate: result.rows[0].requestDate,
        };

        res.status(201).json({ message: "Hours added successfully", entry });
    } catch (error) {
        console.error("Error adding hours:", error);
        res.status(500).json({ message: "Error adding hours", error });
    }
};


// AddPermanent Salary

/**
 * @swagger
 * /salary/permanent:
 *   post:
 *     summary: Add a permanent salary
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: The user's ID
 *
 *               salary:
 *                 type: integer
 *                 description: The permanent salary to set
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Permanent salary added successfully
 *       400:
 *         description: Invalid input
 */

export const addPermanentSalary = async (req: AuthenticatedRequest, res: Response<ErrorResponse | { message: string; entry: PermanentSalary }>): Promise<void> => {
    const { salary } = req.body;  // Destructure userid and hours from request body
    const user = req.user; // Accessing user info from the token
    const userid = user?.id;

    // Validate that hours is a positive number
    if (typeof salary !== "number" || salary <= 0) {
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

        const entry: PermanentSalary = {
            userid: result.rows[0].userid,
            salary: result.rows[0].salary,
        };

        res.status(201).json({ message: "Permanent salary added successfully", entry });
    } catch (error) {
        console.error("Error adding user history:", error);
        res.status(500).json({ message: "Error adding permanent salary", error });
    }
};


// PaymentRequest


/**
 * @swagger
 * /salary/payment/request:
 *   post:
 *     summary: Send salary payment request to employer
 *     description: This endpoint allows the user to request salary payment by submitting details about unpaid hours and permanent salaries. It also sends an email notification to the employer.
 *     parameters:
 *       - in: body
 *         name: paymentRequestData
 *         description: Information about the payment request
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             userId:
 *               type: integer
 *               description: The user's ID
 *             amount:
 *               type: integer
 *               description: The requested payment amount
 *     responses:
 *       200:
 *         description: Payment request sent successfully, including unpaid hours and permanent salaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userid:
 *                   type: integer
 *                   description: The user's ID
 *                 unpaid_hours:
 *                   type: integer
 *                   description: Total unpaid hours for the user
 *                 hourlySalary:
 *                   type: integer
 *                   description: Hourly salary rate of the user
 *                 unpaid_permanent_salaries:
 *                   type: integer
 *                   description: Unpaid salary from permanent contracts
 *                 totalSalary:
 *                   type: integer
 *                   description: Total unpaid salary (sum of unpaid hours and permanent salary)
 *       400:
 *         description: Invalid user ID, missing user ID, or no unpaid salaries to request
 *       500:
 *         description: Internal server error
 */



export const paymentRequest = async (req: AuthenticatedRequest, res: Response<ErrorResponse | { message: string; data: PaymentRequestData }>): Promise<void> => {
    try {
        const user = req.user; // Access user info from the middleware
        const userid = user?.id;

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        if (!userid) {
            res.status(400).json({ message: "Missing userid" });
            return;
        }

        // Query to check how many unpaid hours
        const unpaidHoursQuery = `
            SELECT COALESCE(SUM(hours), 0) AS unpaid_hours
            FROM request
            WHERE userid = $1
            GROUP BY userid;
        `;
        const unpaidHoursResult = await pool.query(unpaidHoursQuery, [userid]);
        const unpaid_hours = unpaidHoursResult.rows[0]?.unpaid_hours ?? 0; // Total requested hours (default to 0 if not found)

        const hourSalaryQuery = `
            SELECT COALESCE(SUM(salary), 0) AS hourlySalary
            FROM hour_salary
            WHERE userid = $1
        `;

        const hourlySalaryResult = await pool.query(hourSalaryQuery, [userid]);

        const hourlySalary = hourlySalaryResult.rows[0]?.hourlysalary ?? 0;

        // Query to check for unpaid salaries in the permanent_salary table
        const unpaidPermanentSalaryQuery = `
            SELECT COALESCE(SUM(salary), 0) AS unpaid_permanent_salaries
            FROM permanent_salary
            WHERE userid = $1;
        `;
        const unpaidPermanentSalaryResult = await pool.query(unpaidPermanentSalaryQuery, [userid]);
        const unpaid_permanent_salaries = unpaidPermanentSalaryResult.rows[0]?.unpaid_permanent_salaries ?? 0; // Total unpaid salaries (default to 0 if not found)

        if (unpaid_hours <= 0 && unpaid_permanent_salaries <= 0) {
            res.status(400).json({ message: "No unpaid salaries to request" });
            return;
        }

        // Calculate total salary
        const totalSalary = (unpaid_hours * hourlySalary) + unpaid_permanent_salaries;

        // Send email notification
        try {
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: process.env.GMAIL_USER, // user.email, Assuming user object has an email field
                subject: 'Salary Payment Request Submitted',
                html: `
                    <h2>Salary Payment Request</h2>
                    <p>Dear ${user|| 'User'},</p>
                    <p>You have submitted a payment request with the following details:</p>
                    <ul>
                        <li>User ID: ${userid}</li>
                        <li>Unpaid Hours: ${unpaid_hours}</li>
                        <li>Hourly Salary Rate: ${hourlySalary}</li>
                        <li>Unpaid Permanent Salaries: ${unpaid_permanent_salaries}</li>
                        <li>Total salary: ${totalSalary}</li>
                    </ul>
                    <p>Your salary request is being processed.</p>
                    <br/>
                    <small>This is an automated email. Please do not reply.</small>
                `
            });
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Non-critical error, so we'll still return the payment request response
        }

        // Combine the total hours and unpaid salaries in the response
        res.status(200).json({
            message: "Unpaid salaries retrieved successfully",
            data: {
                userid,
                unpaid_hours,
                hourlySalary,
                unpaid_permanent_salaries,
                totalSalary

            }
        });
    } catch (error) {
        console.error("Error retrieving unpaid records:", error);
        res.status(500).json({ message: "Error retrieving unpaid records", error });
    }
};


// paymentDone

/**
 * @swagger
 * /salary/employeeId/payment/employerId:
 *   post:
 *     summary: Send payment done notification to employee
 *     description: Marks a payment as done for an employee, including salary details and email notification to the employer.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the employee
 *       - in: path
 *         name: employerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the employer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: integer
 *                 description: The employee's ID
 *               employerId:
 *                 type: integer
 *                 description: The employer's ID
 *     responses:
 *       200:
 *         description: Payment marked as done, and details moved to history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: integer
 *                   description: The employee's ID
 *                 totalHours:
 *                   type: integer
 *                   description: Total unpaid hours for the employee
 *                 hourlySalary:
 *                   type: integer
 *                   description: Hourly salary of the employee
 *                 permanentSalary:
 *                   type: integer
 *                   description: Unpaid permanent salary of the employee
 *                 totalSalary:
 *                   type: integer
 *                   description: The total salary paid (sum of unpaid hours and permanent salary)
 *                 message:
 *                   type: string
 *                   description: A success message confirming payment was processed
 *       404:
 *         description: Employee has no unpaid salary
 *       500:
 *         description: Internal server error
 */


export const paymentDone = async (req: AuthenticatedRequest, res: Response<ErrorResponse | { message: string; data: PaymentDoneData }>): Promise<void> => {
    try {
        const user = req.user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }
        const { employerId, employeeId } = req.params;

        // 1. Check if employerId is valid and user is employer
        const employerCheckQuery = `SELECT id, role FROM "user" WHERE id = $1 AND role = 'employer'`;
        const employerResult = await pool.query(employerCheckQuery, [employerId]);

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

        // 6. Calculate total salary
        const totalSalary = (totalHours * hourlySalary) + permanentSalary;

        // 7. Delete rows from `request` and `permanent_salary` tables
        await pool.query("BEGIN");

        // Delete from `request`
        const deleteRequestQuery = `
            DELETE FROM request 
            WHERE userid = $1
            `;
        await pool.query(deleteRequestQuery, [employeeId]);

        // Delete from `permanent_salary`
        const deletePermanentSalaryQuery = `
            DELETE FROM permanent_salary 
            WHERE userid = $1
            `;
        await pool.query(deletePermanentSalaryQuery, [employeeId]);

        // 8. Insert payment details into history table
        const historyInsertQuery = `
            INSERT INTO history (userid, hours, permanent)
            VALUES ($1, $2, $3)
            `;
        await pool.query(historyInsertQuery, [employeeId, totalHours, permanentSalary]);

        await pool.query("COMMIT"); // Commit the transaction

        // Send email notification
        try {
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: process.env.GMAIL_USER,
                subject: 'Salary Payment Done',
                html: `
                    <h2>Salary Payment</h2>
                    <p>Dear ${user?.firstname || 'User'},</p>
                    <p>Your payment has been processed:</p>
                    <ul>
                        <li>Employee ID: ${employeeId}</li>
                        <li>Total Hours: ${totalHours}</li>
                        <li>Hourly Salary Rate: ${hourlySalary}</li>
                        <li>Permanent Salary: ${permanentSalary}</li>
                        <li>Total Salary: ${totalSalary}</li>
                    </ul>
                    <p>Your salary is being paid.</p>
                    <br/>
                    <small>This is an automated email. Please do not reply.</small>
                `
            });
        } catch (emailError) {
            console.error("Error sending email:", emailError);
        }

        // 9. Send response
        res.status(200).json({
            message: "Payment processed and paid salaries moved to history successfully",
            data: {
                employeeId: parseInt(employeeId),
                totalHours,
                hourlySalary,
                permanentSalary,
                totalSalary,
            }
        });
    } catch (error) {
        await pool.query("ROLLBACK"); // Rollback transaction in case of error
        console.error("Error processing payment:", error);
        res.status(500).json({ message: "Error processing payment", error });
    }
};


// SetHourSalary

/**
 * @swagger
 * /salary/hourly:
 *   post:
 *     summary: Set a hourly salary
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: The user's ID
 *               hourlySalary:
 *                 type: integer
 *                 description: The hourly salary to set
 *                 example: 30
 *     responses:
 *       201:
 *         description: Hourly salary set successfully
 *       400:
 *         description: Invalid input
 */

export const setHourSalary = async (req: AuthenticatedRequest, res: Response<SetHourSalaryResponse>): Promise<void> => {
    const { salary } = req.body;
    const user = req.user; // Accessing user info from the token
    const userid = user?.id;

    // Basic input validation
    if (typeof userid !== 'number' || typeof salary !== 'number') {
        res.status(400).json({ message: "Invalid input. 'userid' and 'hourly salary' must be numbers." });
        return;
    }

    try {
        const query = `INSERT INTO hour_salary (userid, salary) VALUES ($1, $2) RETURNING *;`;
        const result = await pool.query(query, [userid, salary]);

        res.status(201).json({ message: "Hourly salary set successfully", data: result.rows[0] });
    } catch (error) {
        console.error('Error posting to hourly_salary:', error);
        res.status(500).json({ message: "Failed to set hourly salary", error });
    }
};


// editHoursalary

export const editHoursalary = async (req: AuthenticatedRequest, res: Response<EditHourSalaryResponse>): Promise<void> => {
/**
 * @swagger
 * /salary/:employeeId/edithourly:
 *   put:
 *     summary: Edit hourly salary
 *     parameters:
 *       - in: body
 *         name: salaryData
 *         description: User's new hourly salary
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             userId:
 *               type: integer
 *             newSalary:
 *               type: integer
 *               description: The new hourly salary
 *     responses:
 *       200:
 *       403:
 *         description: Only employers are allowed to update hourly salaries
 *       404:
 *         description: User not found
 */

    try {
        const user = req.user;
        const userId = user?.id;
        const { employeeId } = req.params;
        const { newSalary } = req.body;

        if (!userId || !employeeId || newSalary == null) {
            res.status(400).json({ message: "Missing required information." });
            return;
        }

        const employerCheckQuery = `
            SELECT role FROM "user" 
            WHERE id = $1 AND role = 'employer'
            `;
        const employerCheckResult = await pool.query(employerCheckQuery, [userId]);

        if (employerCheckResult.rowCount === 0) {
            res.status(403).json({ message: "Only employers are allowed to update hourly salaries." });
            return;
        }

        const employeeCheckQuery = `
            SELECT id FROM "user" 
            WHERE id = $1
            `;
        const employeeCheckResult = await pool.query(employeeCheckQuery, [employeeId]);

        if (employeeCheckResult.rowCount === 0) {
            res.status(404).json({ message: "Employee not found." });
            return;
        }

        const updateSalaryQuery = `
            UPDATE hour_salary
            SET salary = $1
            WHERE userid = $2
        `;
        await pool.query(updateSalaryQuery, [newSalary, employeeId]);

        res.status(200).json({
            message: "Hourly salary updated successfully.",
            data: {
                employeeId,
                newSalary,
            },
        });
    } catch (error) {
        console.error("Error updating hourly salary:", error);
        res.status(500).json({ message: "Internal server error.", error });
    }
};


// GetUnpaid

export const getUnpaid = async (req: AuthenticatedRequest, res: Response<GetUnpaidResponse>): Promise<void> => {
/**
 * @swagger
 * /salary/unpaid:
 *   get:
 *     summary: Get unpaid salaries
 *     description: This endpoint calculates and returns the total unpaid hours and salary for the authenticated user, including unpaid permanent salaries and hourly salaries.
 *     responses:
 *       200:
 *         description: A list of unpaid details for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userid:
 *                   type: integer
 *                 unpaid_hours:
 *                   type: integer
 *                   description: Total unpaid hours for the user
 *                 hourlySalary:
 *                   type: integer
 *                   description: Hourly salary rate of the user
 *                 unpaid_permanent_salaries:
 *                   type: integer
 *                   description: Unpaid salary from permanent contracts
 *                 totalSalary:
 *                   type: integer
 *                   description: Total unpaid salary (sum of unpaid hours and permanent salary)
 *       400:
 *         description: Invalid user ID, missing user ID, or no unpaid salaries to request
 *       500:
 *         description: Internal server error
 */

    try {
        const user = req.user;
        const userid = user?.id;

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        if (!userid) {
            res.status(400).json({ message: "Missing userid" });
            return;
        }

        // Query to check how many unpaid hours
        const unpaidHoursQuery = `
            SELECT COALESCE(SUM(hours), 0) AS unpaid_hours
            FROM request
            WHERE userid = $1
            GROUP BY userid;
        `;
        const unpaidHoursResult = await pool.query(unpaidHoursQuery, [userid]);
        const unpaid_hours = unpaidHoursResult.rows[0]?.unpaid_hours ?? 0; // Total requested hours (default to 0 if not found)

        const hourSalaryQuery = `
            SELECT COALESCE(SUM(salary), 0) AS hourlySalary
            FROM hour_salary
            WHERE userid = $1
        `;

        const hourlySalaryResult = await pool.query(hourSalaryQuery, [userid]);
        const hourlySalary = hourlySalaryResult.rows[0]?.hourlysalary ?? 0;

        // Query to check for unpaid salaries in the permanent_salary table
        const unpaidPermanentSalaryQuery = `
            SELECT COALESCE(SUM(salary), 0) AS unpaid_permanent_salaries
            FROM permanent_salary
            WHERE userid = $1;
        `;
        const unpaidPermanentSalaryResult = await pool.query(unpaidPermanentSalaryQuery, [userid]);
        const unpaid_permanent_salaries = unpaidPermanentSalaryResult.rows[0]?.unpaid_permanent_salaries ?? 0; // Total unpaid salaries (default to 0 if not found)

        if (unpaid_hours <= 0 && unpaid_permanent_salaries <= 0) {
            res.status(400).json({ message: "No unpaid salaries to request" });
            return;
        }

        // Calculate total salary
        const totalSalary = (unpaid_hours * hourlySalary) + unpaid_permanent_salaries;

        // Combine the total hours and unpaid salaries in the response
        res.status(200).json({
            message: "Unpaid salaries retrieved successfully",
            data: {
                userid,
                unpaid_hours,
                hourlySalary,
                unpaid_permanent_salaries,
                totalSalary

            }
        });
    } catch (error) {
        console.error("Error retrieving unpaid records:", error);
        res.status(500).json({ message: "Error retrieving unpaid records", error });
    }
};