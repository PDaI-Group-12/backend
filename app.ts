import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import {indexRouter} from "./routes";
import {usersRouter} from "./routes/users";
import {pool} from "./database/connection";

export const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
    pool.connect((err) => {
        if(err){
            console.error('Connection Error', err.stack);
        } else {
            console.log('Connected to the database');
        }
    });
})

app.use('/', indexRouter);
app.use('/users', usersRouter);