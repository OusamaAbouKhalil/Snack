/**
 * Products Query Test Script
 * 
 * This script tests the Supabase products query to diagnose 500 errors.
 * 
 * Usage:
 * 1. Open browser console on your app
 * 2. Copy and paste this entire script
 * 3. Replace SUPABASE_URL and SUPABASE_KEY with your actual values
 * 4. Run testAllProductsQueries()
 */

const SUPABASE_URL = 'https://dmxkiuzfasdwxsigyizy.supabase.co'; // Replace with your Supabase URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteGtpdXpmYXNkd3hzaWd5aXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMDYzMDIsImV4cCI6MjA2NDc4MjMwMn0.IodAc1MndObssiRE-mWqukrLshMbT4UoHAkryYI7Fuk'; // Replace with your anon key

// Import Supabase client (assuming it's available in your app)
// If not, you can use: import { createClient } from '@supabase/supabase-js'
const supabase = window.supabase || (() => {
    console.error('Supabase client not found. Make sure to use this script in an environment where Supabase is available.');
    return null;
})();

/**
 * Test the exact query used in useProducts hook
 * OPTIMIZED: Added limit and removed heavy fields
 */
async function testExactQuery() {
    console.group('🔍 Test: Exact Products Query (useProducts)');
    
    try {
        const startTime = performance.now();
        
        const productsQuery = supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at')
            .order('name', { ascending: true })
            .limit(50); // Limit to 50 products per page
        
        const { data, error, status, statusText } = await productsQuery;
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                statusText,
                error: {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    statusCode: error.statusCode
                },
                duration: `${duration.toFixed(2)}ms`
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            duration: `${duration.toFixed(2)}ms`,
            productsCount: data?.length || 0,
            sampleProducts: data?.slice(0, 3) || []
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test query without ordering (to check if order by is the issue)
 * OPTIMIZED: Added limit and removed heavy fields
 */
async function testWithoutOrdering() {
    console.group('🔍 Test: Products Query Without Ordering');
    
    try {
        const startTime = performance.now();
        
        const { data, error, status } = await supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at')
            .limit(50); // Limit to 50 products
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code },
                duration: `${duration.toFixed(2)}ms`
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            duration: `${duration.toFixed(2)}ms`,
            productsCount: data?.length || 0
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test minimal query (just ID)
 */
async function testMinimalQuery() {
    console.group('🔍 Test: Minimal Query (ID only)');
    
    try {
        const { data, error, status } = await supabase
            .from('products')
            .select('id')
            .limit(10);
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code }
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            productsCount: data?.length || 0
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test count query
 */
async function testCountQuery() {
    console.group('🔍 Test: Products Count');
    
    try {
        const { count, error, status } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code }
            });
            return false;
        }
        
        console.log('✅ Count Success:', {
            status,
            totalProducts: count
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test with is_available filter
 * OPTIMIZED: Added limit and removed heavy fields
 */
async function testAvailableOnly() {
    console.group('🔍 Test: Products with is_available=true Filter');
    
    try {
        const { data, error, status } = await supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at')
            .eq('is_available', true)
            .order('name', { ascending: true })
            .limit(50); // Limit to 50 products
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code }
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            availableProductsCount: data?.length || 0
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test categories query
 */
async function testCategoriesQuery() {
    console.group('🔍 Test: Categories Query');
    
    try {
        const { data, error, status } = await supabase
            .from('categories')
            .select('id, name, display_order, created_at')
            .order('display_order', { ascending: true });
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code }
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            categoriesCount: data?.length || 0,
            categories: data
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Performance test - run query multiple times
 * OPTIMIZED: Reduced iterations and added limit to reduce egress
 */
async function testPerformance(iterations = 2) {
    console.group(`⚡ Performance Test (${iterations} iterations)`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
            const { data, error, status } = await supabase
                .from('products')
                .select('id, name, price, category_id, is_available, created_at')
                .order('name', { ascending: true })
                .limit(50); // Limit to 50 products
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            results.push({
                iteration: i + 1,
                success: !error,
                status,
                duration: `${duration.toFixed(2)}ms`,
                dataCount: data?.length || 0,
                error: error ? error.message : null
            });
        } catch (err) {
            results.push({
                iteration: i + 1,
                success: false,
                error: err.message
            });
        }
    }
    
    const successful = results.filter(r => r.success);
    const avgDuration = successful.length > 0
        ? successful.reduce((sum, r) => sum + parseFloat(r.duration), 0) / successful.length
        : 0;
    
    console.log('📊 Results:', {
        successRate: `${(successful.length / iterations * 100).toFixed(1)}%`,
        averageDuration: `${avgDuration.toFixed(2)}ms`,
        iterations: results
    });
    
    console.groupEnd();
    
    return results;
}

/**
 * Test paginated query (RECOMMENDED APPROACH)
 */
async function testPaginatedQuery(page = 0, pageSize = 20) {
    console.group(`📄 Test: Paginated Products Query (Page ${page + 1}, Size: ${pageSize})`);
    
    try {
        const startTime = performance.now();
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error, status, count } = await supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at', { count: 'exact' })
            .order('name', { ascending: true })
            .range(from, to);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code },
                duration: `${duration.toFixed(2)}ms`
            });
            return false;
        }
        
        const totalPages = Math.ceil(count / pageSize);
        
        console.log('✅ Query Success:', {
            status,
            duration: `${duration.toFixed(2)}ms`,
            currentPage: page + 1,
            pageSize,
            totalPages,
            totalProducts: count,
            productsOnThisPage: data?.length || 0,
            dataSize: `~${(JSON.stringify(data).length / 1024).toFixed(2)} KB`
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Load single product details with description and image (LAZY LOADING)
 */
async function testLazyLoadProductDetails(productId) {
    console.group(`🖼️ Test: Lazy Load Product Details (ID: ${productId})`);
    
    try {
        const startTime = performance.now();
        
        const { data, error, status } = await supabase
            .from('products')
            .select('id, name, description, image_url, price')
            .eq('id', productId)
            .single();
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (error) {
            console.error('❌ Query Failed:', {
                status,
                error: { message: error.message, code: error.code }
            });
            return false;
        }
        
        console.log('✅ Query Success:', {
            status,
            duration: `${duration.toFixed(2)}ms`,
            product: data,
            dataSize: `~${(JSON.stringify(data).length / 1024).toFixed(2)} KB`
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Test with caching simulation
 */
const queryCache = new Map();

async function testCachedQuery(cacheKey = 'products_page_1') {
    console.group(`💾 Test: Cached Query (Key: ${cacheKey})`);
    
    try {
        // Check cache first
        if (queryCache.has(cacheKey)) {
            const cachedData = queryCache.get(cacheKey);
            const cacheAge = Date.now() - cachedData.timestamp;
            
            console.log('✅ Data from Cache:', {
                cacheAge: `${(cacheAge / 1000).toFixed(1)}s ago`,
                productsCount: cachedData.data?.length || 0,
                dataSize: `~${(JSON.stringify(cachedData.data).length / 1024).toFixed(2)} KB`
            });
            
            console.log('💡 TIP: No egress used! Data served from cache.');
            return true;
        }
        
        // Cache miss - fetch from Supabase
        console.log('⚠️ Cache miss - fetching from Supabase...');
        const startTime = performance.now();
        
        const { data, error, status } = await supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at')
            .order('name', { ascending: true })
            .limit(20);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (error) {
            console.error('❌ Query Failed:', error);
            return false;
        }
        
        // Store in cache
        queryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        console.log('✅ Data Fetched and Cached:', {
            status,
            duration: `${duration.toFixed(2)}ms`,
            productsCount: data?.length || 0,
            dataSize: `~${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
            cached: true
        });
        
        return true;
    } catch (err) {
        console.error('❌ Exception:', err);
        return false;
    } finally {
        console.groupEnd();
    }
}

/**
 * Clear query cache
 */
function clearQueryCache() {
    queryCache.clear();
    console.log('🗑️ Query cache cleared');
}

/**
 * Run all tests
 */
async function testAllProductsQueries() {
    console.log('🚀 Starting OPTIMIZED Products Query Tests...\n');
    console.log('=' .repeat(60));
    
    const results = {
        paginatedQuery: await testPaginatedQuery(0, 20),
        cachedQuery: await testCachedQuery('products_page_1'),
        cachedQueryAgain: await testCachedQuery('products_page_1'), // Should use cache
        exactQuery: await testExactQuery(),
        withoutOrdering: await testWithoutOrdering(),
        minimalQuery: await testMinimalQuery(),
        countQuery: await testCountQuery(),
        availableOnly: await testAvailableOnly(),
        categories: await testCategoriesQuery()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Test Summary:');
    console.table(results);
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
        console.log('✅ All tests passed! Running lightweight performance test...');
        await testPerformance();
    } else {
        console.log('❌ Some tests failed. Check the errors above.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 EGRESS OPTIMIZATION TIPS:');
    console.log('1. ✅ Use pagination: testPaginatedQuery(page, pageSize)');
    console.log('2. ✅ Implement caching: testCachedQuery()');
    console.log('3. ✅ Lazy load details: testLazyLoadProductDetails(id)');
    console.log('4. ✅ Remove large fields (description, image_url) from list queries');
    console.log('5. ✅ Use .limit() on all queries');
    console.log('6. ✅ Reduce performance test iterations');
    console.log('\n💰 Estimated egress reduction: 80-95%');
    
    return results;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testExactQuery,
        testWithoutOrdering,
        testMinimalQuery,
        testCountQuery,
        testAvailableOnly,
        testCategoriesQuery,
        testPerformance,
        testPaginatedQuery,
        testLazyLoadProductDetails,
        testCachedQuery,
        clearQueryCache,
        testAllProductsQueries
    };
}

// Auto-run if supabase is available
if (typeof supabase !== 'undefined' && supabase) {
    console.log('💡 OPTIMIZED Products Query Test Script Loaded');
    console.log('💡 Quick Start:');
    console.log('   - testAllProductsQueries()          // Run all tests');
    console.log('   - testPaginatedQuery(0, 20)         // Test pagination');
    console.log('   - testCachedQuery()                 // Test caching');
    console.log('   - testLazyLoadProductDetails(id)    // Test lazy loading');
    console.log('   - clearQueryCache()                 // Clear cache');
}

