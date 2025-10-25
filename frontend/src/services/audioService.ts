
import api from '../lib/api';

const apiBasePath = '/api/v1';

const createServiceResult = (data: any = null, error: any = null) => ({
  success: !error,
  data,
  error,
});

export const audioService = {
  transcribeAudio: async (audioBlob: Blob, filename = "audio.webm") => {
    if (!audioBlob) {
      return createServiceResult(null, "Audio Blob is missing.");
    }
    const formData = new FormData();
    formData.append("audio", audioBlob, filename);
    try {
      console.log(
        `Sending audio blob (size: ${audioBlob.size}, type: ${audioBlob.type}) as ${filename}`
      );
      const response = await api.post(
        `${apiBasePath}/transcribe`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log("Transcription API response:", response.data);
      return createServiceResult(response.data);
    } catch (error: any) {
      console.error("Error during audio transcription request:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.message ||
        "Failed to transcribe audio.";
      return createServiceResult(null, errorMsg);
    }
  },

  synthesizeSpeech: async (messageId: string) => {
    if (!messageId) {
      return createServiceResult(null, "Message ID is required.");
    }
    try {
      console.log(
        `[AudioService] Requesting speech synthesis for message ID: ${messageId}`
      );
      const response = await api.post(`${apiBasePath}/audio/synthesize`, {
        message_id: messageId,
      });
      const responseData = response.data as {
        audio_base64?: string;
        mime_type?: string;
        [key: string]: unknown;
      };
      if (responseData?.audio_base64 && responseData?.mime_type) {
        console.log(
          `[AudioService] Synthesis successful for message ${messageId}.`
        );
        return createServiceResult(responseData);
      } else {
        console.error(
          "[AudioService] Invalid response format from synthesis API:",
          response.data
        );
        return createServiceResult(
          null,
          "Resposta inválida da API de síntese."
        );
      }
    } catch (error: any) {
      console.error(
        `[AudioService] Error synthesizing speech for message ${messageId}:`,
        error.response || error
      );
      const errorMsg =
        error.response?.data?.detail ||
        error.message ||
        "Falha ao gerar áudio.";
      return createServiceResult(null, errorMsg);
    }
  },
};
