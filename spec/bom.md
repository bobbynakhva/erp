# Bill Of Materials

Master → Inventory → Bill Of Materials. Form `frmStkRedDefine`. Year database (`Get_Connection`). Right key `mnuBOM`. Photograph `G:\ERP SS\MASTER\INVENTORY\003_bill_of_materials.png`. Title `MASTER - Inventory - Assembly Definitions`.

## What is on the screen

The assembly list is every item whose category name contains `ASSEMBLY`, ignoring capitals. The list text is the item code. The hidden value is the item id. The magenta label starts as `Assembly` and becomes that item’s name once one is chosen.

The grid columns are SlNo, Item, UOM, Utility Ratio, and Description. Clicking the heading adds a line. The item list is every item that is not inactive, ordered by item code. Choosing one fills its code, stock unit, and name. Utility ratio is typed.

Mark as Obsolete is one flag for the whole definition. It is stored on every line. When a definition is loaded, the box follows the first line.

Copy makes another item whose code is the assembly code plus `(Copy)`, repeated until that code is free among category codes 3 and 7, and copies the definition onto it. Upload opens `frmUpload`, which is not built. F1 names `MasInvAssmDef.htm`. F5 opens Item when the Item right is greater than 1. Otherwise it says `You have no rights to add New Items!!! Contact your administrator!!!`.

## Save and modify

An empty grid says `Please Enter the 'Bill of Materials'  by clicking the grid heading.....`. A repeated part says `Duplication of  Part No./ Items is not allowed. SEE ROWS: ` plus the two serial numbers. An unknown part says `Select Valid Part No. for the SlNo.` plus the serial number. The assembly’s own code on a line says `  Assembly  Name  is not allowed in the Definition!!!  SEE Row: ` plus the serial number. A utility ratio of 0 says `Enter the Valid Qty  `.

Save asks `Are You Sure To Save ?` and says `Record Saved .`. Modify asks `Are You Sure To Modify ?` and says `Record Modified .`. With no assembly chosen, the write says ` AssemblyName is invalid ...`. The write removes the old lines for that assembly and inserts the lines whose utility ratio is greater than 0.

Save is available when the Bill Of Materials right is greater than 1. After a definition exists, Modify replaces Save and is available when that right is greater than 3.
