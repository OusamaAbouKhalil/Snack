/**
 * INLINE PRODUCTS QUERY TEST
 * 
 * Copy and paste this entire script into your browser console while on your app page.
 * It will use the existing Supabase client from your app.
 */

(function() {
    // Try to get Supabase client from window or import
    let supabase;
    
    // Check if supabase is available in window (from your app)
    if (window.supabase && typeof window.supabase.from === 'function') {
        supabase = window.supabase;
        console.log('✅ Found Supabase client in window.supabase');
    } else if (typeof require !== 'undefined') {
        // Try to import if in Node environment
        try {
            const { createClient } = require('@supabase/supabase-js');
            console.warn('⚠️ Supabase not found. You may need to import it manually.');
        } catch (e) {
            console.error('❌ Cannot import Supabase. Please ensure it\'s available.');
        }
    } else {
        console.error('❌ Supabase client not found. Make sure you run this script in your app where Supabase is initialized.');
        console.log('💡 Tip: Check src/lib/supabase.ts and make sure supabase is exported');
        return;
    }

    console.log('\n🚀 Starting Products Query Diagnostic Tests...\n');
    console.log('='.repeat(70));

    // Test 1: Exact Query
    async function test1() {
        console.group('📋 Test 1: Exact Products Query (from useProducts)');
        const start = performance.now();
        
        try {
            const query = supabase
                .from('products')
                .select('id, name, description, price, category_id, image_url, is_available, created_at')
                .order('name', { ascending: true });
            
            const { data, error, status, statusText } = await query;
            const duration = (performance.now() - start).toFixed(2);
            
            if (error) {
                console.error('❌ FAILED');
                console.error('Status:', status, statusText);
                console.error('Error Details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    statusCode: error.statusCode || 'N/A'
                });
                console.error('Duration:', duration + 'ms');
                return { success: false, error };
            }
            
            console.log('✅ SUCCESS');
            console.log('Status:', status);
            console.log('Duration:', duration + 'ms');
            console.log('Products Count:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('Sample Product:', data[0]);
            }
            return { success: true, data, duration };
        } catch (err) {
            console.error('❌ EXCEPTION:', err);
            return { success: false, error: err };
        } finally {
            console.groupEnd();
        }
    }

    // Test 2: Without Ordering
    async function test2() {
        console.group('📋 Test 2: Products Query WITHOUT Ordering');
        
        try {
            const { data, error, status } = await supabase
                .from('products')
                .select('id, name, description, price, category_id, image_url, is_available, created_at');
            
            if (error) {
                console.error('❌ FAILED - Status:', status);
                console.error('Error:', error.message, error.code);
                return { success: false };
            }
            
            console.log('✅ SUCCESS - Products:', data?.length || 0);
            return { success: true };
        } catch (err) {
            console.error('❌ EXCEPTION:', err);
            return { success: false };
        } finally {
            console.groupEnd();
        }
    }

    // Test 3: Minimal Query
    async function test3() {
        console.group('📋 Test 3: Minimal Query (ID only, limit 10)');
        
        try {
            const { data, error, status } = await supabase
                .from('products')
                .select('id')
                .limit(10);
            
            if (error) {
                console.error('❌ FAILED - Status:', status);
                console.error('Error:', error.message, error.code);
                return { success: false };
            }
            
            console.log('✅ SUCCESS - Found:', data?.length || 0, 'products');
            return { success: true };
        } catch (err) {
            console.error('❌ EXCEPTION:', err);
            return { success: false };
        } finally {
            console.groupEnd();
        }
    }

    // Test 4: Count
    async function test4() {
        console.group('📋 Test 4: Products Count');
        
        try {
            const { count, error, status } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.error('❌ FAILED - Status:', status);
                console.error('Error:', error.message, error.code);
                return { success: false };
            }
            
            console.log('✅ SUCCESS - Total Products:', count);
            return { success: true, count };
        } catch (err) {
            console.error('❌ EXCEPTION:', err);
            return { success: false };
        } finally {
            console.groupEnd();
        }
    }

    // Test 5: Categories
    async function test5() {
        console.group('📋 Test 5: Categories Query');
        
        try {
            const { data, error, status } = await supabase
                .from('categories')
                .select('id, name, display_order, created_at')
                .order('display_order', { ascending: true });
            
            if (error) {
                console.error('❌ FAILED - Status:', status);
                console.error('Error:', error.message, error.code);
                return { success: false };
            }
            
            console.log('✅ SUCCESS - Categories:', data?.length || 0);
            return { success: true };
        } catch (err) {
            console.error('❌ EXCEPTION:', err);
            return { success: false };
        } finally {
            console.groupEnd();
        }
    }

    // Run all tests
    async function runAllTests() {
        const results = {
            test1: await test1(),
            test2: await test2(),
            test3: await test3(),
            test4: await test4(),
            test5: await test5()
        };
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 SUMMARY:');
        console.table({
            'Exact Query (with order)': results.test1.success ? '✅ PASS' : '❌ FAIL',
            'Query (no order)': results.test2.success ? '✅ PASS' : '❌ FAIL',
            'Minimal Query': results.test3.success ? '✅ PASS' : '❌ FAIL',
            'Count Query': results.test4.success ? '✅ PASS' : '❌ FAIL',
            'Categories Query': results.test5.success ? '✅ PASS' : '❌ FAIL'
        });
        
        if (results.test1.error) {
            console.log('\n🔍 DIAGNOSIS:');
            const err = results.test1.error;
            console.log('Error Code:', err.code || 'N/A');
            console.log('Error Message:', err.message);
            if (err.hint) console.log('Hint:', err.hint);
            if (err.details) console.log('Details:', err.details);
            
            if (results.test2.success && !results.test1.success) {
                console.log('\n💡 RECOMMENDATION: Ordering might be the issue. Try adding an index:');
                console.log('   CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);');
            }
            
            if (results.test3.success && !results.test1.success) {
                console.log('\n💡 RECOMMENDATION: One of the selected columns might be problematic.');
            }
        }
        
        return results;
    }

    // Auto-run if supabase is found
    if (supabase) {
        // Expose functions globally
        window.testProductsQuery = runAllTests;
        window.testProductsQuery1 = test1;
        window.testProductsQuery2 = test2;
        window.testProductsQuery3 = test3;
        window.testProductsQuery4 = test4;
        window.testProductsQuery5 = test5;
        
        console.log('\n💡 Test functions are now available:');
        console.log('   - testProductsQuery()   // Run all tests');
        console.log('   - testProductsQuery1()  // Test exact query');
        console.log('   - testProductsQuery2()  // Test without ordering');
        console.log('   - testProductsQuery3()  // Test minimal query');
        console.log('   - testProductsQuery4()  // Test count');
        console.log('   - testProductsQuery5()  // Test categories\n');
        
        console.log('⏳ Running tests in 2 seconds... (or run testProductsQuery() manually)\n');
        setTimeout(() => runAllTests(), 2000);
    }
})();

