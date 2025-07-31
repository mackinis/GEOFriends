
"use server";

import "dotenv/config";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { generateToken } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/mail";

const registerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  email: z.string().email("Por favor, introduce un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  phone: z.string().min(1, "El teléfono es requerido."),
  address: z.string().min(1, "La dirección es requerida."),
  postalCode: z.string().min(1, "El código postal es requerido."),
  city: z.string().min(1, "La ciudad es requerida."),
  province: z.string().min(1, "La provincia es requerida."),
  country: z.string().min(1, "El país es requerido."),
});

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

const setupAdminSchema = z.object({
  email: z.string().email("Por favor, introduce un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

const verifyTokenSchema = z.object({
  email: z.string().email(),
  token: z.string().length(24),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, message: "Campos inválidos." };
  }

  const { email, password, firstName, lastName, phone, address, postalCode, city, province, country } = validatedFields.data;
  const name = `${firstName} ${lastName}`;

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { success: false, message: "El correo electrónico ya está en uso." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateToken();

    await addDoc(usersRef, {
      name,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      address,
      postalCode,
      city,
      province,
      country,
      emailVerified: false,
      verificationToken,
      status: "pending", 
      role: "user",
      chatEnabled: true,
      createdAt: new Date(),
      avatar: `https://placehold.co/100x100.png?text=${firstName.charAt(0)}`
    });

    await sendVerificationEmail(email, verificationToken);

    return { success: true, message: "¡Usuario registrado! Por favor verifica tu correo." };
  } catch (error) {
    console.error("Error en el registro:", error);
    return { success: false, message: "Ocurrió un error en el servidor." };
  }
}

export async function loginUser(values: z.infer<typeof loginSchema>) {
    const validatedFields = loginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Campos inválidos." };
    }
  
    const { email, password } = validatedFields.data;
  
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const adminRef = collection(db, "users");
        const q = query(adminRef, where("role", "==", "admin"));
        const adminSnapshot = await getDocs(q);
        
        if (adminSnapshot.empty) {
            return { success: true, message: "Configuración de admin requerida.", needsAdminSetup: true };
        }
        
        return { success: false, message: "Las credenciales provisionales han expirado." };
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Usuario no encontrado." };
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        const passwordsMatch = await bcrypt.compare(password, userData.password);

        if (!passwordsMatch) {
            return { success: false, message: "Contraseña incorrecta." };
        }

        if (!userData.emailVerified) {
            return { success: false, message: "Debes verificar tu correo electrónico antes de iniciar sesión.", needsVerification: true, userEmail: email };
        }

        if (userData.status === 'suspended') {
            return { success: false, message: "Tu cuenta ha sido suspendida por un administrador." };
        }

        if (userData.status !== 'aprobado' && userData.role !== 'admin') {
            return { success: false, message: "Tu cuenta está pendiente de aprobación por un administrador." };
        }

        return { success: true, message: "Inicio de sesión exitoso.", isAdmin: userData.role === 'admin', userEmail: userData.email };
    } catch (error) {
        console.error("Error en inicio de sesión:", error);
        return { success: false, message: "Ocurrió un error en el servidor." };
    }
}

export async function setupAdmin(values: z.infer<typeof setupAdminSchema>) {
    const validatedFields = setupAdminSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Campos inválidos." };
    }

    const { email, password } = validatedFields.data;

    try {
        const usersRef = collection(db, "users");
        
        let q = query(usersRef, where("role", "==", "admin"));
        let querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, message: "Un administrador ya ha sido configurado." };
        }

        q = query(usersRef, where("email", "==", email));
        querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, message: "El correo electrónico ya está en uso." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateToken();

        await addDoc(usersRef, {
            name: "Administrador",
            firstName: "Administrador",
            lastName: "",
            email,
            password: hashedPassword,
            emailVerified: false,
            verificationToken,
            status: "aprobado", 
            role: "admin",
            chatEnabled: true,
            createdAt: new Date(),
            avatar: `https://placehold.co/100x100.png?text=A`
        });

        await sendVerificationEmail(email, verificationToken);

        return { success: true, message: "¡Credenciales de admin guardadas! Por favor verifica tu correo." };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error detallado en la configuración del admin:", errorMessage);
        return { success: false, message: `Ocurrió un error en el servidor: ${errorMessage}` };
    }
}


export async function verifyUserToken(values: z.infer<typeof verifyTokenSchema>) {
    const validatedFields = verifyTokenSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Campos inválidos." };
    }

    const { email, token } = validatedFields.data;

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email), where("verificationToken", "==", token));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Token inválido o expirado." };
        }

        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "users", userDoc.id), {
            emailVerified: true,
            verificationToken: null, 
        });
        
        const userData = userDoc.data();
        
        if (userData.role === 'admin') {
            return { success: true, message: "¡Correo verificado exitosamente! Ya puedes iniciar sesión.", isAdmin: true };
        }

        return { success: true, message: "¡Correo verificado exitosamente! Tu cuenta está ahora pendiente de aprobación por un administrador.", isAdmin: false };

    } catch (error) {
        console.error("Error en la verificación de token:", error);
        return { success: false, message: "Ocurrió un error en el servidor." };
    }
}

export async function resendVerificationToken(email: string) {
    if (!email) {
        return { success: false, message: "Email es requerido." };
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Usuario no encontrado." };
        }
        
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.emailVerified) {
            return { success: false, message: "Este correo ya ha sido verificado." };
        }
        
        const newVerificationToken = generateToken();
        
        await updateDoc(doc(db, "users", userDoc.id), {
            verificationToken: newVerificationToken,
        });

        await sendVerificationEmail(email, newVerificationToken);

        return { success: true, message: "Se ha reenviado un nuevo token de verificación a tu correo." };

    } catch (error) {
        console.error("Error reenviando token:", error);
        return { success: false, message: "Ocurrió un error en el servidor." };
    }
}
