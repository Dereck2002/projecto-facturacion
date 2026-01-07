/**
 * Configuración de datos de la empresa
 * Se extrae automáticamente del certificado digital
 */

import * as fs from "fs";
import * as forge from "node-forge";

// Función para extraer información del certificado
function extractCertInfo() {
    const certPassword = process.env.CERT_PASSWORD || "";

    // Buscar certificado .p12 en la carpeta certs/
    const certsDir = "certs/";
    let certPath = "";

    try {
        const files = fs.readdirSync(certsDir);
        const p12File = files.find(f => f.endsWith(".p12"));

        if (!p12File) {
            throw new Error("No se encontró archivo .p12 en la carpeta certs/");
        }

        certPath = certsDir + p12File;
    } catch (error) {
        throw new Error("Error al buscar certificado: " + (error as Error).message);
    }

    // Extraer información del certificado
    try {
        const p12Buffer = fs.readFileSync(certPath);
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);

        let certificate: forge.pki.Certificate | null = null;

        for (const safeContent of p12.safeContents) {
            for (const safeBag of safeContent.safeBags) {
                if (safeBag.cert) {
                    certificate = safeBag.cert;
                    break;
                }
            }
            if (certificate) break;
        }

        if (!certificate) {
            throw new Error("No se encontró certificado en el archivo .p12");
        }

        // Extraer CN (Common Name) del subject
        const cnAttr = certificate.subject.attributes.find(a => a.shortName === "CN");
        const razonSocial = cnAttr?.value?.toString() || "EMPRESA";

        // Extraer número de identificación (puede estar en serialNumber o en otro campo)
        const serialAttr = certificate.subject.attributes.find(a => a.name === "serialNumber");
        let ruc = "";

        if (serialAttr && serialAttr.value) {
            // Extraer solo los números del serial (ej: "1726804329-091224083748" -> "1726804329001")
            const serialStr = serialAttr.value.toString();
            const numbers = serialStr.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                // El primer grupo de números es la cédula/RUC
                ruc = numbers[0];
                // Si tiene 10 dígitos, agregar "001" para convertir a RUC
                if (ruc.length === 10) {
                    ruc = ruc + "001";
                }
            }
        }

        // Si no se pudo extraer el RUC, intentar desde el CN
        if (!ruc && razonSocial) {
            const rucMatch = razonSocial.match(/\d{10,13}/);
            if (rucMatch) {
                ruc = rucMatch[0];
                if (ruc.length === 10) {
                    ruc = ruc + "001";
                }
            }
        }

        return {
            certPath,
            razonSocial: razonSocial || "EMPRESA",
            ruc: ruc || "9999999999001" // Fallback
        };
    } catch (error) {
        throw new Error("Error al leer certificado: " + (error as Error).message);
    }
}

// Extraer información automáticamente
const certInfo = extractCertInfo();

export const EMPRESA_CONFIG = {
    // Datos del certificado
    certificado: {
        path: certInfo.certPath,
        password: process.env.CERT_PASSWORD || "",
    },

    // Datos tributarios (extraídos del certificado)
    tributaria: {
        ruc: certInfo.ruc,
        razonSocial: certInfo.razonSocial,
        nombreComercial: certInfo.razonSocial, // Usar la razón social como nombre comercial
        dirMatriz: process.env.DIR_MATRIZ || "QUITO - PICHINCHA - ECUADOR",

        // Establecimiento
        estab: process.env.ESTAB || "001",
        ptoEmi: process.env.PTO_EMI || "001",
    },

    // Obligaciones tributarias
    obligaciones: {
        obligadoContabilidad: (process.env.OBLIGADO_CONTABILIDAD || "NO") as "SI" | "NO",
        contribuyenteEspecial: process.env.CONTRIBUYENTE_ESPECIAL,
    }
};

// Función para validar que la configuración esté completa
export function validateEmpresaConfig(): string[] {
    const errors: string[] = [];

    if (!EMPRESA_CONFIG.certificado.password) {
        errors.push("⚠️  Password del certificado no configurado. Define CERT_PASSWORD en .env");
    }

    if (EMPRESA_CONFIG.tributaria.ruc.length !== 13) {
        errors.push("❌ El RUC debe tener exactamente 13 dígitos");
    }

    if (!EMPRESA_CONFIG.tributaria.razonSocial) {
        errors.push("❌ La razón social no puede estar vacía");
    }

    if (!EMPRESA_CONFIG.tributaria.dirMatriz) {
        errors.push("❌ La dirección matriz no puede estar vacía");
    }

    return errors;
}
