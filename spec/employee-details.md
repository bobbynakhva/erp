# Master → Human Resource → Employee Details

Form `frmStaff`. Year database. Heading on the photograph: `Master - Employee details`.

## Fields stored on `staff`

Required before save: employee id (zero is refused), employee name, sex, designation.

Sex is stored as true or false. The list itself is not in the procedures. The warning names `Male/Female`, and list index 0 is the true value, so Male is true and Female is false.

Empty optional text is stored as one space: father/husband name, department, PF code, ESI code, address, city, phone/email, other details. A save always sets `StatusC` true and writes the date of joining. It does not change the date of leaving.

A new id is one more than `Max(StaffId)`, or 1 when the table is empty. This copy of `Staff` has no rows.

## List and buttons

The list is employee names. Checked (the opening state): `statusC=true`, ordered by name. Unchecked: every employee, ordered by name. The count is the list length.

Save is enabled on New. On an existing row, Save is off and Modify runs the same save. The signed-in user's `mnuStaff` byte then changes the buttons the same way as Users: 12 leaves New, Modify, and Delete on; 7 turns Delete off; 3 turns Delete and Modify off; 1 or 0 turns all four off. Any other number, including the stored `-1`, leaves those defaults.

Delete asks, then removes the row when that id is not used on production, attendance, salary, or a staff loan. If it is used, the row stays, `StatusC` becomes false, and the leaving date is today. A row with a leaving date shows `Date of Leaving :` and the button reads Revoke. Revoke clears the leaving date and sets `StatusC` true.

Messages, unchanged: `Please Enter the  Employee ID.....`, `Please Enter the  Employee Name.....`, `Please Select the Sex as Male/Female...`, `Please Enter the designation.....`, `An Entry Already Exists...Try Another!`, `Records Saved!`, `Records Modified!`, `Records Deleted.`, `Record is now Revoked to the Current List of Employees`.

## Not on this screen

Leave allocation opens `frmLeave`. Correspondences stay off. Neither control is on the photograph. F1 names `MasHRStaff.htm`, which is not in this copy.
