import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type ScannedFields = {
  from: string;
  to: string;
  item: string;
  quantity: string;
  notes: string;
  status: string;
};

const EMPTY_RESULT: ScannedFields = {
  from: "",
  to: "",
  item: "",
  quantity: "",
  notes: "",
  status: "",
};

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

const normalizeStatus = (status: string) => {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (s === "returned" || s === "overdue") return s;
  if (s === "active") return s;
  return "";
};

const getMimeTypeFromAsset = (asset: ImagePicker.ImagePickerAsset) => {
  const fromAsset = String((asset as any)?.mimeType || "").trim();
  if (fromAsset) return fromAsset;

  const uri = String(asset.uri || "").toLowerCase();
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".webp")) return "image/webp";
  if (uri.endsWith(".heic") || uri.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
};

const uriToBase64Web = async (uri: string) => {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx < 0) {
        reject(new Error("Invalid data URL"));
        return;
      }
      resolve(dataUrl.slice(commaIdx + 1));
    };
    reader.readAsDataURL(blob);
  });
};

const getBase64FromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.base64) return asset.base64;
  if (Platform.OS === "web" && asset.uri) {
    return await uriToBase64Web(asset.uri);
  }
  return "";
};

const safeJsonFromText = (text: string): any | null => {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};
const mapGeminiToFields = (parsed: any): ScannedFields => {
  const item0 = Array.isArray(parsed?.items) ? parsed.items[0] || {} : {};

  return {
    from: String(parsed?.from || parsed?.name || parsed?.sender || ""),
    to: String(parsed?.to || parsed?.address || parsed?.receiver || ""),
    item: String(item0?.item || item0?.name || ""),
    quantity: String(item0?.quantity || ""),
    notes: String(item0?.notes || parsed?.notes || ""),
    status: normalizeStatus(String(item0?.status || parsed?.status || "")),
  };
};
const callGemini = async (base64: string, mimeType: string) => {
  const apiKey = process.env.EXPO_PUBLIC_API_KEY;

  const prompt = `
Extract delivery challan details from this image.

Return ONLY JSON:
{
  "from": "",
  "to": "",
  "items": [
    {
      "item": "",
      "quantity": "",
      "notes": "",
      "status": ""
    }
  ]
}

Rules:
- No explanation
- No markdown
- Fill empty string if unknown
- status must be: active / returned / overdue
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-11b-vision-instruct", // ✅ supports images
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  const raw = await response.text();
  console.log("OpenRouter raw:", raw);

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${raw}`);
  }

  const parsed = JSON.parse(raw);

  const text = parsed?.choices?.[0]?.message?.content || "";

  if (!text) {
    throw new Error("No response from OpenRouter");
  }

  const extracted = safeJsonFromText(text);

  if (!extracted) {
    throw new Error("Failed to parse JSON from AI");
  }

  return mapGeminiToFields(extracted);
};
export const pickImageFromGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    base64: true,
  });

  console.log("ImagePicker gallery result:", result);
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  console.log("Selected gallery asset:", result.assets[0]);
  return result.assets[0];
};

export const pickImageFromCamera = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission denied");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    base64: true,
  });

  console.log("ImagePicker camera result:", result);
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  console.log("Selected camera asset:", result.assets[0]);
  return result.assets[0];
};

export const scanImageAndFillFields = async (
  asset: ImagePicker.ImagePickerAsset,
) => {
  const mimeType = getMimeTypeFromAsset(asset);
  const base64 = await getBase64FromAsset(asset);

  console.log("Selected image object:", asset);
  console.log("Detected mime type:", mimeType);
  console.log("Base64 output length:", base64?.length || 0);

  if (!base64) {
    throw new Error("Invalid image/base64 conversion failed");
  }

  const result = await callGemini(base64, mimeType);
  return result || EMPTY_RESULT;
};
