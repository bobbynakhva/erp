# Category

Master → Inventory → Category. Form `frmCategory`. Year database (`Get_Connection`). Right key `mnuCategory`. Photograph `G:\ERP SS\MASTER\INVENTORY\001_category.png`. Title `Master - Category`. Frame `Category Details`. Correspondences stays off.

## Fields

Category Code is shown and cannot be typed. A new code is the highest code plus 1, or 1 when the list is empty. Category Name is required and stored trimmed. Category Description is optional. A blank description is stored as one space and shown trimmed.

The list is every category name, ordered by name. The count is not shown. Choosing a name shows that category. Next and previous walk the rows in code order. Next past the end wraps to the first. Previous past the start wraps to the last.

Codes 1 through 8 cannot be modified or deleted. The messages are `You cannot Modify this Category!!!` and `You cannot Delete this Category!!!`. This copy does not name those eight categories, so none are seeded.

## Save, modify, delete

Blank name: `Please Enter the Category Name.....`

A name that already belongs to a different category is refused: `An Entry Already Exists...Try Another!`

Save, while the Save button is on, asks `Are You Sure To Save ?` and says `Records Saved!` Modify asks `Are You Sure To Modify ?` and says `Records Modified!` The title is the factory name. Modify writes the name and description for that code. It does not write a new code.

Delete then stops, in order, when the code is used in Item, PurchPOSub, or PurchaseSub. The messages name `Item`, `Purchase Order`, and `Purchase`. Otherwise it asks `Are You Sure To Delete ?` Yes deletes the category and says `Records Deleted .` If a category remains, the first by code is shown. Those use-tables are not in this database yet, so the checks find no rows until those screens exist. The later columns are `item.category_code`, `purch_po_sub.category_code`, and `purchase_sub.category_code`.

An empty open does not say `No Records to Display!` and does not start a new category. Save is off. Buttons follow the same 12 / 7 / 3 / 1 / 0 rules as Customer once a category is shown. New turns Save on and New, Modify, and Delete off. F1 names `MasInvcat.htm`. That page is not in this copy. Nothing is seeded.

Enter on the name copies the selected list row into the name box, then moves to the description. The description takes Enter only when the text already ends with a new line, and then focuses Save when Save is on, otherwise Modify.
