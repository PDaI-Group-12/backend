import { Request, Response } from "express";
import { pool } from "../database/connection";



// Get User data and Salary

// Fetch user data along with hourly salary based on user ID
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



//AddHours



export const addHours = async (req: Request, res: Response): Promise<void> => {
    const { hours } = req.body;  // Destructure userid and hours from request body
    const user = (req as any).user; // Accessing user info from the token
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

        res.status(201).json({ message: "Hours added successfully", entry: result.rows[0] });
    } catch (error) {
        console.error("Error adding hours:", error);
        res.status(500).json({ message: "Error adding hours", error });
    }
};



// AddPermanent Salary




export const addPermamentSalary = async (req: Request, res: Response): Promise<void> => {
    const { salary } = req.body;  // Destructure userid and hours from request body
    const user = (req as any).user; // Accessing user info from the token
    const userid = user?.id;

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
                permanentsalary,
            },
        });
    } catch (error) {
        console.error("Error fetching user history:", error);
        res.status(500).json({ message: "Error fetching user history", error });
    }
};

// PaymentRequest

export const paymentRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

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

        if (unpaid_hours <= 0 && hourlySalary<=0 && unpaid_permanent_salaries <= 0) {
            res.status(400).json({ message: "No unpaid hours or hourlysalaries or permanent salaries to request" });
            return;
        }

        // Combine the total hours and unpaid salaries in the response
        res.status(200).json({
            message: "Unpaid salaries retrieved successfully",
            data: {
                userid,
                unpaid_hours,
                hourlySalary,
                unpaid_permanent_salaries
            }
        });
    } catch (error) {
        console.error("Error retrieving unpaid records:", error);
        res.status(500).json({ message: "Error retrieving unpaid records", error });
    }
};


// GetAllEmployers



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

//type Role = "user" | "employer"

//PaymentDone


export const paymentDone = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user; // Access user info from the middleware
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

//Edit user

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
            message: "User updated successfully",
            user: result.rows[0],
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user", error });
    }
};

// Deleteuser

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

//Yhdistys alkaa


// SetHourSalary

export const setHourSalary = async (req: Request, res: Response): Promise<void> => {
    const { salary } = req.body;
    const user = (req as any).user; // Accessing user info from the token
    const userid = user?.id;

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

// GetUnpaid

export const getUnpaid = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user; // Access user info from the middleware
        const userid = user?.id; // Assuming the token contains the user ID as `id`

        // Validate the extracted userid
        if (typeof userid !== 'number') {
            res.status(400).json({ message: "Invalid user ID. Please log in again." });
            return;
        }

        // SQL query
        const query = `
            SELECT hour_salary.userid      AS hour_userid,
                   hour_salary.salary      AS hour_salary,
                   permanent_salary.userid AS permanent_userid,
                   permanent_salary.salary AS permanent_salary
            FROM hour_salary
                     LEFT JOIN
                 permanent_salary ON hour_salary.userid = permanent_salary.userid
            WHERE hour_salary.userid = $1
            UNION
            SELECT permanent_salary.userid AS hour_userid,
                   NULL                    AS hour_salary,
                   permanent_salary.userid AS permanent_userid,
                   permanent_salary.salary AS permanent_salary
            FROM permanent_salary
                     LEFT JOIN
                 hour_salary ON permanent_salary.userid = hour_salary.userid
            WHERE permanent_salary.userid = $1
        `;
        const result = await pool.query(query, [userid]); // Execute query with extracted userid

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

export const editHoursalary = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
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
            res.status(403).json({ message: "Only employers can update hourly salaries." });
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
