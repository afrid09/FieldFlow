// Purpose: Frontend module: useFields.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fieldApi } from '@/lib/api';
import { toast } from 'sonner';

export const useFields = () => {
  const queryClient = useQueryClient();

  const { data: fields, isLoading, error } = useQuery({
    queryKey: ['fields'],
    queryFn: async () => {
      const response = await fieldApi.getAll();
      return response.data;
    },
  });

  const createField = useMutation({
    mutationFn: (data: any) => fieldApi.create(data),
    onSuccess: () => {
      // Refresh list and notify after create.
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Field created successfully');
    },
    onError: () => {
      toast.error('Failed to create field');
    },
  });

  const updateField = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fieldApi.update(id, data),
    onSuccess: () => {
      // Refresh list and notify after update.
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Field updated successfully');
    },
    onError: () => {
      toast.error('Failed to update field');
    },
  });

  const deleteField = useMutation({
    mutationFn: (id: string) => fieldApi.delete(id),
    onSuccess: () => {
      // Refresh list and notify after delete.
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      toast.success('Field deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete field');
    },
  });

  return {
    fields,
    isLoading,
    error,
    createField,
    updateField,
    deleteField,
  };
};

export const useField = (fieldId: string) => {
  const { data: field, isLoading } = useQuery({
    queryKey: ['field', fieldId],
    queryFn: async () => {
      const response = await fieldApi.getById(fieldId);
      return response.data;
    },
    // Avoid request until we have an id.
    enabled: !!fieldId,
  });

  return { field, isLoading };
};
