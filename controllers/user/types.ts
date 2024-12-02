export interface SalaryDetails {
    userid: number;
    amount: number;
    paymentDate: string;
}


export interface HourlySalary {
    userid: number;
    salary: number;
}

export interface PermanentSalary {
    userid: number;
    salary: number;
}

export interface UnpaidSalaries {
    hour_salary?: HourlySalary[];
    permanent_salary?: PermanentSalary[];
}

export interface ErrorResponse {
    message: string;
    error?: any; // Optional additional debug information
}


export interface RequestDetails {
    userid: number;
    hours: number;
    salary?: number; // Optional for unpaid permanent salaries
    requestDate: string;
}

export interface UserRoleCheckResult {
    role: string;
}

export interface EmployeeCheckResult {
    id: number;
}

export interface UnpaidSalary {
    userid: number;
    salary: number;
}

export interface UnpaidSalaries {
    hour_salary?: UnpaidSalary[];
    permanent_salary?: UnpaidSalary[];
}