import express from "express";
import { getAllEmployers,getUserDataAndSalary, addHours,addPermamentSalary, getUserHistory, paymentRequest,paymentDone,editUser,deleteUser, setHourSalary, getUnpaid} from "../controllers/userController";
import {authenticateToken} from "../middleware/authMiddleware";


export const userRouter = express.Router();

userRouter.get('/listemployers', getAllEmployers);
userRouter.post('/addhours', addHours);
userRouter.post('/addpermanentsalary',addPermamentSalary);
userRouter.get('/:userid/history', getUserHistory);
userRouter.get('/paymentrequest/:userid', paymentRequest);
userRouter.get('/paymentdone/:employerId/:employeeId',paymentDone)
userRouter.get('/getuserdata/:userid', getUserDataAndSalary);
userRouter.put('/edituser/:userid', editUser);
userRouter.delete('/deleteuser/:userId', deleteUser);
userRouter.post('/setHourSalary', authenticateToken, setHourSalary);
userRouter.get('/getUnpaid', authenticateToken, getUnpaid)


