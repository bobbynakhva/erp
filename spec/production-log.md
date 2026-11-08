# Production Log Specification (`frmProdn`)

## 1. Overview
The Production Log module tracks daily machine and operator production entries, rejected quantities, downtime constraints (machine idle time), and efficiency indicators (Target Qty, Full Target Qty, Work Efficiency %, Bonus Efficiency %).

- **Legacy VB6 Form**: `frmProdn`
- **Database Tables**:
  - `daily_prod`: Header/main log record containing factory_id, year_label, slno, machine_id, staff_id, customer_id, item_id, from_hr, to_hr, targ_qty, full_targ_qty, qty, rej_qty, mach_idle_time, work_eff, bonus_eff, rej_reason, remarks, category, prod_date, hrs.
  - `daily_prod_sub`: Stoppage/idle breakdown table containing factory_id, year_label, daily_prod_slno, slno, idle_hrs.
  - `prod_eff_constraints`: Setup table of production stoppage types and efficiency percentage penalties.

---

## 2. Shift Timings & Working Hours
Supported shifts:
- **A**: 06:00 to 14:00 (8.0 hrs)
- **B**: 14:00 to 22:00 (8.0 hrs)
- **C**: 22:00 to 06:00 (8.0 hrs overnight)
- **D**: 08:00 to 20:00 (12.0 hrs)
- **N**: 20:00 to 08:00 (12.0 hrs overnight)

Overnight calculations span across midnight:
$$\text{hours} = \text{toMinutes} < \text{fromMinutes} ? (1440 - \text{fromMinutes} + \text{toMinutes}) / 60 : (\text{toMinutes} - \text{fromMinutes}) / 60$$

---

## 3. Efficiency & Target Calculations
For item with cycle time $C > 0$ minutes:
- $\text{Full Target Qty} = \text{round}\left(\frac{\text{hours} \times 60}{C}, 1\right)$
- If idle time $= 0$:
  - $\text{Target Qty} = \text{Full Target Qty}$
  - $\text{Bonus Efficiency} = 0.00\%$
- If idle time $> 0$:
  - $\text{Target Qty} = \text{round}\left(\text{Full Target} - \sum \left(\text{round}\left(\frac{\text{minutes}_k}{C}, 1\right) \times \frac{\text{penaltyPerc}_k}{100}\right), 1\right)$
  - $\text{Bonus Efficiency} = \sum \left(\frac{\text{minutes}_k}{\text{hours} \times 60} \times \text{penaltyPerc}_k\right)\%$
- $\text{Work Efficiency} = \frac{\text{Qty} - \text{Rej Qty}}{\text{Full Target Qty}} \times 100\%$

---

## 4. Exact Legacy VB6 Validations
1. Machine:
   `"Select an existing MACHINE ....."`
2. Operator:
   `"Select an existing OPERATOR....."`
3. Customer:
   `"Select a CUSTOMER ....."`
4. Item:
   `"Select a ITEM/COMPONENT....."`
5. Produced Qty:
   `"Enter the Quantity..."`
6. Rejected Qty:
   `"Rejected Qty cannot be more than Qty Produced..."`
7. Idle Time:
   `"Your Total Idle Time should not Exceed the Total Available Time !!!"`
8. Production Timings Clash:
   `"Check the Timings of Production \r\n\r\nClick OK to see the timings you entered already..."`
9. Delete Confirmation:
   `"Are You sure to Delete this Record ?"`
10. Delete Success:
    `"Records Deleted ."`
11. Save Success:
    `"Record succussfully Saved!!!"`
12. Modify Success:
    `"Records Modified...."`

---

## 5. API Endpoints
- `GET /api/prodn`: Fetch lookup lists, pending operator list, or existing production record by slno / navigation direction (`first`, `prev`, `next`, `last`).
- `POST /api/prodn/calc`: Dynamically compute available hours, full target, target, bonus eff %, and work eff % given shift timings, cycle time, qty, rej, and downtime minutes.
- `POST /api/prodn/save`: Validate inputs, enforce clash constraints, insert or update `daily_prod` and `daily_prod_sub`.
- `POST /api/prodn/delete`: Confirm and delete log and downtime sub-records.
