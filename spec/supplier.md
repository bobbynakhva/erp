# Supplier (SubContract)

Master → General → Supplier (SubContract). Form `frmSupplier`. Year database (`Get_Connection`). Right key `mnuSupplier`. Photograph `G:\ERP SS\MASTER\GENERAL\003_supplier_subcontract.png`. Title `MASTER - General - Supplier / Sub-Contractor`. Frame `Supplier (Sub-Contractor) Details`. Correspondences stays off. There is no consignee grid and no EOU button.

## Fields

Sub-Contractor name and Address are required. The photograph's starred boxes are optional and a blank one is stored as one space: LST (`KSTNo`), CST (`CSTNo`), TIN (`VATRegNo`), supplier code (`custcode`), phone, e-mail, business type, opening balance, contact, scope, range, division, commissionerate, and central excise registration.

Business type is `businesstype` where `supp=true`, shown by `busitypename` and stored as `busitype`. The same backup row used by Customer, `General Business` (id 1), has `supp` true. That is the list. A later save does not replace it.

Opening balance is the plain number. This form does not format it as `0.00`. New leaves the box empty and enabled. On a new row the same number is stored in `OpenBal` and `OpenBalPndg`. If those two numbers differ, the box is locked. A new balance above zero stores today's date in `OpenBalDate`. On modify, that date is written only when the stored balance is 0 and the new balance is above zero. A new row stores today's date in `CreatedDate`. Modify does not change `CreatedDate`.

`Inactivate Supplier` stores `Inactive`. New does not clear that checkbox. `Display Inactive Supplier` checked lists only inactive names. Unchecked lists only active names (`Inactive = 0`). The count is the list count. Save and Modify clear that checkbox on the way out.

## Save, modify, delete

Blank name: `Please Enter the Supplier Name.....`

Blank address: `Please Enter the Supplier Address.....`

A name that already belongs to a different supplier is refused. Save says `An Entry Already Exists...Try Another!` Modify says `An Entry Already Exists... Try Another!`

Save asks `Are You Sure To Save ?` and says `Records Saved.` Modify asks `Are You Sure To Modify ?` and says `Records Modified...` The title is the factory name.

Delete stops, in order, when the id is used in SubConPO, DCSubConOutgoing, or a payment party in FundTrans (`IsExpense` true). The messages name `Purchase Order - Sub Contract`, `DC Outwards - SubContract`, and `Payments/Adjustment`. Otherwise it asks `Are You Sure To Delete ?` Yes deletes the supplier and says `Records Deleted.` Those use-tables are not in this database yet, so the checks find no rows until those screens exist. The later tables are `subcon_po.supp_id` and `dc_subcon_outgoing.supp_id`.

An empty open says `No Records to Display!` and then starts a new supplier. After the last supplier is deleted, the form starts a new one and does not repeat that message. Buttons follow the same 12 / 7 / 3 / 1 / 0 rules as Customer. F1 names `MasGenSupp.htm`. That page is not in this copy. Nothing is seeded.

Enter moves Sub-Contractor, then Address, LST, CST, TIN, Supplier Code, Phone, E-mail, Business Type, Opening Balance, Contact, Scope, Range, Division, Commissionerate, and Cen. Reg. Cert. No. Address and Scope take the Enter only when the text already ends with a new line. From the certificate box, Enter focuses Save when Save is on, otherwise Modify, and only when Scope already ends with a new line. Enter on the name copies the selected list row into the name box, then moves to Address.
