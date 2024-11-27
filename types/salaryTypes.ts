export interface SalaryDetails {
    userid: number;
    amount: number;
    paymentDate: string;
}

export interface SalaryHistory {
    userid: number;
    salaryRecords: SalaryDetails[];
}
