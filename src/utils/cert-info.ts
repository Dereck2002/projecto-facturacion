/**
 * Script para extraer información del certificado .p12
 * NO expone la clave privada, solo metadatos
 */

import * as fs from "fs";
import * as forge from "node-forge";

interface CertInfo {
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: Date;
    validTo: Date;
    isValid: boolean;
    daysRemaining: number;
}

export function getCertificateInfo(p12Path: string, password: string): CertInfo {
    const p12Buffer = fs.readFileSync(p12Path);
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

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

    // Extraer información del subject
    const subject = certificate.subject.attributes
        .map(a => `${a.shortName}=${a.value}`)
        .join(", ");

    // Extraer información del issuer
    const issuer = certificate.issuer.attributes
        .map(a => `${a.shortName}=${a.value}`)
        .join(", ");

    // Fechas de validez
    const validFrom = certificate.validity.notBefore;
    const validTo = certificate.validity.notAfter;
    const now = new Date();
    const isValid = now >= validFrom && now <= validTo;

    // Días restantes
    const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
        subject,
        issuer,
        serialNumber: certificate.serialNumber,
        validFrom,
        validTo,
        isValid,
        daysRemaining
    };
}

// Script de prueba si se ejecuta directamente
if (require.main === module) {
    const certPath = process.argv[2];
    const password = process.argv[3];

    if (!certPath || !password) {
        console.log("Uso: ts-node src/utils/cert-info.ts <ruta-p12> <password>");
        process.exit(1);
    }

    try {
        console.log("🔍 Analizando certificado...\n");

        const info = getCertificateInfo(certPath, password);

        console.log("📜 Información del Certificado:");
        console.log("─".repeat(60));
        console.log(`Subject:         ${info.subject}`);
        console.log(`Issuer:          ${info.issuer}`);
        console.log(`Serial Number:   ${info.serialNumber}`);
        console.log(`Valid From:      ${info.validFrom.toLocaleDateString()}`);
        console.log(`Valid To:        ${info.validTo.toLocaleDateString()}`);
        console.log(`Status:          ${info.isValid ? "✅ VÁLIDO" : "❌ EXPIRADO"}`);
        console.log(`Days Remaining:  ${info.daysRemaining} días`);
        console.log("─".repeat(60));

        if (!info.isValid) {
            console.log("\n⚠️  ADVERTENCIA: El certificado ha expirado");
        } else if (info.daysRemaining < 30) {
            console.log(`\n⚠️  ADVERTENCIA: El certificado expira en ${info.daysRemaining} días`);
        } else {
            console.log("\n✅ Certificado válido y listo para usar");
        }
    } catch (error: any) {
        console.error("\n❌ Error al leer certificado:", error.message);
        process.exit(1);
    }
}
