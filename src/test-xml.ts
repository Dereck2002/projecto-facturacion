/**
 * Script de prueba: Genera y valida XML sin enviar al SRI
 */

import { generarClaveAcceso } from "./core/accessKey";
import { buildFacturaXML } from "./core/xmlBuilder";
import { Factura } from "./core/invoice.model";
import { validateFacturaXML, validateFieldLengths } from "./utils/validator";
import * as fs from "fs";

async function testXMLGeneration() {
    console.log("🧪 Test de Generación XML (sin envío al SRI)\n");

    /* ===========================
     * 1. CLAVE DE ACCESO
     * =========================== */
    const claveAcceso = generarClaveAcceso({
        fechaEmision: "06012026",
        tipoComprobante: "01",
        ruc: "0999999999001",
        ambiente: "1",
        serie: "001001",
        secuencial: "000000001",
        codigoNumerico: "12345678",
        tipoEmision: "1"
    });

    console.log("✔ Clave de acceso:", claveAcceso);

    /* ===========================
     * 2. FACTURA DE PRUEBA
     * =========================== */
    const factura: Factura = {
        infoTributaria: {
            ambiente: "1",
            tipoEmision: "1",
            razonSocial: "EMPRESA DE PRUEBAS S.A.",
            nombreComercial: "EMPRESA PRUEBAS",
            ruc: "0999999999001",
            claveAcceso,
            codDoc: "01",
            estab: "001",
            ptoEmi: "001",
            secuencial: "000000001",
            dirMatriz: "AV. PRINCIPAL 123"
        },
        infoFactura: {
            fechaEmision: "06/01/2026",
            obligadoContabilidad: "SI",
            tipoIdentificacionComprador: "05",
            razonSocialComprador: "Juan Pérez",
            identificacionComprador: "0102030405",
            totalSinImpuestos: 100,
            totalDescuento: 0,
            totalConImpuestos: [
                {
                    codigo: "2",
                    codigoPorcentaje: "2",
                    baseImponible: 100,
                    valor: 12
                }
            ],
            propina: 0,
            importeTotal: 112,
            moneda: "DOLAR"
        },
        detalles: [
            {
                codigoPrincipal: "P001",
                descripcion: "Producto de prueba",
                cantidad: 1,
                precioUnitario: 100,
                descuento: 0,
                precioTotalSinImpuesto: 100,
                impuestos: [
                    {
                        codigo: "2",
                        codigoPorcentaje: "2",
                        tarifa: 12,
                        baseImponible: 100,
                        valor: 12
                    }
                ]
            }
        ]
    };

    /* ===========================
     * 3. VALIDACIONES
     * =========================== */
    console.log("\n🔍 Validando estructura de datos...");

    const fieldErrors = validateFieldLengths(factura);
    if (fieldErrors.length > 0) {
        console.log("❌ Errores en campos:");
        fieldErrors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
        });
        return;
    }

    console.log("✔ Validación de campos OK");

    /* ===========================
     * 4. GENERACIÓN XML
     * =========================== */
    console.log("\n🔨 Generando XML...");

    const xmlSinFirma = buildFacturaXML(factura);
    const filename = "factura-test.xml";
    fs.writeFileSync(filename, xmlSinFirma);

    console.log(`✔ XML generado: ${filename}`);

    /* ===========================
     * 5. VALIDACIÓN XML
     * =========================== */
    console.log("\n🔎 Validando estructura del XML...");

    const xmlErrors = validateFacturaXML(xmlSinFirma);
    if (xmlErrors.length > 0) {
        console.log("❌ Errores en XML:");
        xmlErrors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
        });
        return;
    }

    console.log("✔ Estructura XML válida");

    /* ===========================
     * 6. ANÁLISIS DEL XML
     * =========================== */
    console.log("\n📊 Análisis del XML generado:");

    const lines = xmlSinFirma.split("\n").length;
    const size = Buffer.from(xmlSinFirma).length;

    console.log(`  - Líneas: ${lines}`);
    console.log(`  - Tamaño: ${size} bytes`);
    console.log(`  - Versión: ${xmlSinFirma.match(/version="([^"]+)"/)?.[1] || "N/A"}`);
    console.log(`  - Encoding: ${xmlSinFirma.match(/encoding="([^"]+)"/)?.[1] || "N/A"}`);

    /* ===========================
     * 7. VISTA PREVIA
     * =========================== */
    console.log("\n📄 Vista previa del XML (primeras líneas):");
    console.log("─".repeat(60));

    const preview = xmlSinFirma.split("\n").slice(0, 20).join("\n");
    console.log(preview);

    if (lines > 20) {
        console.log("...");
        console.log(`(${lines - 20} líneas más)`);
    }

    console.log("─".repeat(60));

    /* ===========================
     * 8. RESUMEN
     * =========================== */
    console.log("\n✅ Test completado exitosamente");
    console.log(`\nPara firmar este XML, ejecuta:`);
    console.log(`  npm run dev`);
    console.log(`\nPara ver el XML completo:`);
    console.log(`  cat ${filename}`);
}

testXMLGeneration().catch(err => {
    console.error("💥 Error en el test:", err);
    process.exit(1);
});
