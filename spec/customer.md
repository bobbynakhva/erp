# Customer (Sales/Labour)

Master → General → Customer (Sales/Labour). Form `frmCustomer`. Year database (`Get_Connection`). Right key `mnuCustomer`. Photograph `G:\ERP SS\MASTER\GENERAL\002_customer_sales&labour.png`. Title `Customer`. Correspondences stays off. `EOU...` opens `frmEOUMaster`, which is not built in this copy, and is shown only while an existing customer is on screen.

## Fields

Customer Name and Address are required. The photograph's starred boxes are optional and a blank one is stored as one space: LST (`KSTNo`), CST (`CSTNo`), TIN (`VATRegNo`), vendor code, phone, e-mail, business type, opening balance, contact, scope, range, division, commissionerate, and central excise registration.

Business type is `businesstype` where `cust=true`, shown by `busitypename` and stored as `busitype`. The packaged year files have no rows. The backup copies that contain the `cust` and `busitype` columns have one customer type, `General Business` (id 1). That row also has `supp` and `vendor` true, so Supplier and Vendor use it too. A later save does not replace it.

Opening balance is shown as `0.00`. New leaves the box empty and enabled. On a new row the same number is stored in `OpenBal` and `OpenBalPndg`. If those two numbers differ, the box is locked. A balance above zero stores today's date in `OpenBalDate`. A new row stores today's date in `CreatedDate`.

`Inactivate Customer` stores `Inactive`. `Display Inactive Customers` checked lists only inactive names. Unchecked lists only active names (`Inactive = 0`). The count is the list count.

## Other than Consignee Address

Header from the form: SlNo, Party Name, Address 1, Address 2, City, Country, Phone/eMail, TIN, CE Reg. No. Stored in `CustomerIndirect` as AltCustId, AltCustName, AltCustAddr1, AltCustAddr2, City, Country, Phmail, VATRegNo, CERegNo, ordered by AltCustId. A line with any text and no party name is refused: `Enter a Valid Party Name..... for the slno. ` plus that line's number. A completely empty line is not stored.

## Save, modify, delete

Blank name: `Please Enter the Customer Name.....`

Blank address: `Please Enter the Customer Address.....`

A name that already belongs to a different customer is refused. Save says `An Entry Already Exists...Try Another.` Modify says `An Entry Already Exists... Try Another!`

Save asks `Are You Sure To Save ?` and says `Records Saved.` Modify asks `Are You Sure To Modify ?` and says `Records Modified...` The title is the factory name.

Delete stops, in order, when the id is used in DailyProd, Quote, MfgPO, LabPO, DcInv, DcIncoming, ProdnIWOIss, InspectionInde, or a receipt party in FundTrans. The messages name those screens. Otherwise it asks `Are You Sure To Delete ?` Yes deletes the consignee lines and the customer and says `Records Deleted.` Those use-tables are not in this database yet, so the checks find no rows until those screens exist.

An empty open says `No Records to Display!` and then starts a new customer. Buttons follow the same 12 / 7 / 3 / 1 / 0 rules as Machine. F1 names `MasGenCust.htm`. That page is not in this copy. Nothing is seeded.
