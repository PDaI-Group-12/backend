import { Response } from "express";
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
    EditHourSalaryResponse,
    GetUnpaidResponse,
    UnpaidRecord,
    GetAllUnpaidResponse
} from "../salary/types"

/* List of functions:
- addhours
- AddPermanent Salary
- PaymentRequest
- paymentDone
- SetHourSalary
- editHoursalary
- GetUnpaid
*/

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});




// PaymentRequest


/**
 * @swagger
 * /salary/payment/request:
 *   get:
 *     summary: Send salary payment request to employer
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
 *     description: This endpoint allows the user to request salary payment by submitting details about unpaid hours and permanent salaries. It also sends an email notification to the employer.
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
 *         description: No unpaid salaries
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
            SELECT COALESCE(salary, 0) AS hourlySalary
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
                     <p>Dear ${user?.firstname || 'User'},</p>
                    <p>You have submitted a payment request with the following details:</p>
                    <ul>
                        <li>User Id: ${userid}</li>
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
            message: "Payment request sent successfully, including unpaid hours and permanent salaries",
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
 *   get:
 *     summary: Process salary payment for an employee
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
 *     description: Processes the payment for an employee, removes the unpaid hours and permanent salary records, logs the details in history, and sends a notification email.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the employee.
 *       - in: path
 *         name: employerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the employer.
 *     responses:
 *       200:
 *         description: Payment processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: integer
 *                   description: The employee's ID.
 *                 totalHours:
 *                   type: integer
 *                   description: Total unpaid hours.
 *                 hourlySalary:
 *                   type: integer
 *                   description: The hourly salary rate.
 *                 permanentSalary:
 *                   type: integer
 *                   description: Total unpaid permanent salary.
 *                 totalSalary:
 *                   type: integer
 *                   description: Total salary paid.
 *                 message:
 *                   type: string
 *                   description: Confirmation message.
 *       403:
 *         description: Only employers are allowed to process salary payments.
 *       404:
 *         description: Employee has no unpaid salary.
 *       500:
 *         description: Internal server error.
 */

export const paymentDone = async (req: AuthenticatedRequest, res: Response<ErrorResponse | { message: string; data: PaymentDoneData }>): Promise<void> => {
    try {
        const user = req.user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`
        const role = user?.role;
        console.log(req.user);

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }
        const { employeeId, employerId } = req.params;


        if (role !== 'employer') {
            res.status(403).json({ message: "Only employer is allowed to make salary payment" });
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

// GetUnpaid

export const getUnpaid = async (req: AuthenticatedRequest, res: Response<GetUnpaidResponse>): Promise<void> => {
    /**
     * @swagger
     * /salary/unpaid:
     *   get:
     *     summary: Get unpaid salaries
     *     tags:
     *     - Salary
     *     security:
     *         - bearerAuth: []
     *     description: This endpoint calculates and returns the total unpaid hours and salary for the authenticated user, including unpaid permanent salaries and hourly salaries.
     *     responses:
     *       200:
     *         description: Unpaid salaries retrieved successfully
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
            SELECT COALESCE(salary, 0) AS hourlySalary
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
// GetAllUnpaid

/**
 * @swagger
 * /salary/listunpaid:
 *   get:
 *     summary: List all unpaid salaries
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
 *     description: This endpoint calculates and returns the unpaid hours and salaries for the employer, including unpaid permanent salaries and hourly salaries.
 *     responses:
 *       200:
 *         description: Unpaid salaries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Status message indicating the success of the operation
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userid:
 *                         type: integer
 *                         description: Unique ID of the user
 *                       firstname:
 *                         type: string
 *                         description: First name of the user
 *                       lastname:
 *                         type: string
 *                         description: Last name of the user
 *                       iban:
 *                         type: string
 *                         description: IBAN of the user
 *                       unpaid_hours:
 *                         type: integer
 *                         description: Total unpaid hours for the user
 *                       hourlySalary:
 *                         type: integer
 *                         description: Hourly salary rate of the user
 *                       unpaid_permanent_salaries:
 *                         type: integer
 *                         description: Unpaid salary from permanent contracts
 *                       totalSalary:
 *                         type: integer
 *                         description: Total unpaid salary (sum of unpaid hours and permanent salary)
 *       400:
 *         description: No unpaid salaries found
 *       403:
 *         description: Unauthorized access (only employers can process salary payments)
 *       500:
 *         description: Internal server error
 */

export const getAllUnpaid = async (req: AuthenticatedRequest, res: Response<GetAllUnpaidResponse>): Promise<void> => {
    try {
        const user = req.user;
        const role = user?.role;

        // Validate that request is from an employer
        if (role !== 'employer') {
            res.status(403).json({ message: "Only employers are allowed to process salary payments." });
            return;
        }

        // Query to retrieve all unpaid records grouped by userid
        const unpaidRecordsQuery = `
            SELECT 
                u.id AS userid,
                u.firstname,
                u.lastname,
                u.iban,
                COALESCE(SUM(r.hours), 0) AS unpaid_hours,
                COALESCE(MAX(h.salary), 0) AS hourlySalary,
                COALESCE(SUM(p.salary), 0) AS unpaid_permanent_salaries,
                (COALESCE(SUM(r.hours), 0) * COALESCE(MAX(h.salary), 0)) + COALESCE(SUM(p.salary), 0) AS totalSalary
            FROM "user" u
            LEFT JOIN request r ON u.id = r.userid
            LEFT JOIN hour_salary h ON u.id = h.userid
            LEFT JOIN permanent_salary p ON u.id = p.userid
            GROUP BY u.id;
        `;

        const unpaidRecordsResult = await pool.query(unpaidRecordsQuery);

        // Map the result to match the expected structure (UnpaidRecord[])
        const unpaidRecords: UnpaidRecord[] = unpaidRecordsResult.rows.map((record: any) => ({
            userid: record.userid,
            firstname: record.firstname,
            lastname: record.lastname,
            iban: record.iban,
            unpaid_hours: record.unpaid_hours,
            hourlySalary: record.hourlysalary,
            unpaid_permanent_salaries: record.unpaid_permanent_salaries,
            totalSalary: record.totalsalary
        }));

        // Check if there are no unpaid records
        if (unpaidRecords.length === 0) {
            res.status(400).json({ message: "No unpaid salaries to request" });
            return;
        }

        // Respond with the list of unpaid records grouped by userid
        res.status(200).json({
            message: "Unpaid salaries retrieved successfully",
            data: unpaidRecords,  // 'data' should be an array of unpaidRecords
        });
    } catch (error) {
        console.error("Error retrieving unpaid records:", error);
        res.status(500).json({ message: "internal server error", error });
    }
};

// addhours
/**
 * @swagger
 * /salary/hours:
 *   post:
 *     summary: Add working hours
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
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
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
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


// SetHourSalary

/**
 * @swagger
 * /salary/hourly:
 *   post:
 *     summary: Set hourly salary
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
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
 *       403:
 *          description: Your hourly rate has been set. Only employer can now edit your hourly rate
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
        // Check if the hourly rate is already set for the user
        const checkQuery = `SELECT * FROM hour_salary WHERE userid = $1;`;
        const checkResult = await pool.query(checkQuery, [userid]);

        if (checkResult.rows.length > 0) {
            // Hourly rate already set
            res.status(403).json({ message: "Your hourly rate has been set. Only employer can now edit your hourly rate." });
            return;
        }

        // Insert new hourly rate
        const insertQuery = `INSERT INTO hour_salary (userid, salary) VALUES ($1, $2) RETURNING *;`;
        const insertResult = await pool.query(insertQuery, [userid, salary]);

        res.status(201).json({ message: "Hourly salary set successfully", data: insertResult.rows[0] });
    } catch (error) {
        console.error('Error posting to hourly_salary:', error);
        res.status(500).json({ message: "Failed to set hourly salary", error });
    }
};


// editHoursalary

export const editHoursalary = async (req: AuthenticatedRequest, res: Response<EditHourSalaryResponse>): Promise<void> => {
/**
 * @swagger
 * /salary/:employeeId/salary/edithourly:
 *   put:
 *     summary: Edit hourly salary
 *     tags:
 *     - Salary
 *     security:
 *         - bearerAuth: []
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




