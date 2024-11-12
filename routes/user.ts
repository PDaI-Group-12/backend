import express from "express";
import {getUserDataAndSalary } from "../controllers/userController";

export const userRouter = express.Router();


userRouter.get('/:userId', getUserDataAndSalary);
