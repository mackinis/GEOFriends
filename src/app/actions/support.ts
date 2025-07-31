
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { sendSupportEmail } from "@/lib/mail";

const supportSchema = z.object({
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
  userId: z.string().min(1, "ID de usuario es requerido."),
  userName: z.string().min(1, "Nombre de usuario es requerido."),
  userEmail: z.string().email("Email de usuario inválido."),
});

export async function sendSupportRequest(values: z.infer<typeof supportSchema>) {
  const validatedFields = supportSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, message: "Campos inválidos." };
  }

  const { message, userId, userName, userEmail } = validatedFields.data;

  try {
    // Find the admin user
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "No se encontró una cuenta de administrador para recibir el mensaje." };
    }

    const adminUser = querySnapshot.docs[0].data();
    const adminEmail = adminUser.email;

    if (!adminEmail) {
        return { success: false, message: "La cuenta de administrador no tiene un email configurado." };
    }

    // Send the email
    await sendSupportEmail(adminEmail, userEmail, userName, message);

    return { success: true, message: "Tu mensaje ha sido enviado exitosamente. Nos pondremos en contacto contigo pronto." };
  } catch (error) {
    console.error("Error enviando la solicitud de soporte:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error en el servidor.";
    return { success: false, message: errorMessage };
  }
}
