# Specification: Human Resource - Attendance (`frmAttendance`)

## 1. Overview
The **Attendance** module (`frmAttendance`) records monthly staff attendance and overtime hours, as well as monthly holidays.
It features a multi-day flexgrid where:
- Active staff are filtered based on their Date of Joining (`doj`) and Date of Leaving (`dol`):
  `SELECT * FROM staff WHERE staffid IN (SELECT staffid FROM staff WHERE doj <= #endOfMonth# AND (dol >= #startOfMonth# OR dol IS NULL)) ORDER BY staffid`
- Each staff member has two alternating rows:
  - **Row 1**: Attendance status code for each day (1 to days in month):
    - `P`: Present
    - `L`: Leave
    - `M`: Half a day Leave
    - `A`: Absent
    - `N`: Half a Day Absent
    - `H`: Holiday
    - `' '`: Unrecorded
  - **Row 2**: Overtime hours (`OT hrs`), recorded as decimal values.
- Holiday list (`lstHoliday`) allows checking/unchecking days. Checking a day marks it as a holiday (`'1'`), auto-populates `'H'` for all staff rows on that day, and highlights the column in the grid.
- Attendance codes are stored in `attendance.ldetail` (a string of length equal to days in month).
- Overtime values are stored in `attendance.otdetail` (comma-separated float values).
- Holidays are stored in `holidays.holidays` (a binary string of `'0'` and `'1'`).

## 2. Database Schema

### Table: `month1`
- `monthid` (INTEGER, PRIMARY KEY)
- `monthname` (VARCHAR(20))
Pre-seeded with 12 months (January..December).

### Table: `holidays`
- `id` (SERIAL PRIMARY KEY)
- `factory_id` (INTEGER NOT NULL DEFAULT 1)
- `year_label` (TEXT NOT NULL)
- `year` (INTEGER NOT NULL)
- `monthid` (INTEGER NOT NULL)
- `holidays` (TEXT NOT NULL DEFAULT '')
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- UNIQUE constraint on `(factory_id, year_label, year, monthid)`

### Table: `attendance`
- `id` (SERIAL PRIMARY KEY)
- `factory_id` (INTEGER NOT NULL DEFAULT 1)
- `year_label` (TEXT NOT NULL)
- `year` (INTEGER NOT NULL)
- `monthid` (INTEGER NOT NULL)
- `staffid` (INTEGER NOT NULL)
- `ldetail` (TEXT NOT NULL DEFAULT '')
- `otdetail` (TEXT NOT NULL DEFAULT '')
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- UNIQUE constraint on `(factory_id, year_label, year, monthid, staffid)`

## 3. Endpoints

### 1. `GET /api/attendance`
Query parameters:
- `year` (INTEGER, optional, defaults to current year)
- `monthId` (INTEGER, optional, defaults to current month 1..12)

Response:
```json
{
  "year": 2026,
  "monthId": 11,
  "monthName": "November",
  "daysInMonth": 30,
  "months": [
    { "monthid": 1, "monthname": "January" },
    ...
  ],
  "holidays": "000000100000010000001000000100",
  "staff": [
    {
      "staff_id": 1,
      "staff_name": "John Doe",
      "ldetail": "PPPPPP HPPPPPP HPPPPPP HPPPPPP",
      "otdetail": "0,0,1.5,0,0,0,0,..."
    }
  ]
}
```

### 2. `POST /api/attendance/save`
Request Body:
```json
{
  "year": 2026,
  "monthId": 11,
  "holidays": "000000100000010000001000000100",
  "records": [
    {
      "staffId": 1,
      "ldetail": "PPPPPP HPPPPPP HPPPPPP HPPPPPP",
      "otdetail": "0,0,1.5,0,0,0,0,..."
    }
  ]
}
```
Validation:
- If no staff in grid (`records.length === 0`): returns 400 with message `"No staff list available to save."`
Legacy Success Message:
- `"Data Stored Successfully ."` (with space before period).

### 3. `GET /api/print?type=attendance&year=...&monthId=...`
Generates printable monthly attendance report containing company header from `misc`, month/year header, staff roster, daily marks and OT hours, and attendance legend.

## 4. UI Layout & Features
- Year input (`txtyear`), month selector list (`lstMonth`), active month display (`lblMonth`).
- Legend box (`lblLegend`):
  `P - Present`, `L - Leave`, `M - Half a day Leave`, `A - Absent`, `N - Half a Day Absent`, `H - Holiday`.
- Holiday checklist (`lstHoliday`) for days 1..daysInMonth with day names (`lblDay`).
- FlexGrid table with 2 rows per employee (`Sl`, `StaffId`, `Name`, columns `1`..`daysInMonth`).
- Save (`cmdSave`), Print (`cmdPrint`), and Close (`cmdExit`) actions.
