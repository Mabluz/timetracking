## IMPROVEMENTS
- ✅ COMPLETED: When we get a lot of data, there might be a bit heavy to display it all as a long list under time tracking. Therefore we should have a checkbox that can be checked (and should be default checked) that say hide (and dont render in the DOM) the imported rows
  - Added "Hide imported rows" checkbox (checked by default) in TimeTrackingGrid.vue
  - Implemented filtering logic to exclude imported rows from rendering when checkbox is checked
  - Updated import function to mark imported entries with `imported: true`
  - Backend already supports the `imported` field in database schema

## BUGS
- 