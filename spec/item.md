# Item

Master → Inventory → Item. Form `frmItem`. Year database (`Get_Connection`). Right key `mnuItem`. Photograph `G:\ERP SS\MASTER\INVENTORY\002_item-inventory.png`. Title `MASTER - Inventory`. Correspondences stays off.

## What is on the screen

The category list shows every category name. The hidden value is the category code. Choosing a category loads that category’s items, ordered by item id, and shows the last one. If that category has no items, the message is `No Records in this CATEGORY to Display!` and the form starts a new item.

The item list shows item codes for the selected category, ordered by code. Unchecked `Display Inactive Items` lists only items that are not inactive. Checked, it lists only inactive items. The count is that list. Next and previous walk every item in the category, inactive included. Next past the end wraps to the first. Previous past the start wraps to the last.

Item Code, Drg. No., Item Name, Item Detail, and Item Desn. each have their own box. The code and the name are the two fields the old save writes. Drg. No., Item Detail, and Item Desn. are kept as their own blanks. A blank one is stored as one space. Rate, re-order level, rack number, tariff sub-heading, and component cycle time follow. Inactive is the Hide flag.

Stock unit and ordering unit come from Measurement. The conversion line is `1` plus the ordering unit, then `=`, then the factor, then the stock unit. Stock quantity equals the ordering quantity multiplied by that factor. The line does not show Ton, Kgs, or 1000 until those units are chosen. Choosing an ordering unit before a stock unit says `You have to select the 'Unit of Measurement (for Stock Purpose)'...`. Choosing a stock unit does not copy it into the ordering unit. When the two units are the same text, ignoring capitals, the factor is locked at 1 and that 1 is stored. When they differ, the factor box is cleared and still has to be a number other than 0. Add Units opens the measurement entry used by this screen. Upload opens `frmUpload`, which is not built. More Details opens `frmCompMaster` and is shown only when the item’s category code is 2 or 8. Assign To opens `frmItemAssign` and is shown once an item is on screen. Those two forms are not built.

F6, while Modify is on, shows the category-change list and says `After changing the Category Press F6 Key to Confirm`. F6 again writes that category onto the item and says `Category successfully Changed`. If no category is chosen, it says `Category Change Unsuccessful!!!`.

## Save, modify, delete

Required, in order: item code `Enter the Item Code/Part No. / Drg. No.....`, item name `Enter the Item Name.....`, a category `Enter the Category code.....`, a stock unit `Enter the Unit of Measurement (for Stock Purpose).....`, an ordering unit `Enter the Ordering Unit (for Purchase).....`, and a conversion factor that is not 0. The conversion message is `Enter the Conversion factor between 'Unit of Measurement (for Stock Purpose)' and 'Ordering Unit (for Purchase)'.....`.

A repeated item code is refused: `An Entry Already Exists...Try Another!`

Save asks `Are You Sure To Save ?` and says `Records Saved!`. Modify asks `Are You Sure To Modify ?` and says `Records Modified!`. The title is the factory name. A new id is the highest item id plus 1, or 1 when the table is empty. The id is not shown. Blank re-order level, rack, and tariff are stored as one space. Rate and cycle time are numbers. Inactive stores Hide.

On modify, changing the category is refused when the item is already used:

- Category code is not 1, and CompMaster uses it as a raw material: `You should not change the Category... It should be 'Raw Material' Only,` then `Since 'Component Master' screen uses this Item as a 'Raw Material'`.
- Not 2, and CompMaster uses it as a component: the same shape, with `Component`.
- Not 3, and the bill of material uses it as an assembly: `Assembly`.
- Not 7, and the bill of material uses it as a sub-assembly: `Sub-Assembly`.

Those use-tables are not in this database yet.

Delete stops, in the old order, when the item is used in Component Master, Purchase Order, Purchase Bills, Bill of Materials, Production Log, Quotation, Purchase Order - Sales, Purchase Order - Labour, DC - Sales, DC Inwards - Labour, DC Inwards - Subcontract, Inspection-Individual Samples, Bill Of Materials, Inspection-Common, Estimation, or Store Transfer Note. Otherwise it asks `Are You Sure To Delete ?`. Yes says `Records Deleted .`

An empty item table says `No Records to Display!` and does not start a new item. Buttons follow the same 12 / 7 / 3 / 1 / 0 rules as Category once an item is shown. New turns Save on and New, Modify, and Delete off. F1 names `MasInvItem.htm`. That page is not in this copy. Nothing is seeded.

## Add Units

`frmMeasure` stores MeasureCode and MeasureName. The item lists show the code. Blank code: `Please Enter the Measurement Code.....`. Blank name: `Please Enter the Measurement Name.....`. Save asks `Are You Sure To Save` and says `Records Added.`. A repeated code: `An Entry Already Exists...Try Another!`. Delete asks `Are You Sure To Delete ?` and says `Records Deleted .` unless an item already uses that code as its stock unit: `This record cannot be deleted, Since this Measurement Unit is being used in 'Item' Screen!!!`.
