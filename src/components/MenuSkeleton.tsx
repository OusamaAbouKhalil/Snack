// High-fidelity loading state for the storefront — mirrors the real
// header/hero/category/product layout so the page doesn't "jump" once
// data arrives, instead of a blank screen with a spinner.
export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-cream-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-cream-50/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-primary-100 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl shimmer" />
              <div className="hidden sm:block space-y-1.5">
                <div className="h-4 w-24 rounded shimmer" />
                <div className="h-2.5 w-32 rounded shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full shimmer" />
              <div className="w-9 h-9 rounded-full shimmer" />
              <div className="h-10 w-24 rounded-full shimmer" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <div className="h-4 w-32 rounded-full shimmer" />
            <div className="h-10 w-full max-w-md rounded-2xl shimmer" />
            <div className="h-10 w-3/4 max-w-sm rounded-2xl shimmer" />
            <div className="h-4 w-full max-w-lg rounded shimmer" />
            <div className="h-4 w-2/3 max-w-md rounded shimmer" />
            <div className="flex gap-3 pt-2">
              <div className="h-12 w-40 rounded-full shimmer" />
              <div className="h-12 w-32 rounded-full shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
            <div className="row-span-2 rounded-4xl shimmer aspect-[4/5]" />
            <div className="rounded-3xl shimmer aspect-square" />
            <div className="rounded-3xl shimmer aspect-square" />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-3 pb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 rounded-full shimmer" style={{ width: 90 + (i % 3) * 24 }} />
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-16">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden shadow-card bg-white dark:bg-gray-800 border border-primary-100/80 dark:border-gray-700">
              <div className="aspect-[4/3] shimmer" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 rounded shimmer" />
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-3 w-1/2 rounded shimmer" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-5 w-14 rounded shimmer" />
                  <div className="h-9 w-9 rounded-full shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
