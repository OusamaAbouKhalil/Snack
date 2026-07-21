import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Power } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useCategoryManagement } from '../../hooks/useCategoryManagement';
import { Category } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card, PageHeader, Button, IconButton, Badge, Field, Input, Switch, Modal, EmptyState, Spinner } from './ui/Kit';

export function CategoryManagement() {
  const { categories, loading, refetch } = useProducts();
  const { createCategory, updateCategory, deleteCategory, loading: actionLoading } = useCategoryManagement();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_order: '',
    is_available: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name,
      display_order: parseInt(formData.display_order) || 0,
      is_available: formData.is_available
    };

    let success = false;
    if (editingCategory) {
      success = await updateCategory(editingCategory.id, categoryData);
    } else {
      success = await createCategory(categoryData);
    }

    if (success) {
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', display_order: '', is_available: true });
      refetch();
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      display_order: category.display_order.toString(),
      is_available: category.is_available
    });
    setShowForm(true);
  };

  const toggleAvailable = async (category: Category) => {
    const success = await updateCategory(category.id, { is_available: !category.is_available });
    if (success) refetch();
  };

  const handleDelete = async (categoryId: string) => {
    if (await confirm({ message: 'Are you sure you want to delete this category? This will also remove all products in this category.', danger: true })) {
      const success = await deleteCategory(categoryId);
      if (success) {
        refetch();
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', display_order: '', is_available: true });
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Management"
        subtitle="Organize your products into categories"
        actions={<Button icon={Plus} onClick={() => setShowForm(true)}>Add Category</Button>}
      />

      <Card padded={false}>
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Categories</h2>

          {categories.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No categories found" message="Create your first category to get started" />
          ) : (
            <div className="space-y-3">
              {categories
                .sort((a, b) => a.display_order - b.display_order)
                .map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      category.is_available
                        ? 'bg-gray-50 dark:bg-gray-900/40'
                        : 'bg-gray-50/60 dark:bg-gray-900/20 border border-dashed border-gray-300 dark:border-gray-600 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-primary-100 dark:bg-primary-900/50 p-2 rounded-lg flex-shrink-0">
                        <FolderOpen className="text-primary-600 dark:text-primary-400" size={20} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
                          <Badge tone={category.is_available ? 'success' : 'neutral'}>
                            {category.is_available ? 'Visible' : 'Hidden'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Display Order: {category.display_order}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAvailable(category)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          category.is_available
                            ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        <Power size={14} />
                        {category.is_available ? 'Hide from menu' : 'Show on menu'}
                      </button>
                      <IconButton icon={Edit} label={`Edit ${category.name}`} tone="primary" onClick={() => handleEdit(category)} />
                      <IconButton icon={Trash2} label={`Delete ${category.name}`} tone="danger" onClick={() => handleDelete(category.id)} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Card>

      <Modal open={showForm} onClose={closeForm} title={editingCategory ? 'Edit Category' : 'Add New Category'} maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Category Name" required>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Field>

          <Field label="Display Order" helper="Lower numbers appear first">
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              placeholder="0"
            />
          </Field>

          <Switch
            checked={formData.is_available}
            onChange={(v) => setFormData({ ...formData, is_available: v })}
            label="Visible on the storefront menu"
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading} className="flex-1">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
