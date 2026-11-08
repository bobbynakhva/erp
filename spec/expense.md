# Expense Heads

Form `frmExpense`. Year database (`Get_Connection`). Right key `mnuExpense`.

Photograph `G:\ERP SS\MASTER\ACCOUNTS\001_expense.png`.

Title `MASTER - Accounts - Expense Heads`. Frame `Expense Details`. Fields: Expense Name, `* Description`, Expense Type with `Direct` and `InDirect`. New selects Direct. The expense number is stored and is not shown. List heading `List of Available Expense Heads :`. F1 names help file `MasCHExpen.htm`. That page is not in this copy.

The list and the record walk use `Expensecode > 4`. Codes 1, 2, 3, and 4 are not shown. Their names are not in the recovered program. A new number is the next number after the highest code, and it is never below 5, so a new head is visible.

A blank name says `Please Enter the Expense Name.....`. A name used by another code says `An Entry Already Exists...Try Another!`. Confirm `Are You Sure To Save ?` or `Are You Sure To Modify ?`. Success `Records Saved!` or `Records Modified!`. A blank description is stored as one space. `IsDirect` is true when Direct is selected.

Codes 1 to 4 cannot be modified (`This record cannot be Modified!!!`) and cannot be deleted (`Can't Delete this Expense. Since this record is used for Automatic Updations of CASH FLOW!!!`). Typing in the name or description of those codes is ignored.

If the expense table has only one row, delete says `Can't Delete this record!!!`. If `fund_trans` has that code as an expense, delete says `This record cannot be deleted, Since this Expense Head is being used in 'Payments Screen' !!!`. That table is not created on this screen. Otherwise confirm `Are You Sure To Delete ?` and say `Records Deleted .`, then show the first remaining head.

The name list is alphabetical. First, previous, next, and last walk the visible heads by code and wrap. Opening the screen shows the first visible head. An empty list says `No Records to Display!` and then starts New.

Button rights use the same 12 / 7 / 3 / 1-or-0 split. A byte that matches none, including 255, leaves Save off on a shown row and Save on after New.
