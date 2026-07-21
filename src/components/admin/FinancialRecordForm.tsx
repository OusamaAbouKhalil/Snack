import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FinancialRecord, ExpenseCategory } from '../../types';
import { Modal, Field, Input, Select, Textarea, Button } from './ui/Kit';

interface FinancialRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: Omit<FinancialRecord, 'id' | 'created_at' | 'updated_at' | 'category'>) => Promise<{ data: any; error: string | null }>;
  record?: FinancialRecord | null;
  categories: ExpenseCategory[];
}

export function FinancialRecordForm({
  isOpen,
  onClose,
  onSubmit,
  record,
  categories,
}: FinancialRecordFormProps) {
  const { t, language } = useLanguage();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setType(record.type);
      setCategoryId(record.category_id || '');
      setAmount(record.amount.toString());
      setDescription(record.description);
      setRecordDate(record.record_date);
    } else {
      resetForm();
    }
  }, [record, isOpen]);

  const resetForm = () => {
    setType('expense');
    setCategoryId('');
    setAmount('');
    setDescription('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const result = await onSubmit({
        type,
        category_id: categoryId || null,
        amount: parseFloat(amount),
        description: description.trim(),
        record_date: recordDate,
      });

      if (result.error) {
        setError(result.error);
      } else {
        resetForm();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (cat: ExpenseCategory) => {
    return language === 'ar' ? cat.name_ar : cat.name_en;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={record ? t('financial.editRecord') : t('financial.createRecord')}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('financial.recordType')}>
          <Select value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')}>
            <option value="expense">{t('financial.expense')}</option>
            <option value="income">{t('financial.income')}</option>
          </Select>
        </Field>

        <Field label={t('financial.category')}>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('financial.selectCategory')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {getCategoryName(cat)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('common.amount')} required>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>

        <Field label={t('common.description')}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>

        <Field label={t('common.date')} required>
          <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} required />
        </Field>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
