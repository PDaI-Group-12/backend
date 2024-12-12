export interface User {
    id: number;
    firstname: string;
    lastname: string;
    role: string;
    iban: string;
    salary: number | null;
}

export interface UserHistory {
    userid: number;
    totalhours: number;
    permanentsalary: number;
}

export interface Employee {
    username: string;
    firstname: string;
    lastname: string
}

export interface EmployerEmployeesResponse {
    message: string;
    employees: Employee[];
}

export interface Employer {
    id: number;
    firstname: string;
    lastname: string;
}

export interface EditUserRequestBody {
    firstname?: string;
    lastname?: string;
    role?: string;
    iban?: string;
}

export interface UpdatedUser {
    id: number;
    firstname: string;
    lastname: string;
    role: string;
    iban: string | null; // IBAN could be nullable
}

export interface DeletedUser {
    id: number;
}

