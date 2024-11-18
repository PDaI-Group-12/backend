import express from "express";
import { setHourSalary } from "../controllers/setSalary";
import {getUnpaid} from "../controllers/setSalary";
import {authenticateToken} from "../middleware/authMiddleware";

export const salaryRouter = express.Router();

// POST endpoint to create an entry in hour_salary
salaryRouter.post('/', authenticateToken, setHourSalary);
salaryRouter.get('/:userid/getUnpaid', authenticateToken, getUnpaid)


/*import express from "express";
import { setSalary} from "../controllers/setSalary";


export const salaryRouter = express.Router();

salaryRouter.post('/setSalary', setSalary);*/

