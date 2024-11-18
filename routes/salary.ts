import express from "express";
import { setHourSalary } from "../controllers/setSalary";
import {getUnpaid} from "../controllers/setSalary";

export const salaryRouter = express.Router();

// POST endpoint to create an entry in hour_salary
salaryRouter.post('/', setHourSalary);
salaryRouter.get('/:userid/getUnpaid', getUnpaid)


/*import express from "express";
import { setSalary} from "../controllers/setSalary";


export const salaryRouter = express.Router();

salaryRouter.post('/setSalary', setSalary);*/

