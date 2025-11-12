'use client';

import { ReactNode } from 'react';
import Button from './Button';
import { Plus, Save, X } from 'lucide-react';

interface FormActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
  isLoading?: boolean;
  submitIcon?: ReactNode;
  className?: string;
}

export default function FormActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Annuler',
  isEditing = false,
  isLoading = false,
  submitIcon,
  className = '',
}: FormActionsProps) {
  const defaultSubmitLabel = isEditing ? 'Modifier' : 'Créer';
  const defaultIcon = isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />;

  return (
    <div className={`flex items-center justify-end gap-3 pt-6 border-t-2 border-slate-200 bg-slate-50 rounded-b-lg -mx-6 -mb-6 px-6 pb-6 mt-8 sticky bottom-0 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
        className="hover:bg-slate-100 text-gray-700 border"
      >
        <X className="w-4 h-4 mr-2" />
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        disabled={isLoading}
        className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Chargement...
          </>
        ) : (
          <>
            {submitIcon || defaultIcon}
            {submitLabel || defaultSubmitLabel}
          </>
        )}
      </Button>
    </div>
  );
}

