# Specification: Human Resource - Salary (`frmSalary`)

## 1. Overview
The **Salary** module (`frmSalary`) processes monthly payroll for factory and office staff. It calculates gross earnings, statutory deductions (PF, ESI, Professional Tax), voluntary deductions (TDS, Society, Insurance), recoveries (Salary Advance, Staff Loan), and net pay.
It directly integrates with:
- **Attendance (`frmAttendance`)**: Working days, days worked/present, leave days, and overtime hours.
- **Staff Loan (`frmStaffLoan`)**: Outstanding loan balances and automatic recovery deduction tracking in `staffloandedtrack`.
- **Staff Master (`staff`)**: Old balances (`payoldbal`), department, ESI code, PF code, and active status.
- **Misc (`misc`)**: PF percentage, ESI percentage, and print headers.

## 2. Legacy VB6 Bytecode Analysis & Controls
From bytecode analysis of `frmSalary` (`vbdec/87456437.txt`, `vbdec/1631013370.txt`, `vbdec/30153464.txt`, `vbdec/1100120676.txt`, `vbdec/1450042057.txt`, `vbdec/905819828.txt`, `vbdec/1991794081.txt`, `vbdec/948800287.txt`, `vbdec/157696121.txt`, `vbdec/1534427864.txt`):
- **Form Caption**: `SALARY`
- **Date & Period Selection**:
  - `txtSalYear` / UpDown: Year (defaults to current year)
  - `txtSalMonth` / UpDown: Month (1..12)
  - `dtpSalDate`: Payment / Calculation Date
- **Employee Selection**:
  - `lstStaff`: Employee list (displays active employees for the selected factory and period)
  - `dept`: Department from `staff`
- **Attendance & Working Days**:
  - `txtWorkingDays`: Total working days in month (loaded from month days or attendance)
  - `txtDaysPresent`: Days worked / present (from `attendance` matrix for month)
  - `txtLeaveDays`: Leave days (from `attendance` matrix for month)
  - `txtOT`: Overtime hours worked (from `attendance` overtime matrix)
- **Earnings Group**:
  - `txtBasic`: Basic Pay
  - `txtDA`: Dearness Allowance
  - `chkDA2PF`: Checkbox `"DA to PF"` (includes DA when computing PF)
  - `txtHRA`: House Rent Allowance
    - `optHRABasic`: Percentage of Basic
    - `optHRAFixed`: Fixed amount
  - `txtConveyance`: Conveyance Allowance
    - `OptConveyDay`: Per working day rate
    - `optConveyMonth`: Fixed monthly rate
  - `txtMedicalAllow`: Medical Allowance
  - `txtAttBonus`: Attendance Bonus
    - `chkAttBonus`: Checkbox Attendance Bonus (awarded if DaysPresent >= WorkingDays)
  - `txtSplAllow`: Special Allowance
  - `txtOTtimes`: Overtime multiplier / rate
    - `optOTBasic`: Overtime computed based on Basic rate `(Basic / WorkingDays / 8) * OT * OTtimes`
    - `optOTFixed`: Fixed OT rate `OT * OTtimes`
  - `txtMiscEarning`: Miscellaneous Earning
  - `txtOtherAllow`: Other Allowance
  - `txtGross`: Gross Salary (sum of all earnings)
- **Deductions Group**:
  - `chkPF`: Provident Fund checkbox & amount (from `misc.pf` %, default 12% on Basic + DA)
  - `chkESI`: ESI checkbox & amount (from `misc.esi` %, default 1.75% on Gross)
  - `chkPT`: Professional Tax checkbox & amount (from `professional_tax` table or slab)
  - `txtTDS`: Tax Deducted at Source
  - `txtSociety`: Society
  - `txtInsurance`: Insurance
  - `txtSalAdvance`: Salary Advance
  - `txtFines`: Fines
  - `txtDamageLoss`: Damage / Loss
  - `txtOtherDed`: Other Deductions
  - `txtLoan`: Staff Loan deduction (loads active loan monthly recovery from `staffloan`, updates balance and logs to `staffloandedtrack`)
  - `txtTotDed`: Total Deductions
- **Settlement Group**:
  - `txtOldBal`: Old Balance brought forward from previous month (`staff.payoldbal`)
  - `txtNetPay`: Net Pay = `Gross - TotDed + OldBal`
  - `txtPaid`: Amount Paid
  - `txtBal`: Remaining Balance = `NetPay - Paid` (carried forward to `staff.payoldbal`)
- **Actions**:
  - `cmdCalc`: Recalculate earnings, deductions, gross, and net pay
  - `cmdSave`: Save / Modify salary record
  - `cmdDelete`: Delete salary record and restore `payoldbal`
  - `cmdPrint`: Print individual payslip (exact layout matching legacy VB6)
  - `cmdPrintAll`: Print salary register / all payslips for the month
  - `cmdExit`: Close form

## 3. Exact VB6 Validations & Messages
1. **No Employee in List on Load**:
   - `MsgBox "Without Employee List, You cannot work in this screen"`
2. **Attendance Missing on Calc**:
   - If `txtWorkingDays <= 0`: `MsgBox "Without attendance Entry... Salary cannot be made!!!"`
3. **Missing Basic Pay on Calc**:
   - If `txtBasic <= 0`: `MsgBox "Enter the Basic Salary..."`
4. **OT Times Missing when OT Hours > 0**:
   - If `txtOT > 0 and txtOTtimes <= 0`: `MsgBox "Enter the OT times..."`
5. **Save Confirmation**:
   - `MsgBox "Are You Sure To Save?", vbYesNo + vbQuestion` or `"Are You Sure To Modify?", vbYesNo + vbQuestion`
6. **Save Success**:
   - `MsgBox "Record Stored successfully."`
7. **Delete Validation**:
   - If no record to delete: `MsgBox "No Data to Delete!!!"`
8. **Delete Confirmation**:
   - `MsgBox "Are You Sure To Delete?", vbYesNo + vbQuestion`
9. **Delete Success**:
   - `MsgBox "Record Deleted successfully."`

## 4. Database Schema
PostgreSQL table `salary`:
```sql
CREATE TABLE IF NOT EXISTS salary (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  factory_id integer NOT NULL REFERENCES factories(id),
  year_label text NOT NULL,
  salyear integer NOT NULL,
  salmonth integer NOT NULL,
  saldate date NOT NULL,
  staffid integer NOT NULL,
  dept text,
  workingdays double precision NOT NULL DEFAULT 0,
  dayspresent double precision NOT NULL DEFAULT 0,
  leavedays double precision NOT NULL DEFAULT 0,
  ot double precision NOT NULL DEFAULT 0,
  ottimes double precision NOT NULL DEFAULT 0,
  otbasic boolean NOT NULL DEFAULT true,
  basic double precision NOT NULL DEFAULT 0,
  da double precision NOT NULL DEFAULT 0,
  da2pf boolean NOT NULL DEFAULT false,
  hrabasic boolean NOT NULL DEFAULT true,
  hra double precision NOT NULL DEFAULT 0,
  conveyday boolean NOT NULL DEFAULT true,
  conveyance double precision NOT NULL DEFAULT 0,
  medicalallow double precision NOT NULL DEFAULT 0,
  attbonus double precision NOT NULL DEFAULT 0,
  attbonusapplicable boolean NOT NULL DEFAULT false,
  splallow double precision NOT NULL DEFAULT 0,
  miscearning double precision NOT NULL DEFAULT 0,
  otherallow double precision NOT NULL DEFAULT 0,
  gross double precision NOT NULL DEFAULT 0,
  pf double precision NOT NULL DEFAULT 0,
  pfapplicable boolean NOT NULL DEFAULT true,
  esi double precision NOT NULL DEFAULT 0,
  esiapplicable boolean NOT NULL DEFAULT true,
  pt double precision NOT NULL DEFAULT 0,
  ptapplicable boolean NOT NULL DEFAULT true,
  tds double precision NOT NULL DEFAULT 0,
  society double precision NOT NULL DEFAULT 0,
  insurance double precision NOT NULL DEFAULT 0,
  saladvance double precision NOT NULL DEFAULT 0,
  fines double precision NOT NULL DEFAULT 0,
  damageloss double precision NOT NULL DEFAULT 0,
  otherded double precision NOT NULL DEFAULT 0,
  loanamtded double precision NOT NULL DEFAULT 0,
  loandedid integer,
  totded double precision NOT NULL DEFAULT 0,
  netpay double precision NOT NULL DEFAULT 0,
  oldbal double precision NOT NULL DEFAULT 0,
  paid double precision NOT NULL DEFAULT 0,
  balance double precision NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_salary_factory_period_staff UNIQUE (factory_id, year_label, salyear, salmonth, staffid)
);
```

## 5. API Endpoints
- `GET /api/salary/init?year=<year>&month=<month>`:
  Returns months, active staff list, factory settings (`pf`, `esi` percentages from `misc`), and working days in month.
- `GET /api/salary?year=<year>&month=<month>&staffId=<id>`:
  Loads employee salary data if already created, or pulls default pay structure and attendance days from `attendance` and outstanding loans from `staffloan`.
- `POST /api/salary/calc`:
  Runs the exact business calculation formulas for earnings, deductions, gross, and net pay.
- `POST /api/salary/save`:
  Validates, saves/updates `salary` record, updates `staff.payoldbal`, updates `staffloan.balance`, and records deduction in `staffloandedtrack`. Returns `{ success: true, message: "Record Stored successfully." }`.
- `POST /api/salary/delete`:
  Deletes salary record, restores `staff.payoldbal` and restores any deducted loan balance. Returns `{ success: true, message: "Record Deleted successfully." }`.
- `GET /api/print?type=salary&year=<year>&month=<month>&staffId=<id>`:
  Generates individual payslip with exact legacy layout.
- `GET /api/print?type=salary-register&year=<year>&month=<month>`:
  Generates complete monthly salary register sheet for all staff.
