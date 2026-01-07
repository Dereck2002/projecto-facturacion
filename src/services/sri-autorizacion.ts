import * as soap from "soap";
import { SRI_CONFIG } from "../config/sri";
import { RespuestaAutorizacion } from "./types";

export async function consultarAutorizacion(claveAcceso: string): Promise<RespuestaAutorizacion> {
    try {
        const wsdl =
            SRI_CONFIG.ambiente === "1"
                ? SRI_CONFIG.wsdl.autorizacion.pruebas
                : SRI_CONFIG.wsdl.autorizacion.produccion;

        const client = await soap.createClientAsync(wsdl);

        if (SRI_CONFIG.timeout) {
            client["httpClient"].options.timeout = SRI_CONFIG.timeout;
        }

        const [result] = await client.autorizacionComprobanteAsync({
            claveAccesoComprobante: claveAcceso,
        });

        const respuesta = result?.RespuestaAutorizacionComprobante;
        const autorizacion = respuesta?.autorizaciones?.autorizacion;

        let mensajes: any[] = [];

        if (autorizacion?.mensajes?.mensaje) {
            mensajes = Array.isArray(autorizacion.mensajes.mensaje)
                ? autorizacion.mensajes.mensaje
                : [autorizacion.mensajes.mensaje];
        }

        const estado = autorizacion?.estado || "NO AUTORIZADO";

        console.log(`📜 Respuesta SRI Autorización: ${estado}`);

        // Estados posibles: AUTORIZADO, NO AUTORIZADO, EN PROCESAMIENTO
        if (estado === "AUTORIZADO") {
            console.log("✅ Comprobante AUTORIZADO por el SRI");
        } else if (estado === "NO AUTORIZADO") {
            console.log("❌ Comprobante NO AUTORIZADO");
        } else if (estado === "EN PROCESAMIENTO") {
            console.log("⏳ Comprobante EN PROCESAMIENTO, reintentar en unos segundos");
        }

        return {
            estado,
            mensajes,
            xmlAutorizado: autorizacion?.comprobante,
            numeroAutorizacion: autorizacion?.numeroAutorizacion || claveAcceso,
            fechaAutorizacion: autorizacion?.fechaAutorizacion,
            autorizacion,
        };
    } catch (error: any) {
        console.error("❌ Error al consultar autorización del SRI:", error.message);

        return {
            estado: "ERROR",
            mensajes: [{
                identificador: "ERR_CONNECTION",
                mensaje: `Error de conexión: ${error.message}`,
                informacionAdicional: error.stack
            }],
            autorizacion: null
        };
    }
}
