import express from "express";
import { getAllEmployees,getUserDataAndSalary, getUserHistory,editUser,deleteUser} from "../controllers/user/userController";
import {authenticateToken} from "../middleware/authMiddleware";

export const userRouter = express.Router();

userRouter.get('/employees', authenticateToken, getAllEmployees);
userRouter.get('/history', authenticateToken, getUserHistory);
userRouter.get('/', authenticateToken, getUserDataAndSalary);
userRouter.put('/', authenticateToken, editUser);
userRouter.delete('/', authenticateToken, deleteUser);