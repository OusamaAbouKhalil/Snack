# Products Query Test Scripts

These test scripts help diagnose the 500 error when fetching products from Supabase.

## Quick Test (Browser Console)

1. Open your app in the browser
2. Open Developer Console (F12)
3. Copy and paste the contents of `test-products-query.js`
4. Make sure Supabase client is available (or modify the script to use your client)
5. Run: `testAllProductsQueries()`

## HTML Test Page

1. Open `test-products-query.html` in your browser
2. Enter your Supabase URL and Anon Key
3. Click the test buttons to run different query variations
4. Review the detailed error messages and results

## What to Look For

### Error Codes:
- **500**: Internal Server Error - Database/server issue
- **503**: Service Unavailable - Rate limiting or server overload
- **PGRST301**: PostgREST error - Usually related to query structure
- **42501**: Permission denied - RLS (Row Level Security) policy issue
- **42P01**: Table does not exist
- **42P02**: Column does not exist

### Common Issues:

1. **RLS Policy Issues**: 
   - Check Supabase dashboard → Authentication → Policies
   - Verify `products` table has proper SELECT policies

2. **Database Performance**:
   - Check if the `products` table has an index on `name` column
   - Consider adding: `CREATE INDEX idx_products_name ON products(name);`

3. **Query Timeout**:
   - If queries take > 5 seconds, might be too much data
   - Consider pagination: `.range(0, 49)` for first 50 items

4. **Missing Columns**:
   - Verify all columns in SELECT exist in the table
   - Check for typos in column names

## Testing Steps

1. **Start with minimal query** (Test 3) - if this fails, basic connectivity is the issue
2. **Test count query** (Test 4) - verifies table access
3. **Test without ordering** (Test 2) - checks if ORDER BY is the problem
4. **Test exact query** (Test 1) - matches your app's query

## Example Output

```
✅ Query Success: {
  status: 200,
  duration: "234.56ms",
  productsCount: 150,
  sampleProducts: [...]
}
```

If you see errors, copy the full error object and check:
- Error message
- Error code
- Details/hint fields (Supabase provides helpful hints)
- Status code

## Fix Suggestions

### If Test 1 (Exact Query) Fails:

1. Try Test 2 (without ordering) - if this works, add index:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
   ```

2. Try Test 3 (minimal) - if this works, one of the columns might be problematic

3. Check RLS policies in Supabase dashboard

### If All Tests Fail:

1. Check Supabase project status
2. Verify API keys are correct
3. Check network connectivity
4. Review Supabase logs in dashboard

