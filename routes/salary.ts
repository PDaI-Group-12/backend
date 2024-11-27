import express from "express";
import {addHours, addPermanentSalary, paymentRequest, paymentDone, setHourSalary, getUnpaid, editHoursalary} from "../controllers/salaryController"; // Updated import
import { authenticateToken } from "../middleware/authMiddleware";

export const salaryRouter = express.Router();

// Define routes for salary-related operations
salaryRouter.post('/:id/hours', authenticateToken, addHours);
salaryRouter.post('/addpermanentsalary', authenticateToken, addPermanentSalary);
salaryRouter.get('/paymentrequest', authenticateToken, paymentRequest);
salaryRouter.get('/paymentdone/:employeeId/:employerId', authenticateToken, paymentDone);
salaryRouter.post('/setHourSalary', authenticateToken, setHourSalary);
salaryRouter.get('/getUnpaid', authenticateToken, getUnpaid);
salaryRouter.put('/edithoursalary/:employeeId', authenticateToken, editHoursalary);
