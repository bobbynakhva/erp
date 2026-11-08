# Master → Human Resource → Shift Allocation

Form `frmShiftAlloc`. Year database (`Get_Connection`). Heading on the photograph: `Shift Allocation`.

The grid is every current employee (`StatusC=true`), ordered by name. Columns from the grid header, in order: Id, Staff Name, Week1, Week2, Week3, Week4, WEEKLY OFF. The photograph does not show Id, so that column is kept on the row and not shown. Week values are `Staff.W1` through `Staff.W4`. A stored week is the cell text plus one trailing space. The grid shows that text with the space trimmed. An empty cell is stored as one space.

Weekly off is `Staff.WOFF`. The cell is a weekday name. The names are `WeekdayName` for 1 through 7 with the first day Monday: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Save stores that index, 1 through 7. A stored 0 or blank shows a space. Load turns 1 through 7 back into the weekday name.

## Preparation date

The date starts as today. `Misc.ShiftPrepDate` then replaces it when that value is a date in `DD/MM/yyyy`. The button then reads Modify. When it is not a date, the date stays today and the button reads Save. This copy does not copy the photograph's `01/01/2026`.

Changing the date rewrites three labels:

- The weekday, `Format(date, "dddd")`.
- `Shift Start Date` and the Monday of that week. Monday is `date - Weekday(date, Monday) + 1`. The date text is the short date, shown here as `dd/mm/yyyy`.
- `Shift Start Week` and `Format(date, "ww")`. That format takes the machine's first day of the week, which is not in the procedure. This copy counts weeks from Sunday, the VB default.

The weekday box on the photograph is orange. Its colour number was not read.

## Editing

A click on Week1 through Week4 or WEEKLY OFF edits that cell. A click on another column of a data row edits Week1. Week cells accept only A, B, C, G, and backspace, one character, stored in capitals. WEEKLY OFF opens the weekday list. Choosing a day writes that name into the cell.

## Save

The button is enabled only when the signed-in user's `mnuShiftAlloc` byte is greater than 3. A stored `-1` is byte 255, so it stays enabled. The save procedure does not read the byte again.

Save is refused, with no further write, when:

- The grid has no employees: `No Staff List Found`.
- Week1 is blank: `Shift Not Properly Allocated to ` plus the staff name.
- Week2 is blank and Week3 or Week4 has text: the same message.
- Week2 has text, Week3 is blank, and Week4 has text: the same message.
- Weekly off is not one of the seven weekday names: `Improper Weekly Off!!! Entered For ` plus the staff name.

Week1 alone is allowed. Week4 may be blank when Week3 has text. The letters themselves are not checked again at save; the week editor already limits them.

The question is `Are You Sure To Save?` for both captions. Yes writes `ShiftPrepDate` on the existing Misc row and writes the five staff fields. It does not insert a Misc row. The message is `Records Saved Successfully`. The button then reads Modify.

## Print and Close

Print, when the button reads Save, asks `Do you want to save changes?`. Yes runs the save and stops. Otherwise, no employees gives `No data to Print...`. Employees call `clsExcelPrint` print preview. That sheet is not in this copy.

Close unloads the form. It does not ask to save.
