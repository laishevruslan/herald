import { useQuery } from "@tanstack/react-query";

export type ResponseType = {
  data: Array<{
    id: string;
    name: string;
    json: string;
    width: number;
    height: number;
    isPro?: boolean;
    thumbnailUrl?: string | null;
  }>;
};

interface UseGetTemplatesProps {
  page: string;
  limit: string;
}

export const useGetTemplates = ({ page, limit }: UseGetTemplatesProps) => {
  return useQuery<ResponseType["data"]>({
    queryKey: ["templates", { page, limit }],
    queryFn: async () => {
      return [];
    },
    initialData: [],
  });
};

export default useGetTemplates;
