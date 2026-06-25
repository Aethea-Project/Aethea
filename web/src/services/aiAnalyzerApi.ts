export interface AIAnalyzerResponse {
  images?: {
    bbox_overlay?: { url: string };
    gradcam_overlay?: { url: string };
    roi_crops?: Array<{ url: string }>;
  };
  pdf_url_en?: string;
  pdf_url_ar?: string;
  error?: string;
}

export const aiAnalyzerApi = {
  async analyzeMedicalImage(file: File): Promise<AIAnalyzerResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.aifdrpp.me/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed with status: ${response.status}`);
    }

    return response.json();
  },
};
