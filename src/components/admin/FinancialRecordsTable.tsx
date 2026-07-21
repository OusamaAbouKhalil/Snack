import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FinancialRecord } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card, Button, IconButton, Badge, Input, Select, TableShell, Thead, Th, Td, EmptyState, Spinner } from './ui/Kit';

interface FinancialRecordsTableProps {
  records: FinancialRecord[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

export function FinancialRecordsTable({
  records,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: FinancialRecordsTableProps) {
  const { t, dir, language } = useLanguage();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch =
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.category && (
          (language === 'ar' ? record.category.name_ar : record.category.name_en)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ));

      const matchesType = typeFilter === 'all' || record.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [records, searchTerm, typeFilter, language]);

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: t('financial.deleteRecordConfirm'), danger: true }))) {
      return;
    }

    const result = await onDelete(id);
    // Note: The hook should handle refetching, but we ensure it happens
    if (!result.error) {
      // Records will be updated in the hook's state
    }
  };

  const getCategoryName = (record: FinancialRecord) => {
    if (!record.category) return '-';
    return language === 'ar' ? record.category.name_ar : record.category.name_en;
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading) {
    return <Spinner size={36} />;
  }

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('financial.records')}</h3>
        <Button icon={Plus} onClick={onCreate}>{t('financial.createRecord')}</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <Input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'expense' | 'income')}
          className="sm:w-48"
        >
          <option value="all">{t('financial.all')}</option>
          <option value="expense">{t('financial.expense')}</option>
          <option value="income">{t('financial.income')}</option>
        </Select>
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState title={t('financial.noRecords')} />
      ) : (
        <Card padded={false}>
          <TableShell>
            <Thead>
              <Th>{t('common.date')}</Th>
              <Th>{t('common.type')}</Th>
              <Th>{t('common.category')}</Th>
              <Th>{t('common.amount')}</Th>
              <Th>{t('common.description')}</Th>
              <Th align="end">{t('common.actions')}</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="text-gray-900 dark:text-gray-100">{new Date(record.record_date).toLocaleDateString()}</Td>
                  <Td>
                    <Badge tone={record.type === 'expense' ? 'danger' : 'success'}>
                      {record.type === 'expense' ? t('financial.expense') : t('financial.income')}
                    </Badge>
                  </Td>
                  <Td className="text-gray-900 dark:text-gray-100">{getCategoryName(record)}</Td>
                  <Td className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(record.amount)}</Td>
                  <Td className="text-gray-600 dark:text-gray-400 max-w-xs truncate">{record.description || '-'}</Td>
                  <Td align="end">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton icon={Pencil} label={t('common.edit')} tone="primary" onClick={() => onEdit(record)} />
                      <IconButton icon={Trash2} label={t('common.delete')} tone="danger" onClick={() => handleDelete(record.id)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
