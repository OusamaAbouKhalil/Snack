import React from 'react';
import { Menu } from './components/Menu';
import { useProducts } from './hooks/useProducts';
import { Coffee } from 'lucide-react';

export function MenuApp() {
  const { products, categories, loading, error } = useProducts();
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl">
                <Coffee className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Crêpe Café</h1>
                <p className="text-sm text-gray-600">Delicious Crepes & More</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Menu
          products={products.filter(p => p.is_available)}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      </main>
    </div>
  );
}