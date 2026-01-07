import * as soap from "soap";
import { SRI_CONFIG } from "../config/sri";
import { RespuestaRecepcion } from "./types";

export async function enviarComprobanteRecepcion(xmlFirmado: string): Promise<RespuestaRecepcion> {
    try {
        const wsdl =
            SRI_CONFIG.ambiente === "1"
                ? SRI_CONFIG.wsdl.recepcion.pruebas
                : SRI_CONFIG.wsdl.recepcion.produccion;

        const xmlBase64 = Buffer.from(xmlFirmado).toString("base64");

        const client = await soap.createClientAsync(wsdl);

        if (SRI_CONFIG.timeout) {
            client["httpClient"].options.timeout = SRI_CONFIG.timeout;
        }

        const [result] = await client.validarComprobanteAsync({
            xml: xmlBase64,
        });

        const respuesta = result?.RespuestaRecepcionComprobante;

        let mensajes: any[] = [];

        if (respuesta?.comprobantes?.comprobante) {
            const comprobante = respuesta.comprobantes.comprobante;

            if (comprobante.mensajes?.mensaje) {
                mensajes = Array.isArray(comprobante.mensajes.mensaje)
                    ? comprobante.mensajes.mensaje
                    : [comprobante.mensajes.mensaje];
            }
        }

        const estado = respuesta?.estado || "ERROR";

        console.log(`📥 Respuesta SRI Recepción: ${estado}`);

        if (estado === "DEVUELTA") {
            console.log("❌ El comprobante fue DEVUELTO por el SRI");
        }

        return {
            estado,
            mensajes,
        };
    } catch (error: any) {
        console.error("❌ Error al comunicarse con el SRI (Recepción):", error.message);

        return {
            estado: "ERROR",
            mensajes: [{
                identificador: "ERR_CONNECTION",
                mensaje: `Error de conexión: ${error.message}`,
                informacionAdicional: error.stack
            }]
        };
    }
}
