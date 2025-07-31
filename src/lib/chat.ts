
"use server";

import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, writeBatch, deleteDoc } from "firebase/firestore";

// Helper function to convert Firestore Timestamps to ISO strings
const convertTimestamps = (data: any) => {
    if (!data) return data;
    const newData: { [key: string]: any } = {};
    for (const key in data) {
        const value = data[key];
        if (value && typeof value === 'object' && value.toDate) {
            newData[key] = value.toDate().toISOString();
        } else {
            newData[key] = value;
        }
    }
    return newData;
}


// Function to get or create the general chat
export const getGeneralChat = async () => {
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("isGroup", "==", true));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Create general chat if it doesn't exist
        const allUsersQuery = await getDocs(query(collection(db, "users"), where("status", "==", "aprobado")));
        const allUserIds = allUsersQuery.docs.map(doc => doc.id);

        const newChatRef = await addDoc(chatsRef, {
            isGroup: true,
            name: "General",
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessageBy: null,
            lastMessageText: null,
            memberIds: allUserIds,
            clearRequestBy: [],
        });
        const newChatSnap = await getDoc(newChatRef);
        return { id: newChatSnap.id, ...convertTimestamps(newChatSnap.data()) };
    } else {
        const chatDoc = querySnapshot.docs[0];
        const chatData = chatDoc.data();
        
        // Ensure all required fields exist
        const updates: { [key: string]: any } = {};
        if (!chatData.lastMessageTimestamp) {
            updates.lastMessageTimestamp = serverTimestamp();
        }
        if (chatData.clearRequestBy === undefined) {
            updates.clearRequestBy = [];
        }

        const allUsersQuery = await getDocs(query(collection(db, "users"), where("status", "==", "aprobado")));
        const allUserIds = allUsersQuery.docs.map(doc => doc.id);
        if (JSON.stringify(chatData.memberIds.sort()) !== JSON.stringify(allUserIds.sort())) {
            updates.memberIds = allUserIds;
        }
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(chatDoc.ref, updates);
        }

        const updatedSnap = await getDoc(chatDoc.ref);
        return { id: updatedSnap.id, ...convertTimestamps(updatedSnap.data()) };
    }
};

// Function to get a user's profile
export const getUserProfile = async (userId: string) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            id: userSnap.id,
            ...convertTimestamps(data)
        } as any;
    } else {
        return null;
    }
};

// Function to get or create a private chat between two users
export const getOrCreatePrivateChat = async (userId1: string, userId2: string) => {
    const chatsRef = collection(db, "chats");
    const q = query(
        chatsRef, 
        where("isGroup", "==", false),
        where("memberIds", "array-contains", userId1)
    );

    const querySnapshot = await getDocs(q);
    
    let privateChatDoc = null;
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const members = data.memberIds;
        if (members.includes(userId2) && members.length === 2) {
            privateChatDoc = doc;
        }
    });


    if (privateChatDoc) {
        if (privateChatDoc.data().clearRequestBy === undefined) {
             await updateDoc(privateChatDoc.ref, { clearRequestBy: [] });
        }
        const updatedSnap = await getDoc(privateChatDoc.ref);
        return { id: updatedSnap.id, ...convertTimestamps(updatedSnap.data()) };
    } else {
        // Create a new private chat
        const newChatRef = await addDoc(chatsRef, {
            isGroup: false,
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessageBy: null,
            lastMessageText: null,
            memberIds: [userId1, userId2],
            clearRequestBy: [],
        });
        const newChatSnap = await getDoc(newChatRef);
        return { id: newChatSnap.id, ...convertTimestamps(newChatSnap.data()) };
    }
};

// Function for a user to request a chat clear
export const requestChatClear = async (chatId: string, userId: string) => {
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        throw new Error("Chat no encontrado.");
    }
    
    const chatData = chatSnap.data();
    if (chatData.isGroup) {
        throw new Error("No se puede solicitar el borrado de un chat grupal.");
    }

    await updateDoc(chatRef, {
        clearRequestBy: arrayUnion(userId)
    });
    
    return { success: true, message: "Solicitud de borrado enviada." };
};

// Function to delete a message (mark as deleted)
export async function deleteMessage(chatId: string, messageId: string) {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, {
    text: "Mensaje eliminado",
    isDeleted: true,
  });
}

// Function to edit a message
export async function editMessage(chatId: string, messageId: string, newText: string) {
  const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
  await updateDoc(messageRef, {
    text: newText,
    isEdited: true,
  });
}

export async function setMessageAsExpired(chatId: string, messageId: string) {
    const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
    await updateDoc(messageRef, {
        isExpired: true,
    });
}


// New, robust recursive delete function
export async function deleteChatRecursively(chatId: string) {
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        console.warn(`Intento de borrar un chat inexistente: ${chatId}`);
        return; // No existe, no hay nada que borrar.
    }
    const chatData = chatSnap.data();
    
    const batch = writeBatch(db);
    
    // Delete subcollection
    const messagesRef = collection(chatRef, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    // Solo borra el documento principal si no es un chat de grupo.
    if (chatData && !chatData.isGroup) {
        batch.delete(chatRef);
    } else if (chatData && chatData.isGroup) {
        // Para chats de grupo, limpia los metadatos en lugar de borrar el documento.
        batch.update(chatRef, {
            lastMessageText: "Historial de chat borrado por un administrador.",
            lastMessageTimestamp: serverTimestamp(),
            lastMessageBy: null,
            clearRequestBy: [],
        });
    }

    await batch.commit();
}
