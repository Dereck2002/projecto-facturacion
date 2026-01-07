import * as dotenv from "dotenv";
dotenv.config(); // Cargar variables de entorno desde .env

import { generarClaveAcceso } from "./core/accessKey";
import { buildFacturaXML } from "./core/xmlBuilder";
import { Factura } from "./core/invoice.model";
import { signXML } from "./core/signer";
import { enviarComprobanteRecepcion } from "./services/sri-recepcion";
import { consultarAutorizacion } from "./services/sri-autorizacion";
import { validateFacturaXML, validateFieldLengths } from "./utils/validator";
import { EMPRESA_CONFIG, validateEmpresaConfig } from "./config/empresa";
import { SRI_CONFIG } from "./config/sri";
import { generarRIDE } from "./core/ride";
import * as fs from "fs";

async function main() {
    console.log("🚀 Iniciando PoC Facturación SRI...\n");

    /* ===========================
     * 0. VALIDACIÓN DE CONFIGURACIÓN
     * =========================== */
    const configErrors = validateEmpresaConfig();
    if (configErrors.length > 0) {
        console.log("❌ Errores de configuración:");
        configErrors.forEach(err => console.log(`  ${err}`));
        console.log("\n💡 Tip: Crea un archivo .env con CERT_PASSWORD=tu_password");
        return;
    }

    console.log("✔ Configuración de empresa validada");
    console.log(`  - RUC: ${EMPRESA_CONFIG.tributaria.ruc}`);
    console.log(`  - Razón Social: ${EMPRESA_CONFIG.tributaria.razonSocial}`);
    console.log(`  - Ambiente: ${SRI_CONFIG.ambiente === "1" ? "Pruebas" : "Producción"}\n`);

    /* ===========================
     * 1. CLAVE DE ACCESO
     * =========================== */
    // Usar fecha actual del sistema
    const now = new Date();
    const fechaEmision =
        String(now.getDate()).padStart(2, '0') +
        String(now.getMonth() + 1).padStart(2, '0') +
        now.getFullYear();

    // Código numérico aleatorio de 8 dígitos
    const codigoNumerico = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');

    // Generar secuencial único para cada prueba (basado en timestamp)
    const secuencial = String(Date.now()).slice(-9).padStart(9, '0');

    const claveAcceso = generarClaveAcceso({
        fechaEmision,
        tipoComprobante: "01",
        ruc: EMPRESA_CONFIG.tributaria.ruc,
        ambiente: SRI_CONFIG.ambiente,
        serie: EMPRESA_CONFIG.tributaria.estab + EMPRESA_CONFIG.tributaria.ptoEmi,
        secuencial,
        codigoNumerico,
        tipoEmision: "1"
    });

    console.log("✔ Clave de acceso:", claveAcceso);

    /* ===========================
     * 2. FACTURA (OBJETO)
     * =========================== */
    // Fecha de emisión en formato dd/mm/yyyy
    const fechaEmisionStr =
        String(now.getDate()).padStart(2, '0') + '/' +
        String(now.getMonth() + 1).padStart(2, '0') + '/' +
        now.getFullYear();

    const factura: Factura = {
        infoTributaria: {
            ambiente: SRI_CONFIG.ambiente as "1" | "2",
            tipoEmision: "1",
            razonSocial: EMPRESA_CONFIG.tributaria.razonSocial,
            nombreComercial: EMPRESA_CONFIG.tributaria.nombreComercial,
            ruc: EMPRESA_CONFIG.tributaria.ruc,
            claveAcceso,
            codDoc: "01",
            estab: EMPRESA_CONFIG.tributaria.estab,
            ptoEmi: EMPRESA_CONFIG.tributaria.ptoEmi,
            secuencial,
            dirMatriz: EMPRESA_CONFIG.tributaria.dirMatriz
        },
        infoFactura: {
            fechaEmision: fechaEmisionStr,
            obligadoContabilidad: EMPRESA_CONFIG.obligaciones.obligadoContabilidad,
            tipoIdentificacionComprador: "05", // Cédula
            razonSocialComprador: "CLIENTE DE PRUEBA",
            identificacionComprador: "9999999999", // Cédula de prueba
            totalSinImpuestos: 100,
            totalDescuento: 0,
            totalConImpuestos: [
                {
                    codigo: "2", // IVA
                    codigoPorcentaje: "4", // 15%
                    baseImponible: 100,
                    valor: 15
                }
            ],
            propina: 0,
            importeTotal: 115,
            moneda: "DOLAR"
        },
        detalles: [
            {
                codigoPrincipal: "P001",
                descripcion: "Producto de prueba",
                cantidad: 1,
                precioUnitario: 50,
                descuento: 0,
                precioTotalSinImpuesto: 50,
                impuestos: [
                    {
                        codigo: "2",
                        codigoPorcentaje: "4",
                        tarifa: 15,
                        baseImponible: 50,
                        valor: 15
                    }
                ]
            },
            {
                codigoPrincipal: "P002",
                descripcion: "Producto de prueba",
                cantidad: 1,
                precioUnitario: 50,
                descuento: 0,
                precioTotalSinImpuesto: 50,
                impuestos: [
                    {
                        codigo: "2",
                        codigoPorcentaje: "4",
                        tarifa: 15,
                        baseImponible: 50,
                        valor: 15
                    }
                ]
            }
        ]
    };

    /* ===========================
     * 3. VALIDACIONES PREVIAS
     * =========================== */
    console.log("\n🔍 Validando datos de la factura...");

    const fieldErrors = validateFieldLengths(factura);
    if (fieldErrors.length > 0) {
        console.log("❌ Errores de validación de campos:");
        fieldErrors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
        });
        return;
    }

    console.log("✔ Validación de campos OK");

    /* ===========================
     * 4. XML SIN FIRMA
     * =========================== */
    const xmlSinFirma = buildFacturaXML(factura);
    fs.writeFileSync("factura-sin-firma.xml", xmlSinFirma);
    console.log("✔ XML generado: factura-sin-firma.xml");

    // Validar estructura del XML
    const xmlErrors = validateFacturaXML(xmlSinFirma);
    if (xmlErrors.length > 0) {
        console.log("❌ Errores en la estructura del XML:");
        xmlErrors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
        });
        return;
    }

    console.log("✔ Estructura XML válida");

    /* ===========================
     * 5. XML FIRMADO
     * =========================== */
    console.log("🔐 Firmando XML con certificado digital...");

    const xmlFirmado = await signXML({
        xml: xmlSinFirma,
        p12Path: EMPRESA_CONFIG.certificado.path,
        p12Password: EMPRESA_CONFIG.certificado.password
    });

    fs.writeFileSync("factura-firmada.xml", xmlFirmado);
    console.log("✔ XML firmado: factura-firmada.xml");

    /* ===========================
     * 6. ENVÍO A RECEPCIÓN
     * =========================== */
    console.log("\n📡 Enviando comprobante al SRI (Recepción)...");

    const recepcion = await enviarComprobanteRecepcion(xmlFirmado);

    console.log("📨 Estado Recepción:", recepcion.estado);

    if (recepcion.mensajes.length) {
        console.log("⚠ Mensajes SRI:");
        recepcion.mensajes.forEach(m => {
            console.log(`- [${m.identificador}] ${m.mensaje}`);
            if (m.informacionAdicional) {
                console.log("  >", m.informacionAdicional);
            }
        });
    }

    if (recepcion.estado !== "RECIBIDA") {
        console.log("\n❌ El comprobante fue DEVUELTO. Revisa el XML/Firma.");
        return;
    }

    /* ===========================
     * 7. AUTORIZACIÓN
     * =========================== */
    console.log("\n📨 Consultando autorización...");

    const autorizacion = await consultarAutorizacion(claveAcceso);

    console.log("📜 Estado Autorización:", autorizacion.estado);

    if (autorizacion.mensajes.length) {
        console.log("⚠ Mensajes Autorización:");
        autorizacion.mensajes.forEach(m => {
            console.log(`- ${m.mensaje}`);
            if (m.informacionAdicional) {
                console.log("  >", m.informacionAdicional);
            }
        });
    }

    if (autorizacion.estado === "AUTORIZADO") {
        fs.writeFileSync(
            `factura-autorizada-${claveAcceso}.xml`,
            autorizacion.xmlAutorizado!
        );
        console.log("✅ FACTURA AUTORIZADA 🎉");

        /* ===========================
         * 8. GENERAR RIDE (PDF)
         * =========================== */
        console.log("\n📄 Generando RIDE (PDF)...");

        const ridePath = `RIDE-${claveAcceso}.pdf`;
        await generarRIDE({
            factura,
            claveAcceso,
            numeroAutorizacion: autorizacion.numeroAutorizacion!,
            fechaAutorizacion: autorizacion.fechaAutorizacion!,
            outputPath: ridePath
        });

        console.log(`✅ RIDE generado: ${ridePath}`);
    } else {
        console.log("❌ Factura NO autorizada");
    }
}

main().catch(err => {
    console.error("💥 Error crítico:", err);
});
