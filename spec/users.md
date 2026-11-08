# Users

Form: `frmUserEntry`. Opened from Master, Admin, Users. Layout image: `G:\ERP SS\MASTER\ADMIN\001_users.png`.

This screen reads and writes the year database. `Form_Load` calls `clsProd.Get_Connection`, not `Get_Start`. The rows are `user1` for the year that was opened at login.

There is no factory picker. The factory is the signed-in account.

## What the picture shows

Window title: `MASTER - Admin - User`, in blue.

Left frame, caption `User Details`:

- `txtUserName`, label User Name
- `txtUserPassword`, label Password
- `txtConfmPwd`, label ConfirmPassword
- `lblPwd`, red, under the confirm box

Right side: `lstNames`, caption `List of Available Users :`.

Along the bottom: `cmdNew` New, `cmdSave` Save, `cmdModify` Modify, `cmdDelete` Delete, then `cmdMoveFirst` `|<<`, `cmdMovePrevious` `<<`, `cmdMoveNext` `>>`, `cmdMoveLast` `>>|`, then `cmdExit` Close.

`txtUserId` exists and is disabled on load. It is not on the photograph, so it stays off this screen. The number is still kept and written.

`lblNos` is set to the list count. It is not on the photograph, so it stays off this screen.

The photograph's red label reads `Click me to Show Password`. `Form_Load` sets the caption to `Hide Password` and then calls `lblPwd_Click`. That click sees a caption other than `Show Password`, so it masks both password boxes with `*` and sets the caption to `Show Password`. The running caption is therefore `Show Password`. A later click, while the caption is `Show Password`, clears the mask and sets the caption to `Hide Password`. The toggle compares those two strings. The longer photograph phrase is the design-time caption and is not the string the click compares.

## Load

`Select * from user1`. If the recordset is not at EOF, move to the first row and copy `userId`, `username`, and the password into the three boxes. The password column is read as `userPassword`, and if that value is null it is read as `UserPassword`. The stored characters are passed through `Proc_C7577C` before they are shown. That procedure is the same character cipher as `clsProd.encryp_decryp`: each character's ANSI value plus `0x80`, modulo `0x100`. It is an involution, so the boxes show the typed password and the database keeps the cipher text. Both password boxes receive the same decoded value. A null password becomes an empty box.

The list is `Select username from user1 order by username Asc`.

`txtUserId` is disabled. `cmdSave` is disabled. `Proc_C5A890`: if the user id equals 1, `txtUserName` is disabled. Otherwise the name box is enabled.

`Proc_CCCEE0` then sets the four buttons from the operator's `mnuUser` rights value. The value is read as a byte. 12 leaves New, Modify, and Delete on and Save off on an existing row. The other values are applied as well:

- 12: Save off, New on, Delete on, Modify on
- 7: Save off, New on, Delete off, Modify on
- 3: Save off, New on, Delete off, Modify off
- 1 or 0: all four off

`Chk_More_Users_In_Screen` is not wired. F1 names the help file `MasAdmUser.htm`. That page is not in this copy.

## New

`cmdNew_Click` runs `select max(userId) from user1`, adds 1, and puts that number in the user id. An empty table yields 1. It clears the name, the password, and the confirm box, enables the name box, and focuses it. New, Delete, and Modify are turned off. Save is turned on.

## Keys

`txtUserName` does not force capitals. Any key in the name box or the confirm box turns New and Delete off. Enter in the name box focuses the password. Enter in the password box focuses confirm. Enter in confirm focuses Save when Save is enabled, and otherwise focuses Modify.

When the password box receives focus, a trailing newline or carriage return on the password text is removed. Internal newlines are left.

## Save and Modify

`cmdModify_Click` calls `cmdSave_Click`. The question uses the word Save when Save is enabled, and the word Modify when it is not.

Checks, in order, title equal to the main window title, style `0x10` for the three refusals:

- Trimmed name empty: `Please Enter the user Name.....` and focus the name.
- Trimmed password empty: `Please Enter the Password.....` and focus the password.
- Trimmed password different from trimmed confirm: `Your Passwords are not Identical .....`, focus the password, and select the whole password.

The name is then looked up with `select * from user1 where username='...' and userId<>` the current id. A quote in the name is doubled before it is placed in that text. If another row has that name, style `0x10`: `An Entry Already Exists...Try Another!`, then focus the name.

Otherwise style `0x24` (Yes/No, question, default button No): `Are You Sure To Save?` or `Are You Sure To Modify?`. No runs the button reset and does not write. Yes opens `select * from user1 where userId =` the current id.

If Modify is disabled, the write is an insert. If Modify is enabled, the write updates that id. The columns written are `userId`, `username` (trimmed), and `UserPassword`. The password stored is the trimmed password passed through `Proc_C7577C`.

On an insert, and only on an insert, the code also inserts `userid` into `userrights`. No other rights column is written by this form.

The success text is `Records ` plus `Saved!` or `Modified!`, so `Records Saved!` or `Records Modified!`. The list is reloaded. After an insert the record pointer moves to the last row. After a modify it stays on the saved id. The button reset runs again.

## Delete

If the trimmed name is `ADMINISTRATOR`, or the user id equals 1, style `0x10`: `You can't Delete this user!!!`. Nothing is deleted.

Otherwise style `0x24`: `Are You Sure To Delete?`. Yes deletes that `user1` row and runs `delete * from userrights where userid=` the same id. The message is `Records Deleted.` The list is reloaded and the pointer moves to the first remaining row. The user id box is cleared before that message.

## Navigation

The move buttons walk `select * from user1`. Next that lands on EOF moves to the first row. Previous that lands on BOF moves to the last row. Each move copies that row into the boxes and applies the user-id name lock. This screen walks the rows in `userId` order so the first, last, and wrap positions stay stable.

## Left unwired

Screen locking and the help page. A new user's `userrights` row is stored with the user id only. The rights columns are written by User Rights. A stored `mnuUser` of 0 turns this menu item off. The button pattern above is applied from the signed-in user's `mnuUser` value.
