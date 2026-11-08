# Machine

Master → General → Machine. Form `frmMachine`. Year database (`Get_Connection` in Form_Load). Right key `mnuMachine`. Photograph `G:\ERP SS\MASTER\GENERAL\001_machine.png`. Title `MASTER - General - Machine`. Frame `Machine Details`. Correspondences stays off.

## Fields

Stored columns are the ones these procedures read: MachId, MachName, MachineHrRate, MachCapa, MachAccu, MachModel, OtherDet. The id is not shown. The name box is labelled `M/C Name / ID`.

Hour rate, capacity, accuracy, model, and other details are marked optional on the photograph. A blank optional text is stored as one space and shown trimmed. Hour rate is `Val` of the box (empty is 0) and shown as the number. New clears name, capacity, accuracy, model, and other details. New does not clear the hour rate.

## List and movement

The list is `Select MachName from Machine order by MachName Asc`. The caption is `List of Available Machines :` plus the count. Opening the screen loads `select * from Machine`, moves to the last row, and shows it. The web keeps that order by machine id. First, last, next, and previous show that row. Next past the end wraps to the first. Previous past the start wraps to the last. An empty recordset does nothing. Choosing a name from the list shows that machine.

## Buttons

Same numbers as Employee Details. While a machine is on screen, Save is off and New, Modify, and Delete are on. Byte 7 turns Delete off. Byte 3 turns Delete and Modify off. Byte 0 or 1 turns all four off. Any other byte, including the stored -1, leaves those view buttons. New turns Save on and New, Modify, and Delete off, and leaves the hour rate as it is. Typing in a field turns New and Delete off. Close unloads with no question.

## Save, modify, delete

Blank name: `Please Enter the Machine Name .....`

A name that already belongs to a different machine is refused. Access compares the text without case. Save says `An Entry Already Exists...Try Another!` Modify says `An Entry Already Exists... Try Another!`

Save asks `Are You Sure To Save ?` The title is the factory name. Yes inserts the row and says `Records Saved.` The list is refilled and the last machine is shown.

Modify asks `Are You Sure To Modify ?` The title is `Modification Confirmation`. Yes updates that id and says `Records Modified.`

Delete stops when that id is used in DailyProd: `This record cannot be deleted, Since this Machine Name is being used in 'Production Log' Screen !!!` Then when it is used in BrkDown: `This record cannot be deleted, Since this Machine Name is being used in 'Breakdown Maintenance' Screen !!!` Otherwise it asks `Are You sure to delete this Machine with the Maintainance Schedules?` Yes deletes the MaintainSch rows for that id, then the machine, and says `Records Deleted .` If a machine remains, the first one is shown. Those three tables are not in this database yet, so the checks find no rows until those screens exist.

An empty open says `No Records to Display!` and then starts a new machine. That message is not shown again after a delete.

F1 names `MasGenMach.htm`. That page is not in this copy. Screen locking stays unwired. Nothing is seeded.
