export interface ErrorResponse {
    message: string;
    error?: any; // Optional additional debug information
}

export interface RequestDetails {
    userid: number;
    hours: number;
    salary?: number; // Optional for unpaid permanent salaries
    requestDate?: string;
}

export interface PermanentSalary {
    userid: number;
    salary: number;
}

export interface PaymentRequestData {
    userid: number;
    unpaid_hours: number;
    hourlySalary: number;
    unpaid_permanent_salaries: number;
    totalSalary: number;
}

export interface PaymentRequestResponse {
    message: string;
    data: PaymentRequestData;
}

export interface PaymentDoneData {
    employeeId: number;
    totalHours: number;
    hourlySalary: number;
    permanentSalary: number;
    totalSalary: number;
}

export interface PaymentDoneResponse {
    message: string;
    data: PaymentDoneData;
}

export interface SetHourSalaryResponse {
    message: string;
    data?: {
        userid: number;
        salary: number;
    };
    error?: any;
}

export interface EditHourSalaryResponse {
    message: string;
    data?: {
        employeeId: string;  // employeeId should be a string (from `req.params`)
        newSalary: number;   // new hourly salary
    };
    error?: any;  // This is optional for any error that might occur
}

export interface GetUnpaidResponse {
    message: string;
    data?: {
        userid: number; // The user ID
        unpaid_hours: number; // Total unpaid hours
        hourlySalary: number; // The hourly salary for the user
        unpaid_permanent_salaries: number; // Unpaid permanent salaries
        totalSalary: number; // The total salary (calculated from unpaid hours and permanent salary)
    };
    error?: any; // Optional error field
}
export interface UnpaidRecord {
    userid: number;
    firstname: string;
    lastname: string;
    unpaid_hours: number;
    hourlySalary: number;
    unpaid_permanent_salaries: number;
    totalSalary: number;
}

export interface GetAllUnpaidResponse {
    message: string;
    data?: UnpaidRecord[];
    error?: any;
}