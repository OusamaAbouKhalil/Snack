import { useState } from 'react';
import { BarChart3, FileText, Tag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancialRecords } from '../../hooks/useFinancialRecords';
import { FinancialDashboard } from './FinancialDashboard';
import { FinancialRecordsTable } from './FinancialRecordsTable';
import { FinancialRecordForm } from './FinancialRecordForm';
import { ExpenseCategoryManager } from './ExpenseCategoryManager';
import { FinancialRecord } from '../../types';
import { PageHeader, Tabs } from './ui/Kit';

type View = 'dashboard' | 'records' | 'categories';

export function FinancialManagement() {
  const { t, dir } = useLanguage();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  const {
    records,
    categories,
    loading,
    error,
    createRecord,
    updateRecord,
    deleteRecord,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch,
  } = useFinancialRecords();

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setShowRecordForm(true);
  };

  const handleEditRecord = (record: FinancialRecord) => {
    setEditingRecord(record);
    setShowRecordForm(true);
  };

  const handleCloseForm = () => {
    setShowRecordForm(false);
    setEditingRecord(null);
  };

  const handleSubmitRecord = async (record: Omit<FinancialRecord, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    const result = editingRecord
      ? await updateRecord(editingRecord.id, record)
      : await createRecord(record);

    // Refetch records after create/update to ensure dashboard gets updated data
    if (!result.error) {
      refetch();
    }

    return result;
  };

  const views = [
    { id: 'dashboard' as View, label: t('financial.dashboard'), icon: BarChart3 },
    { id: 'records' as View, label: t('financial.records'), icon: FileText },
    { id: 'categories' as View, label: t('financial.categories'), icon: Tag },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      <PageHeader title={t('financial.title')} />

      <Tabs tabs={views} active={activeView} onChange={setActiveView} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div>
        {activeView === 'dashboard' && (
          <FinancialDashboard
            records={records}
            onRefetch={refetch}
          />
        )}

        {activeView === 'records' && (
          <FinancialRecordsTable
            records={records}
            loading={loading}
            onCreate={handleCreateRecord}
            onEdit={handleEditRecord}
            onDelete={deleteRecord}
          />
        )}

        {activeView === 'categories' && (
          <ExpenseCategoryManager
            categories={categories}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}
      </div>

      {/* Record Form Modal */}
      <FinancialRecordForm
        isOpen={showRecordForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitRecord}
        record={editingRecord}
        categories={categories}
      />
    </div>
  );
}
