# Stores (Warehouses)

Form `frmStores`. Year database (`Get_Connection`). Right key `mnuStores`.

Photograph `G:\ERP SS\MASTER\INVENTORY\004_stores_warehouse.png`.

Title `MASTER - Inventory - Stores / Warehouses`. Frame legend `Creat Stores` (the spelling on the photograph). List heading `List of Available Categories:` with the row count in `lblNos`. Correspondences stays off. F1 says `Help not available`.

Fields written: StoreId (hidden, max + 1), StoreName, CanAdd, CanIssue, StoreDesc. A blank description is stored as one space.

New turns both Addable and Issuable on, turns Save on, and turns New, Delete, and Modify off.

Blank name: `Please Enter the Store Name.....`. Both boxes off: `You should enable this store atleast for 'Addable' or 'Issuable'.....`. A name already used by another store: `An Entry Already Exists...Try Another!`. Confirm `Are You Sure To Save ?` or `Are You Sure To Modify ?`. Success `Records Saved!` or `Records Modified!`.

Delete is refused when `store_map` has the id (`This record cannot be deleted, Since this Store mapped in Default Stores` plus the My Company Details line) or when `store_add` has the id (`This record cannot be deleted, Since this Store is already in Use !!!`). Those tables are not created on this screen. Otherwise confirm `Are You Sure To Delete ?` and say `Records Deleted .`.

The name list is alphabetical. First, previous, next, and last walk the stores by store id and wrap. Opening the screen shows the last store. An empty year says `No Records to Display!` and then starts New.

Button rights use the same 12 / 7 / 3 / 1-or-0 split as Category. A byte that matches none, including 255, keeps Save off on a shown row and Save on for New.
