# Vendor (Purchase)

Master → General → Vendor (Purchase). Form `frmVendor`. Year database (`Get_Connection`). Right key `mnuVendor`. Photograph `G:\ERP SS\MASTER\GENERAL\004_vendor_purchase.png`. Title `MASTER - General - Vendor`. Frame `Vendor Details`. Correspondences stays off. `EOU...` opens `frmEOUMaster`, which is not built in this copy, and is shown only while a saved vendor is on screen.

## Fields

Vendor Name and Address are required. The photograph's starred boxes are optional and a blank one is stored as one space: LST (`KSTNo`), CST (`CSTNo`), TIN (`VATRegNo`), vendor code (`custcode`), phone, e-mail, business type, opening balance, contact, scope, range, division, commissionerate, and central excise registration.

Business type is `businesstype` where `vendor=true`, shown by `busitypename` and stored as `busitype`. The same backup row used by Customer, `General Business` (id 1), has `vendor` true. That is the list. A later save does not replace it.

Opening balance is the plain number. This form does not format it as `0.00`. New leaves the box empty and enabled. On a new row the same number is stored in `OpenBal` and `OpenBalPndg`. A new balance above zero stores today's date in `OpenBalDate`. A new row stores today's date in `CreatedDate`. Modify does not change `CreatedDate`. On modify, `OpenBalDate` is written only when the stored balance is 0 and the new balance is above zero. `OpenBalPndg` is written only while the opening-balance box is enabled.

Showing a vendor compares the two balances and then, when `Inactive` is false, enables every box, including opening balance. An inactive vendor locks the boxes. The Inactive checkbox itself stays usable. New does not clear `Inactive`. New also enables the boxes so a name can be typed; the old New left them locked after an inactive vendor.

`Inactive` stores `Inactive`. `Display Inactive` checked lists only inactive names. Unchecked lists only active names (`Inactive = 0`). The count is the list count. Save and Modify clear that checkbox on the way out.

## Other than Consignee Address

Header from the form: SlNo, Party Name, Address 1, Address 2, City, Country, Phone/eMail, TIN, CE Reg. No. Stored in `VendorIndirect` as AltVendorCode, AltVendorName, AltVendorAddr1, AltVendorAddr2, City, Country, Phmail, VATRegNo, CERegNo, ordered by AltVendorCode. A line with any text and no party name is refused: `Enter a Valid Party Name..... for the slno. ` plus that line's number. A completely empty line is not stored.

## Save, modify, delete

Blank name: `Please Enter the Vendor Name.....`

Blank address: `Please Enter the Vendor Address.....`

A name that already belongs to a different vendor is refused. Save says `An Entry Already Exists...Try Another!` Modify says `An Entry Already Exists... Try Another.`

Save asks `Are You Sure To Save ?` and says `Records Saved.` Modify asks `Are You Sure To Modify ?` and says `Records Modified .` The title is the factory name. After a save the web shows that vendor with the view buttons. A stored rights value of -1 does not change buttons, so leaving the New buttons in place would keep Save on.

Delete stops, in order, when the id is used in PurchPO, Purchase, or a payment party in FundTrans. FundTrans matches `IsExpense` true, `ExpIncId` 3, and `PartyName` equal to the trimmed name. The messages name `Purchase Order`, `Purchase`, and `Payments/Adjustment`. Otherwise it asks `Are You Sure To Delete ?` Yes deletes the consignee lines and the vendor and says `Records Deleted.` If a vendor remains, the first by code is shown. If none remain, the form starts a new vendor and does not repeat `No Records to Display!` Those use-tables are not in this database yet, so the checks find no rows until those screens exist. The later tables are `purch_po.vendor_code` and `purchase.vendor_code`. The FundTrans party-name update on modify is unwired because `fund_trans` does not exist.

An empty open says `No Records to Display!` and then starts a new vendor. Buttons follow the same 12 / 7 / 3 / 1 / 0 rules as Customer. F1 names `MasGenVend.htm`. That page is not in this copy. Nothing is seeded.

Enter moves Vendor Name, then Address, LST, CST, TIN, Vendor Code, Phone, E-mail, Business Type, Opening Balance, Contact, Scope, Range, Division, Commissionerate, and Cen. Reg. Cert. No. Address and Scope take the Enter only when the text already ends with a new line. From the certificate box, Enter focuses Save when Save is on, otherwise Modify, and only when Scope already ends with a new line. Enter on the name copies the selected list row into the name box, then moves to Address.
