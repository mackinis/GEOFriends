
import "dotenv/config";
import nodemailer from "nodemailer";

const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT || "587", 10);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const fromAddress = process.env.EMAIL_FROM || `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`;

if (!host || !user || !pass) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("VARIABLES DE ENTORNO DE EMAIL NO CONFIGURADAS. EL CORREO FALLARÁ.");
    console.error("Asegúrate de que EMAIL_HOST, EMAIL_PORT, EMAIL_USER, y EMAIL_PASS estén en .env");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

const createTransporter = () => {
    // Para el puerto 587, 'secure' debe ser 'false' porque Nodemailer usará STARTTLS.
    // Para el puerto 465, 'secure' debe ser 'true'.
    return nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, 
        auth: {
          user: user,
          pass: pass,
        },
        logger: true,
        debug: true, 
    });
}


export async function sendVerificationEmail(to: string, token: string) {
    const mailOptions = {
        from: fromAddress,
        to: to,
        subject: "Verifica tu cuenta de GeoFriends",
        html: `<p>Hola,</p>
               <p>Gracias por registrarte en GeoFriends. Por favor, usa el siguiente token para verificar tu cuenta:</p>
               <h2 style="font-family: Courier, monospace; letter-spacing: 2px; padding: 10px; border: 1px dashed #ccc;">${token}</h2>
               <p>Gracias,<br>El equipo de GeoFriends</p>`
    };
    
    const transporter = createTransporter();

    try {
        console.log(`Intentando enviar email a: ${to} usando host: ${host} en puerto: ${port}`);
        const info = await transporter.sendMail(mailOptions);
        console.log("Email enviado exitosamente. Message ID:", info.messageId);
    } catch (error) {
        console.error("ERROR DETALLADO AL ENVIAR EMAIL:", error);
        throw new Error("No se pudo enviar el correo de verificación.");
    }
}
