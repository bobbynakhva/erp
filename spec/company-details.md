# My Company Details

Form: `frmMisc`. Opened by `mnuMisc_Click`. Layout image: `G:\ERP SS\MASTER\002_my_company_details.png`.

This screen reads and writes the year database. `Form_Load` calls `clsProd.Get_Connection`, not `Get_Start`.

One `Misc` row is the whole screen. `Select * from Misc`. If that recordset is at EOF, there is no row yet and Modify inserts one. If a row exists, Modify updates that row. There is no list of companies and no factory picker on this screen.

## What the picture shows

Window title: `My Company Details`.

Top to bottom, left side then right side:

- `rtbHeadP`: Print Page Heading. The picture's hint is Line 1 company name, Line 2 full address, Line 3 phone and email.
- `rtbPrintShortAddr`: Print Address in Statutory forms. The picture's hint is Line 1 company name and Lines 2, 3, 4 full address.
- Round Off Bill Amount: `chkROffPurchase` Purchase, `chkRoffSales` Manufacturing Sales, `chkROffLabour` Labour (Sales), `chkROffSubContract` SubContract Job.
- Re-track Rejections with PO: `chkReTrkRejPurch` Purchase, `chkReTrkRejMfgSale` Manufacturing Sales.
- Choose DC Outgoing Type (for Auto Running No.): `optBookType1`, `optBookType2`, `optBookType3`, in that picture order.
- Choose Inv. Type (for Auto Running No.): `optBookTypeINV1`, `optBookTypeINV2`.
- Link with Stock: `chkStkSales` Sales, `chkStkLabour` Labour work, `chkStkSubCon` Subcontract, `chkStkIWO` Production.
- Tax Identification Details: `txtMyKST` My LST No., `txtMyCST` My CST No., `txtMyVATRegNo` My TIN. No., `txtMyServRegNo` My Serv. Reg. No., `txtMyPANno` My PAN. No.
- My Excise Details: `txtRng` Range, `txtDivi` Division, `txtcommission` Commissionerate, `txtMyCERegNo` Central Excise No., `txtAcctCircle` LVO No.
- Prefix to Your Documents: `txtPrefixQuote`, `txtPrefixPO`, `txtPrefixWO`, `txtPrefixEnq`.
- The picture says `* Optional Fields` at the bottom right. Which boxes the star applies to is the label on the picture. The load and save code does not reject an empty box.

Buttons along the bottom, left to right as on the picture: `cmdMore` More..., `cmdPT` PT Details, `Command1` PrintInfo, `lblProd` Production, `lblEOU` EOU, then `cmdModify` and `cmdExit` Close.

`lblProd` and `lblEOU` are labels that receive clicks. On the picture they look like blue buttons.

## Buttons

| Control | Click |
| --- | --- |
| `cmdMore` | Shows `frmMiscMore`. That form is a later spec. |
| `cmdPT` | Shows `frmPTDetails`. Later spec. |
| `Command1` | Shows `frmPrintInfo`. Later spec. |
| `lblProd` | Shows `frmMiscProdnMaster`. Later spec. |
| `lblEOU` | Shows `frmEOUMaster`. Later spec. |
| `cmdExit` | Unloads `frmMisc`. |
| `cmdModify` | Writes the `Misc` row. See below. |

`lblCorres` exists on the form and its click shows `frmFileCorres`. Correspondences is out of scope, and this label is not in the photograph. Leave it off the web screen.

`txtAttBonus` has a key handler and is not in the photograph, and `Form_Load` does not fill it from `Misc`. Leave it off the web screen.

## What the form does when it opens

1. `select mnuMisc from UserRights where UserId=` the logged-in user. That value is kept on the form.
2. `Select SlNo from ViewRights Where frmname='` the form name, with single quotes in the name doubled `'`.
3. `Register_User_Log`.
4. If the rights value is greater than 1, `Fix_userVal_ReadOnly_if_screen_already_exist`. What that procedure changes on the controls is not decoded in this spec.
5. `Select * from Misc`.

If a row exists, each column below is trimmed and placed on its control. A null column is left as the control's design value. Checkboxes are on only when the column equals VBA True.

| Column | Control |
| --- | --- |
| `PrintHead` | `rtbHeadP` |
| `PrintShortAddr` | `rtbPrintShortAddr` |
| `MyKST` | `txtMyKST` |
| `MyCST` | `txtMyCST` |
| `MyVATRegNo` | `txtMyVATRegNo` |
| `MyservRegNo` | `txtMyServRegNo` |
| `MyPANNo` | `txtMyPANno` |
| `Rng` | `txtRng` |
| `Divi` | `txtDivi` |
| `commission` | `txtcommission` |
| `MyCERegNo` | `txtMyCERegNo` |
| `AcctCircle` | `txtAcctCircle` |
| `PrefixQuote` | `txtPrefixQuote` |
| `PrefixPO` | `txtPrefixPO` |
| `PrefixWO` | `txtPrefixWO` |
| `PrefixEnq` | `txtPrefixEnq` |
| `BookType` 1, 2, or 3 | `optBookType1`, `optBookType2`, `optBookType3` |
| `BookTypeINV` 1 or 2 | `optBookTypeINV1`, `optBookTypeINV2` |
| `RedStkM` | `chkStkSales` |
| `RedStkL` | `chkStkLabour` |
| `RedStkSC` | `chkStkSubCon` |
| `RedStkIWO` | `chkStkIWO` |
| `RoffPurch` | `chkROffPurchase` |
| `RoffSales` | `chkRoffSales` |
| `RoffLabour` | `chkROffLabour` |
| `RoffSubCon` | `chkROffSubContract` |
| `ReTrkRejPurch` | `chkReTrkRejPurch` |
| `ReTrkRejMfgSale` | `chkReTrkRejMfgSale` |

The load reads the service-registration column as `MyservRegNo`. The save writes `MyServRegNo`. Treat them as the same column. Access does not distinguish that spelling.

After a row is loaded, `lblEOU` and `lblProd` are made visible. The chosen DC option and the chosen invoice option get `ForeColor` `0xFF0000`. In VB that constant is blue (red 0, green 0, blue 255). The photograph agrees: the selected lines at those positions are RGB 0, 0, 255. The other options in that group get `ForeColor` 0. The red text on the photograph is the words `Click here for`, not the selected option.

If `Misc` has no row:

- `cmdModify` caption becomes `&Save`.
- `optBookType1` and `optBookTypeINV1` are selected.
- `cmdMore` is hidden.
- `lblEOU` is hidden.
- `lblProd` is not changed on this empty path.

Then `Proc_C4FA20`: if the rights value is greater than 3, `cmdModify` is enabled. Otherwise it is disabled. `Proc_C9C93C` shows or hides `lblCorres`. That label stays off this web screen.

Closing the form calls `UnRegister_User_Log` and `Leave_Connection`.

## Modify

`cmdModify_Click` first calls `Chk_More_Users_In_Screen`. If that returns false, the click stops. The message that procedure shows is not decoded here.

It opens `Select * from Misc` again. EOF means `AddNew`. A row means the fields are written onto that row. Then `Update`.

| Control | Stored column | Value |
| --- | --- | --- |
| `rtbHeadP` | `PrintHead` | the text as it stands, then one space added |
| `rtbPrintShortAddr` | `PrintShortAddr` | trimmed text, then one space added |
| `txtMyKST` | `MyKST` | trimmed text, then one space added |
| `txtMyCST` | `MyCST` | trimmed text, then one space added |
| `txtMyVATRegNo` | `MyVATRegNo` | trimmed text, then one space added |
| `txtMyCERegNo` | `MyCERegNo` | trimmed text, then one space added |
| `txtAcctCircle` | `AcctCircle` | trimmed text, then one space added |
| `txtMyServRegNo` | `MyServRegNo` | trimmed text, then one space added |
| `txtMyPANno` | `MyPANNo` | trimmed text, then one space added |
| `txtRng` | `Rng` | the text as it stands, then one space added |
| `txtDivi` | `Divi` | the text as it stands, then one space added |
| `txtcommission` | `commission` | the text as it stands, then one space added |
| `txtPrefixQuote` | `PrefixQuote` | trimmed text, or one space if the trim is empty |
| `txtPrefixPO` | `PrefixPO` | same empty rule |
| `txtPrefixWO` | `PrefixWO` | same empty rule |
| `txtPrefixEnq` | `PrefixEnq` | same empty rule |
| checked box | the column in the load table | VBA True |
| unchecked box | the same column | VBA False |
| `optBookType1` / `2` / `3` | `BookType` | 1, 2, or 3 |
| `optBookTypeINV1` / `2` | `BookTypeINV` | 1 or 2 |

Saving a DC book type also stores that same 1, 2, or 3 on the main window (`mdiSSI` offset `0x3C`). Saving an invoice book type stores 1 or 2 on the main window (`mdiSSI` offset `0x3E`). Those two values are how later documents read the running-number book. This screen does not calculate a running number.

The message box style is `0x40`. The title is the main-window title string. The text is `Records Saved...` when the button caption is `&Save`, and `Records Modified...` otherwise.

After a successful write the caption is set back to `&Modify`, `cmdMore` is shown, and `lblEOU` is shown.

## Keys

F1 (`Form_KeyUp` key code `0x70`) calls `show_help` with `MasMisc.htm`. The help page text is not in this spec.

Enter (key code 13) moves focus:

| From | To |
| --- | --- |
| `txtMyKST` | `txtMyCST` |
| `txtMyCST` | `txtMyVATRegNo` |
| `txtMyVATRegNo` | `txtMyServRegNo` |
| `txtMyServRegNo` | `txtMyPANno` |
| `txtMyPANno` | `txtRng` |
| `txtRng` | `txtDivi` |
| `txtDivi` | `txtcommission` |
| `txtcommission` | `txtMyCERegNo` |
| `txtMyCERegNo` | `txtAcctCircle` |
| `txtAcctCircle` | `txtPrefixQuote` |
| `txtPrefixQuote` | `txtPrefixPO` |
| `txtPrefixPO` | `txtPrefixWO` |
| `txtPrefixWO` | `txtPrefixEnq` |
| `chkROffPurchase` | `chkRoffSales` |
| `chkRoffSales` | `chkROffLabour` |
| `chkROffLabour` | `chkROffSubContract` |
| `chkROffSubContract` | `chkStkSales` |
| `chkStkSales` | `optBookType1` |
| `chkStkLabour` | `chkStkSubCon` |
| `chkStkSubCon` | `chkStkIWO` |
| `chkStkIWO` | `optBookType1` |
| `optBookType1` | `optBookType2` |
| `optBookType2` | `optBookType3` |
| `optBookType3` | `chkReTrkRejPurch` |
| `chkReTrkRejPurch` | `chkReTrkRejMfgSale` |
| `chkReTrkRejMfgSale` | `cmdModify`, only when Modify is enabled |

On `rtbHeadP` and `rtbPrintShortAddr`, Enter moves on only when the key is 13 and the last character is already a newline. The heading then moves to the address box. The address box then moves to `txtMyKST`. The Enter key is cleared so it is not inserted again. If the text does not already end in a newline, Enter stays in the box.

Leaving either rich-text box runs `remove_all_vbcrlf` on its text and writes the result back. What that procedure deletes, besides the name, is not decoded here.

When the address box receives focus and its trimmed text is empty, it is filled with the heading text.

Choosing a DC option turns that option's `ForeColor` to `0xFF0000` and the other two DC options to 0. The invoice options do the same inside their own pair. Those click handlers are `optBookType1_Click`, `optBookType2_Click`, `optBookType3_Click`, `optBookTypeINV1_Click`, and `optBookTypeINV2_Click`.

`txtPrefixEnq_Change` moves focus to `chkROffPurchase` when a compared value equals 13. That handler is a Change event, not a KeyPress, so this is not recorded as the Enter key.

## Not in this spec

- The layouts of More, PT Details, PrintInfo, Production, and EOU.
- The words inside `MasMisc.htm`.
- The body of `Chk_More_Users_In_Screen`, `Fix_userVal_ReadOnly_if_screen_already_exist`, and `remove_all_vbcrlf`.
- Any replacement of LST, CST, TIN, service tax, PAN, or excise with GST. These boxes stay as they are on the photograph.

## Decided from the code and the photograph

- The selected book-type line is blue, `ForeColor` `0xFF0000`.
- `lblCorres` stays off this screen. Correspondences is out of scope, and the label is not in the photograph.
- `UserRights.mnuMisc` is not in the shell yet. The photograph shows Modify available, so Modify stays enabled until the User Rights screen is built.
- `Chk_More_Users_In_Screen` is not decoded, so it is not wired on this screen.

## Still to compare on the live EXE

On the same `Misc` row, the web screen and the EXE should match for the heading, the address, the two book types, the checkboxes, the tax boxes, the excise boxes, and the four prefixes.
