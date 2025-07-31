
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, getDocs, writeBatch, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { deleteChatRecursively } from "@/lib/chat";

// Schema for Branding Settings
const brandingSettingsSchema = z.object({
  siteName: z.string().min(1, "El nombre del sitio es requerido."),
  copyright: z.string().min(1, "El copyright es requerido."),
  developer: z.string().min(1, "El desarrollador es requerido."),
  developerWeb: z.string().url("Debe ser una URL válida.").or(z.literal("")),
  markerOpacity: z.number().min(0).max(1).default(1),
});

export type BrandingSettings = z.infer<typeof brandingSettingsSchema>;

const defaultBrandingSettings: BrandingSettings = {
    siteName: "GeoFriends",
    copyright: "© 2024 GeoFriends. Todos los derechos reservados.",
    developer: "El Equipo de Firebase",
    developerWeb: "https://firebase.google.com",
    markerOpacity: 1,
}

// Schema for Timing Settings
const timingSettingsSchema = z.object({
    editMessageTime: z.number().min(0, "El tiempo debe ser positivo."),
    deleteMessageTime: z.number().min(0, "El tiempo debe ser positivo."),
    gpsInactiveTime: z.number().min(1, "El tiempo debe ser de al menos 1 segundo."),
    gpsQueryTimeout: z.number().min(1000, "El timeout debe ser de al menos 1000 ms."),
});

export type TimingSettings = z.infer<typeof timingSettingsSchema>;

const defaultTimingSettings: TimingSettings = {
    editMessageTime: 0,
    deleteMessageTime: 0,
    gpsInactiveTime: 60, // 1 minute
    gpsQueryTimeout: 10000, // 10 seconds
}

// Function to get branding settings
export async function getBrandingSettings(): Promise<BrandingSettings> {
  const settingsRef = doc(db, "settings", "branding");
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    const data = settingsSnap.data();
    return {
      ...defaultBrandingSettings,
      ...data,
    } as BrandingSettings;
  } else {
    await setDoc(settingsRef, defaultBrandingSettings);
    return defaultBrandingSettings;
  }
}

// Function to update branding settings
export async function updateBrandingSettings(values: BrandingSettings) {
  const validatedFields = brandingSettingsSchema.safeParse(values);

  if (!validatedFields.success) {
    throw new Error("Campos inválidos.");
  }

  const settingsRef = doc(db, "settings", "branding");
  await setDoc(settingsRef, validatedFields.data, { merge: true });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard", "page");
  revalidatePath("/admin/settings", "page");
}

// Function to get timing settings
export async function getTimingSettings(): Promise<TimingSettings> {
  const settingsRef = doc(db, "settings", "timings");
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    return {
        ...defaultTimingSettings,
        ...settingsSnap.data(),
    } as TimingSettings;
  } else {
    await setDoc(settingsRef, defaultTimingSettings);
    return defaultTimingSettings;
  }
}

// Function to update timing settings
export async function updateTimingSettings(values: TimingSettings) {
    const validatedFields = timingSettingsSchema.safeParse(values);

    if (!validatedFields.success) {
        throw new Error("Campos inválidos.");
    }

    const settingsRef = doc(db, "settings", "timings");
    await setDoc(settingsRef, validatedFields.data, { merge: true });

    revalidatePath("/admin/timings", "page");
}

export async function clearChatHistory(chatId: string) {
    if (!chatId) {
        return { success: false, message: "ID de chat no proporcionado." };
    }

    try {
        await deleteChatRecursively(chatId);
        revalidatePath("/admin/chats", "page");
        return { success: true, message: "El chat ha sido eliminado permanentemente." };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
        console.error("Error al limpiar el historial del chat:", errorMessage);
        return { success: false, message: `No se pudo limpiar el historial del chat: ${errorMessage}` };
    }
}
