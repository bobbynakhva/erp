# Store Credit Note - Production Specification (`frmProdnStoreCrNote`)

## 1. Overview
The Store Credit Note - Production module converts temporary produced material returns (`prodn_iwo_ret`) into final, accepted warehouse stock, recording quantity accepted and quantity rejected, transferring stock from the temporary/source store into the destination store (`can_add = true`).

- **Legacy VB6 Form**: `frmProdnStoreCrNote`
- **Database Tables**:
  - `prodn_iwo_ret`: Updated with `scn_prod_id`, `scn_prod_date`, `prep_by`, `rem_any`, `store_iss_id`, `store_add_id`.
  - `prodn_iwo_ret_sub`: Updated with `accp_qty`, `rej_qty`, `rej_row_rem`.
  - `store_iss` & `store_iss_sub`: Issues the returned items out of the temporary source store.
  - `store_add` & `store_add_sub`: Deposits the accepted quantity (`toStock = accp_qty`) into the destination store.

---

## 2. Stock Movement Workflow
1. Select pending Produced Material Return No (`dc_id`).
2. Select Source Store (where items are currently sitting in temporary status).
3. Select Destination Store (where accepted stock is to be officially added).
4. For each line:
   - User inspects and enters `Qty Accp.` and `Qty Rej.`.
   - `Qty ToStock` automatically mirrors `Qty Accp.`.
5. On save:
   - Issues `accepted + rejected` from the temporary store receipt (`store_iss`).
   - Adds `accepted` quantity to the destination store (`store_add`).
   - Stamps `scn_prod_id` and dates on `prodn_iwo_ret`.

---

## 3. Downstream Integrity Locks
- If material deposited into the destination store has subsequently been issued (`store_add_sub.bal_qty <> qty`):
  - Modification is blocked:
    `"Modification is not Allowed, Since Some material has been issued  from this Store Credit Note"`
  - Deletion is blocked:
    `"Deletion is not Allowed, Since Some material has been issued  from this Store Credit Note"`

---

## 4. Exact Legacy VB6 Validations
1. Invalid Return Note:
   `"Not a Valid Produced Matl. Return  Number..."`
2. Missing Source Store:
   `"Please Select a Store from which the Stock is to be Reduced"`
3. Missing Destination Store:
   `"Please Select a Store to which the stock is to be Added"`
4. Identical Stores:
   `"Both Stores should not be the same ... "`
5. Empty Grid:
   `"Please Enter the ItemName/Item details by clicking the grid heading..."`
6. Zero Accepted and Rejected:
   `"Both Accepted Qty and Rejected Qty should not be Zero... "`
7. Save Confirmation:
   `"Are You Sure To Save?"`
8. Save Success:
   `"Record Saved"`
9. Modify Confirmation:
   `"Are You Sure To Modify?"`
10. Modify Success:
    `"Record Modified."`
11. Delete Confirmation:
    `"Are You Sure To Delete"`
12. Delete Success:
    `"Record Deleted Successfully."`

---

## 5. API Endpoints
- `GET /api/scn`: Returns source stores, destination stores, cost centers, pending Produced Material Return notes waiting for SCN generation, next SCN No, and existing SCN records.
- `POST /api/scn/save`: Performs store validation, line acceptance/rejection balance checks, generates store transfer (issue from temp, add to dest), and updates `prodn_iwo_ret`.
- `POST /api/scn/delete`: Validates downstream stock balance, reverts store issue and addition, clears `scn_prod_id`, and restores return note to pending state.
