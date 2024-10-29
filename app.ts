import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import {indexRouter} from "./routes";
import {usersRouter} from "./routes/users";

export const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
})

app.use('/', indexRouter);
app.use('/users', usersRouter);