# Master → Human Resource → Salary Headings

Form `frmColHeadingPR`. Year database. There is no photograph. The menu opens this form.

Three grids, filled in this order. Each reads `SalaryPrint` for one `Type`, ordered by `Id`.

| Grid | Type | Rows |
| --- | --- | --- |
| General | 1 | `Type=1` |
| Earnings | 2 | `Type=2` |
| Deductions | 3 | `Type=3` |

The frame captions are not in the procedure text. The names above are the grid names `msflexGEN`, `msflexEAR`, and `msflexDED`.

Each grid header is `Id`, `Name in Screen`, `Printed As`, `Print`. Those are `Id`, `ScrColName`, `PrintName`, and `IsPrint`. `IsPrint` true is shown as `P`. False is blank. The Print column is drawn in Wingdings 2, which makes `P` a tick. Clicking Print switches `P` and blank. Clicking another column edits Printed As. Name in Screen is not written back.

The form has no New button and does not insert rows. This copy of `SalaryPrint` was empty, so the grids had nothing to edit. When a year has no rows, the web loads the salary-screen names once.

Earnings and deductions are the salary grid row labels, in that order. `TOTAL EARNINGS` is id 12 and `TOTAL DEDUCTIONS` is id 25, because those are the ids the print-position formula treats as the totals. General holds the salary fields that are not in that grid: days, OT hours, net pay, staff name, and date of joining. Printed As starts as the same words, and Print starts ticked. A later Modify does not replace these names.

Enter or Down in Printed As moves to the next row in that grid when the text is not blank. Up moves to the previous row. The first row does not move up, and the last row does not move down.

## Modify

The button is enabled when the signed-in user's `mnuSalHead` byte is greater than 1. A stored `-1` is byte 255, so it stays enabled. Byte 0 or 1 leaves it off. The menu item itself is grey when the stored number is exactly 0.

Modify checks Earnings, then Deductions, then General. A blank Printed As stops the save with `Please enter the Print name for '` plus the Name in Screen plus `' in ` plus that grid's name.

Otherwise it asks `Are you sure to Modify?`. Yes writes `PrintName` and `IsPrint` for every row, then the print position:

- A printed earnings row uses row 6 and the next column, 1 through 7. After seven, it uses row 8. Id 12 is always row 8, column 5.
- A printed deductions row uses row 10 and the next column. After seven, it uses row 12. Id 25 is always row 12, column 6.
- An earnings or deductions row that is not printed stores row 0 and column 0.
- A general row does not change its stored row and column.

The message is `Records Stored Successfully`. Close unloads the form. F1 names `MasAdmUserRight.htm`, which is not in this copy. The screen lock is not wired.
