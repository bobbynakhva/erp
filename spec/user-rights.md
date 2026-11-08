# User Rights

Form: `frmUserRights`. Opened from Master, Admin, User Rights by `mnuUserRight_Click`, which only does `NewIfNullPr frmUserRights`.

There is no photograph. The controls that exist are `lstUsers`, `msflex`, `cmdModify`, `cmdExit`, plus `Frame1`, `Frame2`, `Label2`, and `Label3`. Those two frames and two labels have no caption in the procedures, so they are not shown. The window caption is not in the procedures either. The heading used here is the menu name, User Rights.

This screen reads and writes the year database. `Form_Load` calls `clsProd.Get_Connection`. The user list is `user1`. The topic rows are `ViewRights`. The saved numbers are `userRights` (the load query spells it `userrights`; Access treats those as one table).

There is no factory picker. The factory is the signed-in account.

`Form_Unload` unregisters the screen log and leaves the connection. That log is not wired, same as Users and My Company Details. F1 sets the status line to `Help file: MasAdmUserRight.htm. That page is not in this copy.`

## Grid

`msflex.FormatString` is ` Topic                                      | Sub Topic                             |All|Read|Write|Modify|Delete`.

Columns: 0 Topic, 1 Sub Topic, 2 All, 3 Read, 4 Write, 5 Modify, 6 Delete. Column 7 is hidden and holds `ctrlKey`. Columns 2 through 6 are center aligned. The old grid draws a check as the Wingdings 2 character `P` and an empty cell as unchecked. This screen uses checkboxes. `P` is checked. Empty is unchecked.

The rows are `select * from ViewRights order by slNo`. Each row reads `Topic`, `SubTopic`, and `ctrlKey`. This copy has 80 of those rows in `DB2026_27.mdb`. The other columns on that table are the mixed dummy-schema columns and are not read. The 80 rows are stored per factory and year. Two `ctrlKey` values occur twice (`mnuUserRight`, `mnuPlanChart`). Both rows stay on the grid. They share one stored number, and the later row is the one written.

## Users

The list is `select * from user1 where userid<>1 order by UserName`. User id 1 is not in the list. CHECK26 is user code 1, so CHECK26 does not appear. A user created on the Users screen, with a code other than 1, is the user this screen can edit. Load selects the first name, which loads that user's row.

If the list item's ItemData equals 1, Modify is turned off and the grid is locked. That branch does not run for the list this screen builds.

The operator's `mnuUserRight` value enables Modify only when it is greater than 3. That value is not in this shell. Modify stays enabled when a user is selected. The same note as Users and My Company Details.

## Load into the checks

`select * from userRights where UserId=` the selected user. For each grid row, column 7 is the field name. If that field is greater than 0, Read is checked. Then:

- 12 also checks All, Write, Modify, and Delete
- 7 checks Write and Modify, and clears Delete and All
- 3 checks Write, and clears Modify, Delete, and All
- any other value above 0 leaves only Read
- 0 clears All, Read, Write, Modify, and Delete

A missing `userRights` row leaves the checks clear.

## Click

A click is ignored on the header row and on Topic and Sub Topic. The other columns toggle from the cell's current text. Empty becomes checked. `P` becomes cleared.

- All, when empty: check All, Read, Write, Modify, and Delete. When `P`: clear those five.
- Read, when empty: check Read only. When `P`: clear all five.
- Write, when empty: check Read and Write. When `P`: clear Write, Modify, Delete, and All. Read stays.
- Modify, when empty: check Read, Write, and Modify. When `P`: clear Modify, Delete, and All. Read and Write stay.
- Delete, when empty: check all five, the same as All. When `P`: clear Delete and All. The others stay.

## Modify

`cmdModify` is the only write. There is no New, Save, or Delete, and there is no Yes/No question.

It reads `select * from userRights where UserId=` the selected user. If that recordset is at EOF, the click returns. There is no message and no insert. A user created on the Users screen already has this row, with the user id only. A user who has no row cannot be stored from this button.

When the row exists, each grid row writes one number into the field named by column 7. The first match wins:

- All is `P`: 12
- else Modify is `P`: 7
- else Write is `P`: 3
- else Read is `P`: 1
- else 0

Delete is not read by the save. It only changes what gets stored when the click also sets or clears All. The recordset is updated. The message is `Data Stored Successfully...`, style `0x40`, title the factory name.

These numbers are the same ones the Users screen already uses for its buttons: 12, 7, 3, 1, and 0.

## Where a stored number takes effect

On the main window, after login, `select * from userRights where UserId=` the signed-in user. For each menu, if that field equals 0, the menu item is turned off. Any other stored number, including the year database's `-1` for user id 1, leaves the item on. A field that was never written is not 0, so that item stays on.

If that query is at EOF, the message is `User Rights for You has not been Made Contact Your Administrator`, style `0x10`, and the program ends. User id 1 in `DB2026_27.mdb` already has this row. Those values are copied for user code 1 when this copy has no row yet.

Inside Users, the operator's `mnuUser` value sets the buttons: 12 leaves New, Modify, and Delete on; 7 turns Delete off; 3 turns Delete and Modify off; 1 or 0 turns all four off. The value is read as a byte, so `-1` is 255 and matches none of those, which leaves the buttons as the form set them.

Inside this screen, Modify is enabled only when the operator's `mnuUserRight` byte is greater than 3.
