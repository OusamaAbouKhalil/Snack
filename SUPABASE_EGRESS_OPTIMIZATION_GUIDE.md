# Supabase Egress Optimization Guide

## ⚠️ Problem: Egress Exceeded 163%

Your Supabase egress limit is exceeded because you're transferring too much data. Here's how to fix it:

---

## 🔍 Root Causes

1. **No Pagination** - Fetching ALL products at once
2. **Large Fields** - Including `description` and `image_url` in list queries
3. **No Caching** - Every page load/refresh re-fetches all data
4. **Performance Testing** - Running queries 5+ times during testing
5. **No Limits** - Queries without `.limit()` fetch entire tables

---

## ✅ Solutions Implemented

### 1. **Pagination** (80% egress reduction)
```javascript
// ❌ BAD: Fetches ALL products
const { data } = await supabase
  .from('products')
  .select('*');

// ✅ GOOD: Paginated query
const pageSize = 20;
const page = 0;
const from = page * pageSize;
const to = from + pageSize - 1;

const { data, count } = await supabase
  .from('products')
  .select('id, name, price, category_id, is_available', { count: 'exact' })
  .order('name', { ascending: true })
  .range(from, to);
```

### 2. **Remove Large Fields from List Queries** (50-70% egress reduction)
```javascript
// ❌ BAD: Includes heavy fields in list query
const { data } = await supabase
  .from('products')
  .select('id, name, description, image_url, price') // description & image_url are large!
  .limit(50);

// ✅ GOOD: Minimal fields in list query
const { data } = await supabase
  .from('products')
  .select('id, name, price, category_id, is_available')
  .limit(50);
```

### 3. **Lazy Load Details** (90% egress reduction for detail views)
```javascript
// Only fetch full details when user clicks on a product
async function loadProductDetails(productId) {
  const { data } = await supabase
    .from('products')
    .select('id, name, description, image_url, price')
    .eq('id', productId)
    .single();
  
  return data;
}

// In your UI:
// 1. Show list with minimal data
// 2. On click/hover, load full details
```

### 4. **Implement Caching** (95%+ egress reduction)
```javascript
// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedProducts(cacheKey = 'products_page_1') {
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data; // No egress used!
  }
  
  // Fetch from Supabase
  const { data } = await supabase
    .from('products')
    .select('id, name, price, category_id, is_available')
    .limit(20);
  
  // Cache it
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

### 5. **Always Use Limits**
```javascript
// ❌ BAD: No limit
const { data } = await supabase
  .from('products')
  .select('*');

// ✅ GOOD: With limit
const { data } = await supabase
  .from('products')
  .select('id, name, price')
  .limit(50);
```

---

## 📊 Egress Reduction Estimates

| Optimization | Egress Reduction | Implementation Effort |
|--------------|------------------|----------------------|
| Add `.limit(50)` | ~60% | Easy |
| Remove large fields | ~50-70% | Easy |
| Implement pagination | ~80% | Medium |
| Add caching | ~90-95% | Medium |
| Lazy load details | ~90% | Medium |
| **Combined** | **80-95%** | **1-2 hours** |

---

## 🚀 Quick Implementation Plan

### Step 1: Update All Product Queries (10 minutes)
```javascript
// Find all queries like this in your codebase:
.select('id, name, description, price, category_id, image_url, is_available, created_at')

// Replace with:
.select('id, name, price, category_id, is_available, created_at')
.limit(50)
```

### Step 2: Add Pagination Hook (15 minutes)
```javascript
// hooks/useProducts.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProducts(page = 0, pageSize = 20) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('products')
        .select('id, name, price, category_id, is_available', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to);

      if (!error) {
        setProducts(data);
        setTotalCount(count);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [page, pageSize]);

  return { products, loading, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
```

### Step 3: Add Product Details Hook (10 minutes)
```javascript
// hooks/useProductDetails.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProductDetails(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, image_url, price, category_id, is_available')
        .eq('id', productId)
        .single();

      if (!error) {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchDetails();
  }, [productId]);

  return { product, loading };
}
```

### Step 4: Implement React Query for Caching (20 minutes)
```bash
npm install @tanstack/react-query
```

```javascript
// lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

```javascript
// hooks/useProducts.js (with React Query)
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useProducts(page = 0, pageSize = 20) {
  return useQuery({
    queryKey: ['products', page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('products')
        .select('id, name, price, category_id, is_available', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { products: data, totalCount: count };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
```

---

## 🧪 Testing Your Optimizations

Run the optimized test script:
```javascript
testAllProductsQueries()
```

Individual tests:
```javascript
// Test pagination
testPaginatedQuery(0, 20) // Page 1, 20 items

// Test caching
testCachedQuery('products_page_1')
testCachedQuery('products_page_1') // Should use cache (no egress!)

// Test lazy loading
testLazyLoadProductDetails(123) // Replace 123 with actual product ID

// Clear cache when needed
clearQueryCache()
```

---

## 💰 Expected Results

### Before Optimization:
- Query size: ~500 KB - 2 MB per request
- Queries per page load: 3-5
- Total egress per page: 1.5 - 10 MB
- Monthly egress (1000 users): **15 GB - 100 GB**

### After Optimization:
- Query size: ~10 KB - 50 KB per request
- Queries per page load: 1 (cached after first load)
- Total egress per page: 10 - 50 KB
- Monthly egress (1000 users): **1 GB - 5 GB** (95% reduction!)

---

## 🔧 Additional Optimizations

### 1. Use Supabase CDN for Images
Instead of storing image URLs in Supabase, use Supabase Storage:
```javascript
// Upload images to Supabase Storage
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(`${productId}.jpg`, file);

// Store only the path, not the full URL
// The CDN URL is generated on-demand
const imageUrl = supabase.storage
  .from('product-images')
  .getPublicUrl(`${productId}.jpg`).data.publicUrl;
```

### 2. Enable RLS (Row Level Security)
Add security policies to prevent unauthorized data access:
```sql
-- Only allow reading available products
CREATE POLICY "Anyone can read available products"
ON products FOR SELECT
USING (is_available = true);
```

### 3. Add Database Indexes
```sql
-- Speed up queries and reduce egress
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available);
```

### 4. Use PostgREST Filtering
Filter on the database side, not client side:
```javascript
// ❌ BAD: Fetch all, filter client-side
const { data } = await supabase.from('products').select('*');
const available = data.filter(p => p.is_available);

// ✅ GOOD: Filter server-side
const { data } = await supabase
  .from('products')
  .select('id, name, price')
  .eq('is_available', true)
  .limit(20);
```

---

## 📈 Monitoring Egress

Check your Supabase dashboard regularly:
1. Go to Settings > Billing
2. Monitor "Database Egress"
3. Set up alerts for 70% usage
4. Review query patterns

---

## 🎯 Summary Checklist

- [x] Add `.limit()` to all queries
- [x] Remove `description` and `image_url` from list queries
- [x] Implement pagination
- [x] Add lazy loading for product details
- [x] Implement caching (React Query or custom)
- [x] Reduce performance test iterations
- [ ] Apply changes to your actual application code
- [ ] Test in production
- [ ] Monitor egress in Supabase dashboard

---

## 📞 Need Help?

If egress is still high after these changes:
1. Check for any queries without `.limit()`
2. Review which fields are being selected
3. Ensure caching is working
4. Look for queries in loops or repeated fetches
5. Consider upgrading your Supabase plan if you have high legitimate traffic

**Expected outcome:** Your egress should drop by 80-95%, bringing you well below your plan limits.

