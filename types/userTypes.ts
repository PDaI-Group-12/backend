export interface User {
    id: number;
    firstname: string;
    lastname: string;
    role: string;
    iban?: string;
}

export interface UserWithSalary extends User {
    salary: number | null;
}

export interface UserHistory {
    userid: number;
    totalhours: number;
    permanentsalary: number;
}

export interface EditUserRequestBody {
    firstname?: string;
    lastname?: string;
    role?: string;
    iban?: string;
}