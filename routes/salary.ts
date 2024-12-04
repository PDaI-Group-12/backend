import express from "express";
import {addHours, addPermanentSalary, paymentRequest, paymentDone, setHourSalary, getUnpaid, editHoursalary} from "../controllers/salary/salaryController"; // Updated import
import { authenticateToken } from "../middleware/authMiddleware";

export const salaryRouter = express.Router();

// Define routes for salary-related operations
salaryRouter.post('/hours', authenticateToken, addHours);
salaryRouter.post('/permanent', authenticateToken, addPermanentSalary);
salaryRouter.post('/hourly', authenticateToken, setHourSalary);
salaryRouter.get('/unpaid', authenticateToken, getUnpaid);
salaryRouter.put('/:employeeId/salary/edithourly', authenticateToken, editHoursalary);


salaryRouter.get('/payment/request', authenticateToken, paymentRequest);
salaryRouter.get('/:employeeId/payment/:employerId', authenticateToken, paymentDone);