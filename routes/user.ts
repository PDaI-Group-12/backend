import express from "express";
import {getUserDataAndSalary,addUserHistory,getUserHistory,paymentRequest} from "../controllers/userController";

export const userRouter = express.Router();

userRouter.get('/:userid', getUserDataAndSalary);
userRouter.post('/history', addUserHistory);
userRouter.get('/:userid/history', getUserHistory);
userRouter.get('/paymentrequest/:userid', paymentRequest);


