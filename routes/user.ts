import express from "express";
import {getUserDataAndSalary,addUserHistory,getUserHistory} from "../controllers/userController";

export const userRouter = express.Router();

userRouter.get('/:userId', getUserDataAndSalary);
userRouter.post('/history',addUserHistory);
userRouter.get('/:userid/history', getUserHistory);


