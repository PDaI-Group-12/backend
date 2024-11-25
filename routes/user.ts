import express from "express";
import { getAllEmployers,getUserDataAndSalary, addHours,addPermamentSalary, getUserHistory, paymentRequest,paymentDone,editUser,deleteUser, setHourSalary, getUnpaid} from "../controllers/userController";
import {authenticateToken} from "../middleware/authMiddleware";


export const userRouter = express.Router();

userRouter.get('/employers', authenticateToken, getAllEmployers);  // Fixed
userRouter.post('/:id/hours', authenticateToken, addHours);  //Fixed
userRouter.post('/addpermanentsalary', authenticateToken, addPermamentSalary); //Fixed
userRouter.get('/history', authenticateToken, getUserHistory);  // Fixed
userRouter.get('/paymentrequest', authenticateToken, paymentRequest); //Fixed
userRouter.get('/paymentdone/:employeeId/:employerId', authenticateToken, paymentDone)  // Fixed still to be encanhed
userRouter.get('/getuserdata', authenticateToken, getUserDataAndSalary);  //Fixed
userRouter.put('/edituser', authenticateToken, editUser);  // Fixed
userRouter.delete('/deleteuser', authenticateToken, deleteUser); // Fixed
userRouter.post('/setHourSalary', authenticateToken, setHourSalary); //Fixed
userRouter.get('/getUnpaid', authenticateToken, getUnpaid) //Fixed


