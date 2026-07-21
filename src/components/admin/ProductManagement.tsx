import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Package, Upload, X, Check, Power, PowerOff, CheckSquare, Square } from 'lucide-react';
import { useAdminProducts } from '../../hooks/useAdminProducts';
import { useProductManagement } from '../../hooks/useProductManagement';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card, PageHeader, Button, Badge, Field, Input, Textarea, Select, Switch, Modal, Spinner } from './ui/Kit';

const IMAGE_BUCKET = 'product-images';
const PUBLIC_PREFIX = `/storage/v1/object/public/${IMAGE_BUCKET}/`;

// Downscale to max 800px and encode as WebP (JPEG fallback) so uploads stay small.
async function resizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string, q: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
    const webp = await toBlob('image/webp', 0.75);
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
    const jpeg = await toBlob('image/jpeg', 0.8);
    if (jpeg) return { blob: jpeg, ext: 'jpg' };
  } catch {
    // fall through to original file
  }
  return { blob: file, ext: file.name.split('.').pop() || 'jpg' };
}

async function uploadProductImage(file: File): Promise<string> {
  const { blob, ext } = await resizeImage(file);
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { cacheControl: '31536000', contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Best-effort cleanup of a replaced/removed image that lives in our bucket.
function deleteStorageImage(url: string) {
  const i = url.indexOf(PUBLIC_PREFIX);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + PUBLIC_PREFIX.length));
  supabase.storage.from(IMAGE_BUCKET).remove([path]).catch(() => {});
}

export function ProductManagement() {
  const { products, categories, loading, error, refetch } = useAdminProducts();
  const { createProduct, updateProduct, deleteProduct, loading: actionLoading } = useProductManagement();
  const toast = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true
  });

  // Memoize filtered products to avoid recalculation on every render
  const filteredProducts = useMemo(() =>
    products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [products, searchTerm]
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Preview stays local only — the file is uploaded to Storage on save,
      // and only its URL is stored in the database (never base64).
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, image_url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imageUrl = formData.image_url;
    if (imageFile) {
      try {
        imageUrl = await uploadProductImage(imageFile);
      } catch (err: any) {
        toast.error(`Image upload failed: ${err.message || err}`);
        return;
      }
    }
    if (imageUrl.startsWith('data:')) {
      toast.error('Base64 images are not allowed — upload a file or paste an image URL.');
      return;
    }

    const productData = {
      ...formData,
      image_url: imageUrl,
      price: parseFloat(formData.price)
    };

    let success = false;
    if (editingProduct) {
      success = await updateProduct(editingProduct.id, productData);
    } else {
      success = await createProduct(productData);
    }

    if (success && editingProduct?.image_url && editingProduct.image_url !== imageUrl) {
      deleteStorageImage(editingProduct.image_url);
    }

    if (success) {
      resetForm();
      // Only refetch if we have products, otherwise they're loading anyway
      if (products.length > 0) {
        refetch();
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_available: product.is_available
    });
    setImagePreview(product.image_url || '');
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (await confirm({ message: 'Are you sure you want to delete this product?', danger: true })) {
      const success = await deleteProduct(productId);
      if (success && products.length > 0) {
        refetch();
      }
    }
  };

  const toggleSelected = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) =>
      filteredProducts.every((p) => prev.has(p.id)) ? new Set() : new Set(filteredProducts.map((p) => p.id))
    );
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetAvailable = async (available: boolean) => {
    setBulkLoading(true);
    await Promise.all([...selectedIds].map((id) => updateProduct(id, { is_available: available })));
    setBulkLoading(false);
    clearSelection();
    refetch();
  };

  const bulkDelete = async () => {
    const count = selectedIds.size;
    if (!(await confirm({ message: `Delete ${count} selected product${count === 1 ? '' : 's'}? This cannot be undone.`, danger: true }))) return;
    setBulkLoading(true);
    await Promise.all([...selectedIds].map((id) => deleteProduct(id)));
    setBulkLoading(false);
    clearSelection();
    refetch();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
      is_available: true
    });
  };

  // Only show full loading if we have no products at all
  if (loading && products.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="!bg-red-50 dark:!bg-red-900/30 !border-red-200 dark:!border-red-800 flex items-center justify-between">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <Button variant="danger" size="sm" onClick={() => refetch()}>Retry</Button>
        </Card>
      )}

      <PageHeader
        title="Product Management"
        subtitle="Manage your menu items and products"
        actions={<Button icon={Plus} onClick={() => setShowForm(true)}>Add Product</Button>}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Selection / bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toggleSelectAllVisible}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          {filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id)) ? (
            <CheckSquare size={17} />
          ) : (
            <Square size={17} />
          )}
          Select all
        </button>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-3 py-2">
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{selectedIds.size} selected</span>
            <Button size="sm" variant="secondary" icon={Power} loading={bulkLoading} onClick={() => bulkSetAvailable(true)}>Mark Available</Button>
            <Button size="sm" variant="secondary" icon={PowerOff} loading={bulkLoading} onClick={() => bulkSetAvailable(false)}>Mark Unavailable</Button>
            <Button size="sm" variant="danger" icon={Trash2} loading={bulkLoading} onClick={bulkDelete}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProducts.map((product) => {
          const selected = selectedIds.has(product.id);
          return (
            <Card key={product.id} padded={false} className={`overflow-hidden relative ${selected ? 'ring-2 ring-primary-500' : ''}`}>
              <button
                onClick={() => toggleSelected(product.id)}
                aria-label={selected ? `Deselect ${product.name}` : `Select ${product.name}`}
                className={`absolute top-2.5 start-2.5 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                  selected
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/90 dark:bg-gray-900/80 text-transparent hover:text-gray-400 border border-gray-300 dark:border-gray-600'
                }`}
              >
                <Check size={14} />
              </button>

              <div className="aspect-video bg-gradient-to-br from-primary-100 to-cream-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="text-gray-400 dark:text-gray-500" size={40} />
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</h3>
                  <Badge tone={product.is_available ? 'success' : 'danger'}>
                    {product.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{product.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                      aria-label={`Delete ${product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Product Form Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingProduct ? 'Edit Product' : 'Add New Product'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Name" required>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Field>

            <Field label="Price" required>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </Field>

          <Field label="Category">
            <Select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* Image Upload */}
          <Field label="Product Image">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 end-2 bg-red-500 dark:bg-red-600 text-white p-1.5 rounded-full hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                <Upload className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={30} />
                <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">Upload product image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm cursor-pointer transition-colors"
                >
                  Choose Image
                </label>
              </div>
            )}

            <div className="mt-3">
              <Field label="Or enter image URL">
                <Input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </Field>
            </div>
          </Field>

          <Switch
            checked={formData.is_available}
            onChange={(v) => setFormData({ ...formData, is_available: v })}
            label="Available for sale"
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading} className="flex-1">
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
