import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { caregiverService } from "@/api/services/caregiverService";

/**
 * Custom hook to manage all Caregiver operations: Read, Create, Update, and Delete (CRUD).
 */
export const useCaregivers = () => {
    const queryClient = useQueryClient();

    // 1. READ: Fetch all caregivers
    const caregiversQuery = useQuery({
        queryKey: ["caregivers"],
        queryFn: caregiverService.getAll,
    });

    // 2. DELETE: Remove a caregiver
    const deleteMutation = useMutation({
        mutationFn: (id) => caregiverService.delete(id),
        onSuccess: () => {
            // Refetch the list to show the caregiver is gone
            queryClient.invalidateQueries({ queryKey: ["caregivers"] });
        },
    });

    // 3. CREATE: Add a new caregiver
    const createMutation = useMutation({
        mutationFn: (newCaregiver) => caregiverService.create(newCaregiver),
        onSuccess: () => {
            // Refetch the list to show the new member
            queryClient.invalidateQueries({ queryKey: ["caregivers"] });
        },
    });

    // 4. UPDATE: Modify an existing caregiver
    const updateMutation = useMutation({
        // Here we expect an object like { id: 1, data: { name: 'New Name' } }
        mutationFn: ({ id, data }) => caregiverService.update(id, data),
        onSuccess: () => {
            // Refetch to show updated information
            queryClient.invalidateQueries({ queryKey: ["caregivers"] });
        },
    });

    // Export everything the component needs
    return {
        // Data and Loading state for the list
        caregivers: caregiversQuery.data ?? [],
        isLoading: caregiversQuery.isLoading,
        isError: caregiversQuery.isError,
        error: caregiversQuery.error,

        // Action methods
        addCaregiver: createMutation.mutate,
        updateCaregiver: updateMutation.mutate,
        deleteCaregiver: deleteMutation.mutate,

        // Specific loading states for buttons (optional but helpful)
        isAdding: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};