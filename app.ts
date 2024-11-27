import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { pool } from "./database/connection";
import { userRouter } from "./routes/user";
import { salaryRouter } from "./routes/salary";

export const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/salary',salaryRouter);

// Database connection and server start
app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
    pool.connect((err) => {
        if (err) {
            console.error('Database connection error:', err.stack);
        } else {
            console.log('Connected to the database');
        }
    });
});
