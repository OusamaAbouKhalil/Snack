import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for lazy loading product images efficiently
 * Uses Intersection Observer to only fetch images when products are visible
 * This minimizes egress while still showing images
 */
export function useProductImages(productIds: string[]) {
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Batch fetch images for visible products
  const fetchImagesForProducts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Use functional updates to check current state
    let idsToFetch: string[] = [];
    
    setImageMap(prev => {
      setLoadingImages(currentLoading => {
        idsToFetch = ids.filter(id => !prev[id] && !currentLoading.has(id));
        
        if (idsToFetch.length === 0) {
          return currentLoading;
        }

        // Mark as loading
        const nextLoading = new Set(currentLoading);
        idsToFetch.forEach(id => nextLoading.add(id));
        
        // Fetch images asynchronously
        (async () => {
          try {
            // Fetch only image_url for these products (minimal egress)
            const { data, error } = await supabase
              .from('products')
              .select('id, image_url')
              .in('id', idsToFetch);

            if (error) {
              console.error('Error fetching images:', error);
              throw error;
            }

            // Update image map with fetched images
            const newImageMap: Record<string, string> = {};
            data?.forEach(product => {
              if (product.image_url) {
                newImageMap[product.id] = product.image_url;
              }
            });

            if (Object.keys(newImageMap).length > 0) {
              setImageMap(currentMap => {
                // Only update if there are actually new images
                const hasNewImages = Object.keys(newImageMap).some(id => !currentMap[id]);
                if (hasNewImages) {
                  return { ...currentMap, ...newImageMap };
                }
                return currentMap;
              });
            }
          } catch (err) {
            console.error('🖼️ [DEBUG] Error fetching product images:', err);
            // Remove from processed on error so it can retry
            idsToFetch.forEach(id => processedIdsRef.current.delete(id));
          } finally {
            setLoadingImages(prevLoading => {
              const finalLoading = new Set(prevLoading);
              idsToFetch.forEach(id => finalLoading.delete(id));
              return finalLoading;
            });
          }
        })();
        
        return nextLoading;
      });
      return prev;
    });
  }, []);

  // Track which product IDs we've already started loading to prevent duplicate requests
  const processedIdsRef = useRef<Set<string>>(new Set());
  const productIdsRef = useRef<string[]>([]);

  // Load images in batches immediately (menu shows all products, so load all images)
  useEffect(() => {
    // Only process if productIds actually changed
    const idsChanged = JSON.stringify(productIdsRef.current.sort()) !== JSON.stringify([...productIds].sort());
    if (!idsChanged && productIds.length > 0) {
      return;
    }
    
    productIdsRef.current = [...productIds];
    
    if (productIds.length === 0) {
      return;
    }
    
    // Find products that need images loaded (not already processed)
    const productsNeedingImages = productIds.filter(id => 
      !processedIdsRef.current.has(id)
    );
    
    if (productsNeedingImages.length === 0) {
      return;
    }
    
    // Mark as processed to prevent duplicate requests
    productsNeedingImages.forEach(id => processedIdsRef.current.add(id));
    
    // Load images in optimized batches (8 at a time for balance between speed and reliability)
    const batchSize = 8;
    const batches = [];
    for (let i = 0; i < productsNeedingImages.length; i += batchSize) {
      batches.push(productsNeedingImages.slice(i, i + batchSize));
    }

    // Load first 3 batches quickly (visible products), then slower for rest
    batches.forEach((batch, index) => {
      let delay = 0;
      
      if (index === 0) {
        // First batch: immediate
        delay = 0;
      } else if (index <= 2) {
        // Next 2 batches: 100ms delay (fast for visible products)
        delay = index * 100;
      } else {
        // Remaining batches: 200ms delay (slower for below-fold products)
        delay = 200 + (index - 3) * 200;
      }
      
      setTimeout(() => {
        fetchImagesForProducts(batch).catch(err => {
          console.error('Error loading product images batch:', err);
          // Remove from processed on error so it can retry
          batch.forEach(id => processedIdsRef.current.delete(id));
        });
      }, delay);
    });
    
    // Only depend on productIds to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds]);

  // Setup Intersection Observer for lazy loading remaining products
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleIds: string[] = [];
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const productId = entry.target.getAttribute('data-product-id');
            if (productId) {
              visibleIds.push(productId);
            }
          }
        });

        // Fetch images for visible products immediately (no debounce for faster loading)
        if (visibleIds.length > 0) {
          fetchImagesForProducts(visibleIds);
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before element is visible (earlier)
        threshold: 0.01, // Lower threshold for earlier detection
      }
    );

    // Observe any elements that were registered before observer was created
    elementRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchImagesForProducts]);

  // Register/unregister elements for observation
  const registerElement = useCallback((productId: string, element: HTMLDivElement | null) => {
    if (element) {
      element.setAttribute('data-product-id', productId);
      elementRefs.current.set(productId, element);
      
      // If observer is ready, observe immediately
      if (observerRef.current) {
        observerRef.current.observe(element);
      } else {
        // If observer not ready yet, observe it when observer is created
        // The observer setup effect will handle already-registered elements
        setTimeout(() => {
          if (observerRef.current && elementRefs.current.has(productId)) {
            const el = elementRefs.current.get(productId);
            if (el) observerRef.current.observe(el);
          }
        }, 100);
      }
    } else {
      const existingElement = elementRefs.current.get(productId);
      if (existingElement && observerRef.current) {
        observerRef.current.unobserve(existingElement);
      }
      elementRefs.current.delete(productId);
    }
  }, []);

  return {
    imageMap,
    loadingImages,
    registerElement,
    getImage: (productId: string) => imageMap[productId] || null,
  };
}

