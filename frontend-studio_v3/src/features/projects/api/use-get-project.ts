import { useQuery } from "@tanstack/react-query";

export type ResponseType = {
  data: {
    id: string;
    name: string;
    json: string;
    width: number;
    height: number;
    isTemplate?: boolean;
    isPro?: boolean;
    thumbnailUrl?: string | null;
  };
};

export const useGetProject = (id: string) => {
  return useQuery<ResponseType>({
    enabled: !!id,
    queryKey: ["project", { id }],
    queryFn: async () => {
      // Local stub: there is no backend in this shell, so this should not
      // normally be called (the demo page passes `initialData` directly).
      return {
        data: {
          id,
          name: "Untitled",
          json: "{}",
          width: 1000,
          height: 1500,
        },
      };
    },
  });
};

export default useGetProject;
