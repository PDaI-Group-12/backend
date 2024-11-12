import express from "express";
import {getUserDataAndSalary,addUserHistory,getUserHistory } from "../controllers/userController";

export const userRouter = express.Router();


userRouter.get('/:userId', getUserDataAndSalary);
// Reitti, jossa haetaan käyttäjän historia userId:n perusteella
userRouter.get('/:userid/history', getUserHistory);
userRouter.post('/history',addUserHistory);

