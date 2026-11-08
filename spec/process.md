# Process

Form `frmProcessID`. Year database (`Get_Connection`). Right key `mnuProcID`.

Photograph `G:\ERP SS\MASTER\001_process.png`.

Title `Process`. Frame `Create Process here`. Fields on screen: Process Name and Hourly Rate. The process number (`ProcID`) is stored and is not shown. List heading `List of Available Processes:` with the row count. F1 opens help file `MasProcess.htm`. That page is not in this copy. Screen locking stays unwired.

New takes the next number after the highest `ProcID`, or 1 when the list is empty. It clears the name and the rate, turns Save on, and turns New, Delete, and Modify off.

Save adds a row. A blank name says `Please Enter the Process Name`. A blank rate says `Please enter the HourlyRate`. A name already used by another process says `An Entry Already Exists...Try Another.`. Confirm `Are You Sure To Save`. Success `Records Added`. Fields written: ProcID, ProcName, HrlyRate.

Modify changes the row with that number. It asks for the name again and does not ask for the rate again. A blank rate is stored as 0 because the modify procedure converts the box and does not refuse it. Confirm `Are You Sure To Modify`. A name used by another process says `An Entry Already Exists... Try Another.`. Success `Records Modified...`.

The rate box keeps digits, one decimal point, and backspace. Any key there turns New and Delete off. Enter moves to Save when Save is on, otherwise to Modify. Up arrow moves back to the name.

Typing in the name highlights the first list entry that starts with those letters. Enter copies that list entry into the name box and moves to the rate. It does not open the row. A click on the list opens the row.

Delete is refused when `estimate_sub` has that process number: `This record cannot be deleted, Since this Process Name is being used in 'Estimate' Screen!!!`. That table is not created on this screen. Otherwise confirm `Are You Sure To Delete` and say `Records Deleted`, then show the first remaining process.

The name list is alphabetical. First, previous, next, and last walk the processes by process number and wrap. Opening the screen shows the last process. An empty year says `No Records to Display!` and then starts New.

Button rights use the same 12 / 7 / 3 / 1-or-0 split as the other masters. A byte that matches none, including 255, is left as the form set it: Save off on a shown row, Save on after New. After a successful add, that same byte is not changed, so Save stays on. A second Save of that same process number is not written again. The old program has no sentence for that second Save.
