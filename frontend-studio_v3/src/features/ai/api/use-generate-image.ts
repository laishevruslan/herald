import { useMutation } from "@tanstack/react-query";

type AspectRatio = "1:1" | "3:2" | "2:3" | "4:5" | "5:4" | "16:9" | "9:16";

interface GenerateImageValues {
  prompt: string;
  aspect_ratio?: AspectRatio;
}

type ResponseType = { data: string };

/**
 * Local stub for an AI image generation endpoint. Instead of calling a real
 * model, it returns a deterministic placeholder image from picsum.photos
 * seeded with the prompt, after a short artificial delay.
 */
export const useGenerateImage = () => {
  return useMutation<ResponseType, Error, GenerateImageValues>({
    mutationFn: async ({ prompt }) => {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const seed = encodeURIComponent(prompt.slice(0, 20) || "pin");
      const data = `https://picsum.photos/seed/${seed}/800/1200`;

      return { data };
    },
  });
};

export default useGenerateImage;
