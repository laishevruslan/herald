import { useMutation, useQueryClient } from "@tanstack/react-query";

type UpdateValues = {
  json?: string;
  height?: number;
  width?: number;
  name?: string;
};

/**
 * Local stub for the real "update project" mutation. There is no backend in
 * this shell, so this just logs the values and resolves immediately. The
 * `mutationKey` matches what `Navbar` listens to via `useMutationState` so
 * the "saved" indicator still works.
 */
export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["project", { id }],
    mutationFn: async (values: UpdateValues) => {
      // eslint-disable-next-line no-console
      console.log("[use-update-project] (local stub) saving project", id, values);
      return { data: { id, ...values } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", { id }] });
    },
  });

  return mutation;
};

export default useUpdateProject;
