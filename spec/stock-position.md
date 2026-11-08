# Specification: Stock Position (`frmStock`)

## 1. Overview
The **Stock Position** module (`frmStock`) is the central warehouse and inventory reporting hub in SMART-ERP. It provides real-time visibility into quantities on hand, re-order levels (ROL), inventory values, warehouse locations (Rack No), and required replenishment orders across all warehouses or for a specific warehouse.

---

## 2. Visual Layout & Controls
Matches `SCREENSHOTS/INVENTORY/001_stock_position.png` and bytecode `vbdec/1738393709.txt`, `1826727088.txt`, `1913690618.txt`, `1904732435.txt`:

### Top Filter Bar:
- **Select Warehouse / Store** (`cmbStore`):
  - Populated with `"ALL"` (index 0) and all stores from `stores` table ordered by `StoreName`.
- **Select Category** (`cmbcatgry`):
  - Populated with `"ALL"` (index 0) and all item categories from `category` table.
- **Show All Items** (`chkShowAll`):
  - Checkbox to include all items regardless of category filter.
- **Select Item** (`cmbItem`):
  - Populated with `"ALL"` (index 0) and items filtered by selected category.
- **Stock Type Options** (`optAllStocks`, `optAvailStocks`, `optROLStocks`):
  - `All Stocks`: Lists all inventory items regardless of stock level.
  - `Available Stocks`: Lists only items with `Qty On_Hand > 0`.
  - `ROL Stocks`: Lists only items where `Qty On_Hand <= ROL` (Re-Order Level reached/critical).
- **Search Item Code / Name** (`txtsrch` + `cmdSrch`):
  - Real-time search/filter by item code or description.

### Central Stock FlexGrid (`msflex`):
9 Columns:
1. `Sl.No`
2. `Item Code / Part No.` (`item_code`)
3. `Item Name /Component Name` (`item_name`)
4. `Qty On_Hand` (`sum(balqty)`)
5. `Value in Rs.` (`sum(balqty * rate)`)
6. `ROL` (`rol`)
7. `Unit` (`measureunit`)
8. `To Order` (`ROL - Qty On_Hand` if `Qty <= ROL`, else 0)
9. `Rack` (`rackno`)

### Footer & Actions:
- **Total Stock Value** (`lblTotVal`): Computed sum of `Value in Rs.` across displayed items.
- **Total Items** (`lblTotItems`): Count of displayed items.
- **Print** (`cmdPrint`):
  - Validates `RowCount >= 2`, otherwise: `"No data to Print..."`.
  - Generates Stock Statement certificate report with Company Letterhead, Store filter, Category filter, date, and full grid details.
- **Exit / Close** (`cmdExit`): Closes the window.

---

## 3. Database Schema & Query Logic

### Queries:
1. **Stores List**:
   `SELECT id, store_name, store_id FROM stores WHERE factory_id = $1 ORDER BY store_name`
2. **Categories List**:
   `SELECT id, cat_name, cat_id FROM category WHERE factory_id = $1 ORDER BY cat_name`
3. **Items List**:
   `SELECT item_id, item_code, item_name, cat_id, rol, measureunit, rackno, standard_cost, sales_rate FROM item WHERE factory_id = $1 AND (hide = false OR hide IS NULL) ORDER BY item_code`
4. **Stock Balances**:
   - If store is `"ALL"`:
     `SELECT item_id, COALESCE(SUM(balqty), 0) AS qty_on_hand, COALESCE(SUM(balqty * rate), 0) AS total_val FROM storeaddsub WHERE factory_id = $1 AND balqty > 0 GROUP BY item_id`
   - If specific store:
     `SELECT sas.item_id, COALESCE(SUM(sas.balqty), 0) AS qty_on_hand, COALESCE(SUM(sas.balqty * sas.rate), 0) AS total_val FROM storeaddsub sas JOIN storeadd sa ON sa.id = sas.id WHERE sas.factory_id = $1 AND sa.storeid = $2 AND sas.balqty > 0 GROUP BY sas.item_id`

---

## 4. Validations & Behavior
1. Print with empty grid: `"No data to Print..."`
2. Responsive dynamic filtering: Switching store, category, item, or stock type radio updates the grid immediately.
3. ROL highlighting: Rows where `Qty On_Hand <= ROL` are visually highlighted in red/amber.
4. Printable certificate accurately reflects store name or `"ALL STORES COMBINED"`.
