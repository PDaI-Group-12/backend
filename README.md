List of backend APIs

post 'auth/register' json: firstname, lastname, password, role, iban
post 'auth/login'  json: firstname, password
post 'salary/sethourSalary' json: userid,salary 
get 'salary/:userid/getUnpaid'

get 'user/listemployers'
post 'user/addhours' json: userid, hours
post 'user/addpermanentsalary' json: userid, salary 
get 'user/:userid/history'
get 'user/paymentrequest/:userid'
get 'user/paymentdone/:employerId/:EmployeeId'
get 'user/getuserdata/:userid'
put 'user/edituser/:userid' json: firstname,lastname,password,role,iban
delete 'user/deleteuser/:userId'


