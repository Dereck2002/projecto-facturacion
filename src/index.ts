import * as dotenv from "dotenv";
dotenv.config();

import { generarClaveAcceso } from "./core/accessKey";
import { buildFacturaXML } from "./core/xmlBuilder";
import { Factura } from "./core/invoice.model";
import { GuiaRemision } from "./core/guiaRemision.model";
import { buildGuiaRemisionXML } from "./core/xmlBuilderGuia";
import { signXML } from "./core/signer";
import { enviarComprobanteRecepcion } from "./services/sri-recepcion";
import { consultarAutorizacion } from "./services/sri-autorizacion";
import { validateFacturaXML, validateFieldLengths } from "./utils/validator";
import { EMPRESA_CONFIG, validateEmpresaConfig } from "./config/empresa";
import { SRI_CONFIG } from "./config/sri";
import { generarRIDE } from "./core/ride";
import { generarRideGuia } from "./core/rideGuia";
import * as fs from "fs";

// Función para generar una Factura
async function generateInvoice() {
    console.log("🚀 Iniciando PoC Facturación SRI...\n");

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

    const now = new Date();
    const fechaEmision =
        String(now.getDate()).padStart(2, '0') +
        String(now.getMonth() + 1).padStart(2, '0') +
        now.getFullYear();

    const codigoNumerico = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const secuencial = (String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 9999)).padStart(4, '0')).padStart(9, '0');

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

    const xmlSinFirma = buildFacturaXML(factura);
    fs.writeFileSync("factura-sin-firma.xml", xmlSinFirma);
    console.log("✔ XML generado: factura-sin-firma.xml");

    const xmlErrors = validateFacturaXML(xmlSinFirma);
    if (xmlErrors.length > 0) {
        console.log("❌ Errores en la estructura del XML:");
        xmlErrors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
        });
        return;
    }
    console.log("✔ Estructura XML válida");

    console.log("🔐 Firmando XML con certificado digital...");
    const xmlFirmado = await signXML({
        xml: xmlSinFirma,
        p12Path: EMPRESA_CONFIG.certificado.path,
        p12Password: EMPRESA_CONFIG.certificado.password
    });
    fs.writeFileSync("factura-firmada.xml", xmlFirmado);
    console.log("✔ XML firmado: factura-firmada.xml");

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

// Función para generar una Guía de Remisión
async function generateWaybill() {
    console.log("🚀 Iniciando PoC Guía de Remisión SRI...\n");

    const configErrors = validateEmpresaConfig();
    if (configErrors.length > 0) {
        console.log("❌ Errores de configuración:", configErrors);
        return;
    }

    console.log("✔ Configuración de empresa validada");
    console.log(`  - RUC: ${EMPRESA_CONFIG.tributaria.ruc}`);
    console.log(`  - Ambiente: ${SRI_CONFIG.ambiente === "1" ? "Pruebas" : "Producción"}\n`);

    const now = new Date();
    const fechaEmision =
        String(now.getDate()).padStart(2, '0') +
        String(now.getMonth() + 1).padStart(2, '0') +
        now.getFullYear();
    const fechaEmisionStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const secuencial = (String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 9999)).padStart(4, '0')).padStart(9, '0');
    const codigoNumerico = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');

    const claveAcceso = generarClaveAcceso({
        fechaEmision,
        tipoComprobante: "06", // 06 para Guía de Remisión
        ruc: EMPRESA_CONFIG.tributaria.ruc,
        ambiente: SRI_CONFIG.ambiente,
        serie: EMPRESA_CONFIG.tributaria.estab + EMPRESA_CONFIG.tributaria.ptoEmi,
        secuencial,
        codigoNumerico,
        tipoEmision: "1"
    });

    console.log("✔ Clave de acceso:", claveAcceso);

    const guia: GuiaRemision = {
        infoTributaria: {
            ambiente: SRI_CONFIG.ambiente as "1" | "2",
            tipoEmision: "1",
            razonSocial: EMPRESA_CONFIG.tributaria.razonSocial,
            nombreComercial: EMPRESA_CONFIG.tributaria.nombreComercial,
            ruc: EMPRESA_CONFIG.tributaria.ruc,
            claveAcceso,
            codDoc: "06",
            estab: EMPRESA_CONFIG.tributaria.estab,
            ptoEmi: EMPRESA_CONFIG.tributaria.ptoEmi,
            secuencial,
            dirMatriz: EMPRESA_CONFIG.tributaria.dirMatriz
        },
        infoGuiaRemision: {
            dirEstablecimiento: EMPRESA_CONFIG.tributaria.dirMatriz,
            dirPartida: "AV. GALO PLAZA LASSO OE1-34",
            razonSocialTransportista: "TRANSPORTES SEGUROS S.A.",
            tipoIdentificacionTransportista: "04", // RUC
            rucTransportista: "1792146739001",
            obligadoContabilidad: "SI",
            fechaIniTransporte: fechaEmisionStr,
            fechaFinTransporte: fechaEmisionStr,
            placa: "ABC1234"
        },
        destinatarios: [{
            identificacionDestinatario: "9999999999",
            razonSocialDestinatario: "CLIENTE FINAL",
            dirDestinatario: "AV. AMAZONAS Y NACIONES UNIDAS",
            motivoTraslado: "Venta",
            codDocSustento: "01", // Factura que sustenta el traslado
            numDocSustento: "001-001-000000123",
            fechaEmisionDocSustento: fechaEmisionStr,
            detalles: [{
                codigoInterno: "P001",
                descripcion: "Producto de prueba para guía",
                cantidad: 2
            }]
        }],
        infoAdicional: [{
            nombre: "Email",
            valor: "test@test.com"
        }]
    };

    console.log("\n🔍 Validando datos de la guía...");
    // Aquí podrías agregar validaciones específicas para la guía
    console.log("✔ Validación OK (simulada)");

    const xmlSinFirma = buildGuiaRemisionXML(guia);
    fs.writeFileSync("guia-remision-sin-firma.xml", xmlSinFirma);
    console.log("✔ XML generado: guia-remision-sin-firma.xml");

    console.log("🔐 Firmando XML con certificado digital...");
    const xmlFirmado = await signXML({
        xml: xmlSinFirma,
        p12Path: EMPRESA_CONFIG.certificado.path,
        p12Password: EMPRESA_CONFIG.certificado.password
    });
    fs.writeFileSync("guia-remision-firmada.xml", xmlFirmado);
    console.log("✔ XML firmado: guia-remision-firmada.xml");

    console.log("\n📡 Enviando comprobante al SRI (Recepción)...");
    const recepcion = await enviarComprobanteRecepcion(xmlFirmado);
    console.log("📨 Estado Recepción:", recepcion.estado);

    if (recepcion.mensajes.length) {
        console.log("⚠ Mensajes SRI:");
        recepcion.mensajes.forEach(m => {
            console.log(`- [${m.identificador}] ${m.mensaje}`);
            if (m.informacionAdicional) console.log("  >", m.informacionAdicional);
        });
    }

    if (recepcion.estado !== "RECIBIDA") {
        console.log("\n❌ El comprobante fue DEVUELTO. Revisa el XML/Firma.");
        return;
    }

    console.log("\n📨 Consultando autorización...");
    const autorizacion = await consultarAutorizacion(claveAcceso);
    console.log("📜 Estado Autorización:", autorizacion.estado);

    if (autorizacion.mensajes.length) {
        console.log("⚠ Mensajes Autorización:");
        autorizacion.mensajes.forEach(m => {
            console.log(`- ${m.mensaje}`);
            if (m.informacionAdicional) console.log("  >", m.informacionAdicional);
        });
    }

    if (autorizacion.estado === "AUTORIZADO") {
        fs.writeFileSync(`guia-autorizada-${claveAcceso}.xml`, autorizacion.xmlAutorizado!);
        console.log("✅ GUÍA DE REMISIÓN AUTORIZADA 🎉");
        
        console.log("\n📄 Generando RIDE (PDF)...");
        const ridePath = `RIDE-GUIA-${claveAcceso}.pdf`;
        await generarRideGuia({
            guia,
            claveAcceso,
            numeroAutorizacion: autorizacion.numeroAutorizacion!,
            fechaAutorizacion: autorizacion.fechaAutorizacion!,
            outputPath: ridePath
        });
        console.log(`✅ RIDE generado: ${ridePath}`);

    } else {
        console.log("❌ Guía de Remisión NO autorizada");
    }
}

async function main() {
    const args = process.argv.slice(2); // Obtener argumentos de la línea de comandos
    const command = args[0];

    switch (command) {
        case "factura":
            await generateInvoice();
            break;
        case "guia":
            await generateWaybill();
            break;
        default:
            console.log("Uso: npm run dev -- [factura|guia]");
            console.log("Ejemplo: npm run dev -- factura");
            console.log("Ejemplo: npm run dev -- guia");
            break;
    }
}

main().catch(err => {
    console.error("💥 Error crítico:", err);
});
