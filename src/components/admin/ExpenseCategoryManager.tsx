import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ExpenseCategory } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card, Button, IconButton, Field, Input, Modal, TableShell, Thead, Th, Td, EmptyState } from './ui/Kit';

interface ExpenseCategoryManagerProps {
  categories: ExpenseCategory[];
  onCreate: (nameEn: string, nameAr: string) => Promise<{ data: any; error: string | null }>;
  onUpdate: (id: string, nameEn: string, nameAr: string) => Promise<{ data: any; error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

export function ExpenseCategoryManager({
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: ExpenseCategoryManagerProps) {
  const { t, dir } = useLanguage();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!nameEn.trim() || !nameAr.trim()) {
      setError('Both English and Arabic names are required');
      setLoading(false);
      return;
    }

    try {
      if (editingCategory) {
        const result = await onUpdate(editingCategory.id, nameEn.trim(), nameAr.trim());
        if (result.error) {
          setError(result.error);
        } else {
          resetForm();
        }
      } else {
        const result = await onCreate(nameEn.trim(), nameAr.trim());
        if (result.error) {
          setError(result.error);
        } else {
          resetForm();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNameEn('');
    setNameAr('');
    setEditingCategory(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setNameEn(category.name_en);
    setNameAr(category.name_ar);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: t('financial.deleteCategoryConfirm'), danger: true }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onDelete(id);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('financial.categories')}</h3>
        <Button
          icon={Plus}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          {t('financial.createCategory')}
        </Button>
      </div>

      {error && !showForm && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {categories.length === 0 ? (
        <EmptyState title={t('financial.noCategories')} />
      ) : (
        <Card padded={false}>
          <TableShell>
            <Thead>
              <Th>{t('financial.categoryName')} (EN)</Th>
              <Th>{t('financial.categoryName')} (AR)</Th>
              <Th align="end">{t('common.actions')}</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="text-gray-900 dark:text-gray-100">{category.name_en}</Td>
                  <Td className="text-gray-900 dark:text-gray-100" align="start">
                    <span dir="rtl">{category.name_ar}</span>
                  </Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton icon={Pencil} label={t('common.edit')} tone="primary" onClick={() => handleEdit(category)} />
                      <IconButton icon={Trash2} label={t('common.delete')} tone="danger" onClick={() => handleDelete(category.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={resetForm}
        title={editingCategory ? t('financial.editCategory') : t('financial.createCategory')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('financial.categoryNameEn')} required>
            <Input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
          </Field>

          <Field label={t('financial.categoryNameAr')} required>
            <Input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </Field>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" loading={loading}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
