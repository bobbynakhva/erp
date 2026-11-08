# Admin → User Status

Form `frmViewImpSys`. Menu `mnuUserStatus_Click` opens it. Year database (`Get_Connection`). Read only. One button, caption Close (`cmdOk`), unloads the form.

## What the screen shows

Company name: `Select CompName from License`, then uppercase. This copy: `Bhargavi Soft-Tech Pvt Ltd`, shown as `BHARGAVI SOFT-TECH PVT LTD`.

Total license credits: the number login stores from the license key. The login procedure writes `S08-10-040109-04-00300-01;Bilva Technologies Pvt. Ltd.` If that text is not empty and is not exactly `.`, characters 5–6 are the total. That is `10`. Otherwise the total is `1`. The status form does not read the key again.

Balance: that total minus `Select Max(SysId) from ImpSystems`. This copy's highest `SysId` is 7, so the balance is 3. The photograph's 4 is an older max, not a stored constant.

Implemented systems: `Select * from ImpSystems Order By SysId`. First column is `SysId`, then `SysDateT`, `SysName`, `SysIP`. Seven rows from this year's database. Six have a blank date. `SysId` 7 is dated `10/19/2026 14:47:18`.

Online users: `SELECT * From OnlineUsers WHERE Id in(Select Max(Id) from OnlineUsers Group By SysId,UserId)`. First column is the row count, then `DateT`, the `user1` name for `UserId`, and `SysName` / `SysIP` from `ImpSystems` for `SysId`. `OnlineUsers` has no rows in this copy, so the grid is empty. The photograph's CHECK26 row was a live session on the old program. The procedure that inserts those rows was not found, so this screen does not invent them.

## Not on this screen

Clicking an online row opens `frmViewUserScreens`. That form is not built. With no online rows, the click does not arise.

The menu item is already off when the signed-in user's `mnuUserStatus` is exactly 0. This form has no New, Save, Delete, or Modify.
