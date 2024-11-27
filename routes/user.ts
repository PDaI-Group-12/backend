import express from "express";
import { getAllEmployers,getUserDataAndSalary, getUserHistory,editUser,deleteUser} from "../controllers/userController";
import {authenticateToken} from "../middleware/authMiddleware";

export const userRouter = express.Router();

userRouter.get('/employers', authenticateToken, getAllEmployers);
userRouter.get('/listhistory', authenticateToken, getUserHistory);
userRouter.get('/getuserdata', authenticateToken, getUserDataAndSalary);
userRouter.put('/edituser', authenticateToken, editUser);
userRouter.delete('/:id/deleteuser', authenticateToken, deleteUser);