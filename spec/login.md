# Login

Form: `frmLogin`. Layout image: the screenshot in this chat (window title `SMART - Login`). It is not stored under `G:\ERP SS`.

## What the picture shows

- Orange banner: `SMART` and `Simple Manufacturing & Administrative Recording Tool`.
- `lblLicense`: License, top right.
- `cmbAccYears`: year dropdown. The sample value on the picture is `2026-27`.
- `cmbUserName`: User Name dropdown. The label is green.
- `txtPassword`: Password box. The label is green.
- `cmdLogin`: Login button under the password.
- Background: the same water-ripple picture as the main window.

Field order on the picture, top to bottom: year, user name, password, Login. License sits apart at the top right.

## Keys recovered from the handlers

These are the key codes in the P-code, not a guess from the picture.

| Control | Key code | What the handler does |
| --- | --- | --- |
| `cmbAccYears` | 35 | Unload the login form. In VB6, 35 is the End key. |
| `cmbUserName` | 35 | Unload the login form. |
| `txtPassword` | 35 | Unload the login form. |
| `txtPassword` | 13 | Run `cmdLogin_Click`. 13 is Enter. |
| `cmdLogin` | 35 | Unload the login form. |
| `cmbUserName` KeyPress | 13 | If the trimmed user name is not empty, move focus to the password box. |
| `cmbUserName` KeyPress | 97–122 | Lowercase a–z is turned into A–Z (the code subtracts 32). |
| `cmbUserName` KeyPress | other | A–Z, 0–9, space, and backspace are kept. Any other character is cleared. |

Confirm the End-key close on the live EXE before the web screen copies it. No handler in these four KeyDown procedures compares the key to 27, so Escape is not what this code closes on.

## What happens when the form loads

`Form_Load` calls `Proc_C34244`, `Proc_C57304`, `Proc_C986D8`, and later `Proc_D593F8`.

Recovered from `Form_Load` and `Proc_D593F8`:

- Years come from `DB_Years`: `select max(minYear) from DB_Years`, then `select minYear & "-" & right(maxYear,2) from DB_Years`, and the current row is `select minYear & "-" & right(maxYear,2) from DB_Years where CurrYear=true`.
- If the machine date is past the newest year in `DB_Years`, the form tells the operator to close SMART and run `MaintainFinYear.Exe` to create the database for the new financial year. The message includes the year span.
- The year file name is built as `DB` + the selected year with `-` replaced by `_` + `.mdb`. Example shape: `DB2026_27.mdb`.
- Choosing a year runs `update DB_Years set CurrYear=false where CurrYear=true` and then `update DB_Years set CurrYear=true where minYear=` the chosen start year `and maxYear=` the chosen end year.
- User names are loaded with `select username from user1`.
- The form also reads `license` (`select * from license where compname is null`), `ImpSystems` (`Select SysId from ImpSystems Where SysIP=` the machine), and `Select max(Dates) from Logs`.
- If the system date is behind the last log date, it says `Your System Date is Not Correct!!!` and `Please Change it and run this Package`, and it shows `The LAST DATE/TIME you run this Package is`.
- If the Windows short-date format is not `dd/MM/yyyy`, it says `System date format should be "dd/MM/yyyy"` and tells the operator to set Regional settings to English (United Kingdom).

`Proc_C986D8` contains the literal `S08-10-040109-04-00300-01;Bilva Technologies Pvt. Ltd.` What that string is checked against is not decoded here.

## What Login does

`cmdLogin_Click` reads `cmbAccYears.ListIndex`.

- If that index equals 255, it shows `select a Financial Year from the list...` with the title `SMART` and puts focus back on the year dropdown. It does not continue.
- It takes the calendar month. If the month is greater than 3, the comparison year is this calendar year. Otherwise it is this calendar year minus 1. That is the April boundary.
- It takes the first 4 characters of the year dropdown text and compares that number with the comparison year.
- If the dropdown year is earlier, it does **not** refuse the year. It shows a question box titled `SMART`:

  `YOU TRY TO OPEN THE PREVIOUS YEAR DATA  (` + the year text + `) !!!`

  `Press 'Yes' to continue, 'No' to continue with current year`

  The box style value is `0x124` (Yes/No, question icon, default button is the second button). Return value 7 is VB's No.
  - No: the year dropdown is moved to its last entry, then login continues.
  - Yes: login continues with the year that was selected.

- Either way it then calls `Proc_E0B74C`.

## Password check inside `Proc_E0B74C`

- It looks up `Select Username from user1 where username='` the entered name `'`.
- The typed password is passed through `clsProd.encryp_decryp`. The cipher itself is not decoded in this spec. Do not invent it.
- It looks up `Select UserPassword from user1 where userPassword='` the transformed password `' and username='` the name `'`.
- Failure shows ` Invalid Password ...` and stays on the password box. The message is shown on more than one failure path in this procedure. The exact difference between those paths is not decoded.
- After a password match it reads `Select max(Dates) from Logs` and `select dates from logs where id=(select max(id) from logs)`.
- It can show `Yesterday you have NOT USED this SMART Software...`
- It can show ` !!! More than a WEEK !!! SMART Software is NOT being USED by you....... `
- It can show `  !!! !!!   CAUTION   !!! !!!` and ` System has found NO USERS used SMART Software for past `
- It can show `  !!! !!!    ATTENTION PLEASE    !!! !!! ` and ` SMART Software iS VeRY RaRelY UsEd bY YoU !!! !!!`
- It asks `CONFIRM :- YOUR SYSTEM  DATE  IS  ` plus the date. The branch that follows Yes or No on that box is not decoded.
- It stores `Bilva Technologies Pvt. Ltd.` on the main window and shows `mdiSSI`.
- The logged-in id comes from `select userid from user1 where username='` the name `'`.

## License button

`lblLicense_Click` builds the same `DB` + year + `.mdb` name from the selected year. The rest of that click, including what it opens, is not decoded. Leave it uncoded until that procedure is finished.

## UNKNOWN, left uncoded

- The algorithm inside `clsProd.encryp_decryp`.
- Which failure path produces the second ` Invalid Password ...`.
- What Yes and No do on the system-date confirmation.
- The remainder of the License click.
- What `S08-10-040109-04-00300-01;Bilva Technologies Pvt. Ltd.` is checked against.
- Whether key 35 is really the key operators use. The number is End. Confirm on the live login screen.
