# Specification: Breakdown Maintenance, Calibration, and Conversion Utility

## 1. Overview
This specification details:
1. **Breakdown Maintenance (`frmBrkDnMaint`)**: Logs machine breakdowns, duration/timings, description, corrective action, costs incurred, and time spent.
2. **Calibration (`frmCalibrate`)**: Registry of measuring instruments and gauges, frequencies, ranges, least counts, due dates, and calibration certificate reports (`CalibrateRep`).
3. **Conversion Utility (`frmConv`)**: Offline engineering unit conversion calculator for Acceleration, Angle, Area, Computer, Concentration, Density, Distance/Length, Energy, Flow, Force, Light, Mass/Weight, Power, Pressure, Speed, Temperature, Time, Torque, and Volume.

## 2. Breakdown Maintenance (`frmBrkDnMaint`)
- **Fields**:
  - `id`: Breakdown ID
  - `machid`: Machine reference
  - `brkdate`: Breakdown date
  - `brkfrom`: Breakdown happened time/timestamp
  - `brkdet`: Breakdown description
  - `brkto`: Breakdown recovered time/timestamp
  - `detcorrect`: Corrective action taken
  - `amt`: Amount / repair expenses incurred
  - `timespent`: Downtime / repair duration
- **Validations & Messages**:
  - `Are You Sure To Save ?`
  - `Are You Sure To Modify ?`
  - `Are You Sure To Delete ?`
  - `Records Updated .`
- **Endpoints**:
  - `GET /api/breakdown?from=<date>&to=<date>`: Returns breakdowns within date range or all.
  - `POST /api/breakdown/save`: Saves or modifies breakdown record.
  - `POST /api/breakdown/delete`: Deletes breakdown record.

## 3. Calibration (`frmCalibrate`)
- **Fields**:
  - `itemid`: Instrument / Gauge name
  - `insgaugeid`: Serial number / Unique ID
  - `freq`: Frequency (months)
  - `range`: Measurement Range
  - `lc`: Least Count
  - `nextcalibrate`: Next calibration due date
  - `otherdet`: Remarks
- **Calibration Reports (`CalibrateRep`)**:
  - `calibrepid`: Report sequence ID
  - `id`: Instrument foreign key
  - `docalibrate`: Date of calibration
  - `calibrateno`: Certificate number
  - `calibratestat`: Status (e.g. "Accepted")
  - `calibratedet`: Calibration findings / error
  - `authorised`: Authorised laboratory / agency
- **Validations & Messages**:
  - Delete protection: `select id from CalibrateRep where id=...` -> if reports exist: `"You cannot delete this Record since it has some Calibration Reports already!!!"`
  - Confirmations: `Are You Sure To Save ?`, `Are You Sure To Modify ?`, `Are You Sure To Delete ?`
  - Success: `Records Updated .`, `Records Deleted`
- **Endpoints**:
  - `GET /api/calibrate`: Returns gauge registry, upcoming due calibrations, and report history.
  - `POST /api/calibrate/save`: Saves or modifies instrument record.
  - `POST /api/calibrate/delete`: Deletes instrument record (protecting instruments with report history).
  - `POST /api/calibrate/report/save`: Saves calibration certificate report and updates next due date.
  - `POST /api/calibrate/report/delete`: Deletes calibration report.

## 4. Conversion Utility (`frmConv`)
- **Supported Dimensions**:
  - Distance (meter, km, cm, mm, inch, feet, yard, mile, micron, nautical mile)
  - Mass (kg, gram, mg, ton, pound, ounce, quintal)
  - Temperature (Celsius, Fahrenheit, Kelvin)
  - Area (sq meter, sq ft, sq yard, sq inch, acre, hectare, sq km)
  - Pressure (bar, Pascal, kPa, psi, atm, mmHg, kg/cm2)
  - Volume (liter, ml, cubic meter, cubic cm, gallon, cubic ft, cubic inch)
  - Force (Newton, kN, kgf, dyne, lbf)
  - Speed (m/s, km/h, mph, knot, ft/s)
  - Power (Watt, kW, HP, metric HP)
  - Energy (Joule, kJ, kWh, calorie, kcal, BTU)
  - Angle (degree, radian, grad)
  - Time (sec, min, hour, day, week, month, year)
- **Features**:
  - Bidirectional instant calculation
  - Unit invert / swap button (`cmdInvert`)
