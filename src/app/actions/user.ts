
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  firstName: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  phone: z.string().min(1, "El teléfono es requerido."),
  address: z.string().min(1, "La dirección es requerida."),
  postalCode: z.string().min(1, "El código postal es requerido."),
  city: z.string().min(1, "La ciudad es requerida."),
  province: z.string().min(1, "La provincia es requerida."),
  country: z.string().min(1, "El país es requerido."),
  avatar: z.string().url("Por favor, introduce una URL de imagen válida.").or(z.literal("")).optional(),
});


// Helper function to convert Firestore Timestamps to ISO strings
const convertTimestamps = (data: any) => {
    if (!data) return data;
    const newData: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value instanceof Timestamp) {
            newData[key] = value.toDate().toISOString();
        } else {
            newData[key] = value;
        }
    }
    return newData;
}


export async function updateUserProfile(values: z.infer<typeof profileSchema>) {
  const validatedFields = profileSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, message: "Campos inválidos." };
  }

  const { userId, ...profileData } = validatedFields.data;
  const { firstName, lastName } = profileData;

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Ensure all fields from the form are being updated
    await updateDoc(userRef, {
      ...profileData, // This passes all fields: firstName, lastName, phone, address, etc.
      name: `${firstName} ${lastName}`,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath(`/admin/users`);
    revalidatePath(`/admin/users/page`);


    const updatedUserSnap = await getDoc(userRef);
    const updatedUserData = updatedUserSnap.data();
    
    // Add the ID back to the user object before returning
    const userToReturn = {
        id: userId,
        ...updatedUserData
    }

    return { success: true, message: "¡Perfil actualizado exitosamente!", user: convertTimestamps(userToReturn) };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, message: "Ocurrió un error en el servidor." };
  }
}
