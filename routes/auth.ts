import express from "express";
import { register, login } from "../auth/authController";


export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
