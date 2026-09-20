import { useMutation } from "@tanstack/react-query";

interface RemoveBgValues {
  image: string;
}

type ResponseType = { data: string };

/**
 * Local stub for an AI background-removal endpoint. It just echoes the
 * input image URL back after a short delay, since there is no real
 * background-removal service wired up in this shell.
 */
export const useRemoveBg = () => {
  return useMutation<ResponseType, Error, RemoveBgValues>({
    mutationFn: async ({ image }) => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      return { data: image };
    },
  });
};

export default useRemoveBg;
