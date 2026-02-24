import PDFDocument from "pdfkit";
import * as bwipjs from "bwip-js";
import * as fs from "fs";
import { Factura } from "./invoice.model";

interface RideParams {
    factura: Factura;
    claveAcceso: string;
    numeroAutorizacion: string;
    fechaAutorizacion: string;
    outputPath: string;
    logoUrl?: string;
}

export async function generarRIDE(params: RideParams): Promise<void> {
    const { factura, claveAcceso, numeroAutorizacion, fechaAutorizacion, outputPath, logoUrl } = params;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 30 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        const leftMargin = 30;
        const pageWidth = 595.28;
        const contentWidth = pageWidth - 60;
        const colWidth = (contentWidth / 2) - 5;

        // --- LOGO ---
        // Nota: En este ejemplo asumimos que no hay logo o es un path local.
        // Si logoUrl es una URL remota, necesitarías fetch/axios para obtener el buffer.
        let logoDrawn = false;
        if (logoUrl && fs.existsSync(logoUrl)) {
            try {
                doc.image(logoUrl, leftMargin, 35, {
                    width: colWidth,
                    height: 100,
                    fit: [colWidth, 100],
                    align: 'center',
                    valign: 'center'
                });
                logoDrawn = true;
            } catch (error) {
                console.error("Error cargando logo:", error);
            }
        }

        if (!logoDrawn) {
            // Placeholder si no hay logo
            doc.fillColor("black").fontSize(14).font("Helvetica-Bold")
                .text(factura.infoTributaria.nombreComercial || "SIN LOGO", leftMargin, 35, { width: colWidth, align: 'center' });
        }

        // --- BLOQUE SUPERIOR IZQUIERDO (Emisor) ---
        const emisorY = 145;
        const emisorHeight = 150;
        doc.lineWidth(0.7).strokeColor("black")
            .roundedRect(leftMargin, emisorY, colWidth, emisorHeight, 8).stroke();

        doc.fillColor("black").fontSize(9).font("Helvetica-Bold");
        let yEmisor = emisorY + 15;
        doc.text(factura.infoTributaria.razonSocial.toUpperCase(), leftMargin + 15, yEmisor, { width: colWidth - 30 });

        yEmisor += 35; // Ajuste para dar espacio si la razón social es larga
        doc.text(factura.infoTributaria.nombreComercial || factura.infoTributaria.razonSocial, leftMargin + 15, yEmisor, { width: colWidth - 30 });

        doc.fontSize(8).font("Helvetica");
        yEmisor += 25;
        doc.text("Dirección Matriz:", leftMargin + 15, yEmisor);
        doc.text(factura.infoTributaria.dirMatriz, leftMargin + 85, yEmisor, { width: colWidth - 105 });

        yEmisor += 25;
        doc.text("Dirección Sucursal:", leftMargin + 15, yEmisor);
        doc.text(factura.infoTributaria.dirMatriz, leftMargin + 85, yEmisor, { width: colWidth - 105 }); // Usamos dirMatriz si no hay dirEstablecimiento específico en infoTributaria

        yEmisor += 35;
        doc.font("Helvetica-Bold").text("OBLIGADO A LLEVAR CONTABILIDAD", leftMargin + 15, yEmisor);
        doc.font("Helvetica").text(factura.infoFactura.obligadoContabilidad || "NO", leftMargin + colWidth - 30, yEmisor);

        // --- BLOQUE SUPERIOR DERECHO (Datos Factura) ---
        const rightBoxX = leftMargin + colWidth + 10;
        const rightBoxY = 25;
        doc.roundedRect(rightBoxX, rightBoxY, colWidth, 270, 8).stroke();

        let yFact = rightBoxY + 12;
        doc.fontSize(10).font("Helvetica").text("R.U.C.:", rightBoxX + 12, yFact);
        doc.fontSize(11).font("Helvetica-Bold").text(factura.infoTributaria.ruc, rightBoxX + 65, yFact);

        yFact += 22;
        doc.fontSize(14).font("Helvetica-Bold").text("FACTURA", rightBoxX + 12, yFact);

        yFact += 25;
        doc.fontSize(9).font("Helvetica").text(`No. ${factura.infoTributaria.estab}-${factura.infoTributaria.ptoEmi}-${factura.infoTributaria.secuencial}`, rightBoxX + 12, yFact);

        yFact += 20;
        doc.fontSize(8).text("NÚMERO DE AUTORIZACIÓN", rightBoxX + 12, yFact);
        doc.fontSize(7).text(numeroAutorizacion || claveAcceso, rightBoxX + 12, yFact + 12, { width: colWidth - 20 });

        yFact += 35;
        doc.fontSize(8).text("FECHA Y HORA DE AUTORIZACIÓN:", rightBoxX + 12, yFact);
        doc.text(fechaAutorizacion, rightBoxX + 12, yFact + 12);

        yFact += 30;
        doc.text("AMBIENTE:", rightBoxX + 12, yFact);
        doc.text(factura.infoTributaria.ambiente === "1" ? "PRUEBAS" : "PRODUCCIÓN", rightBoxX + 80, yFact);

        yFact += 15;
        doc.text("EMISIÓN:", rightBoxX + 12, yFact);
        doc.text("NORMAL", rightBoxX + 80, yFact);

        yFact += 25;
        doc.font("Helvetica-Bold").text("CLAVE DE ACCESO", rightBoxX + 12, yFact);

        // Generar código de barras
        bwipjs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: claveAcceso,    // Text to encode
            scale: 2,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: false,    // Show human-readable text
            textxalign: 'center',  // Always good to set this
        }, function (err, png) {
            if (err) {
                console.error("Error generando código de barras:", err);
            } else {
                doc.image(png, rightBoxX + 10, yFact + 12, { width: colWidth - 20, height: 35 });
            }
            
            // Continuar dibujando después del callback del código de barras
            // (Aunque en este flujo síncrono de PDFKit, es mejor esperar o dibujar esto al final si fuera async puro, 
            // pero bwipjs.toBuffer con callback funciona bien aquí antes de cerrar el doc)
            
            doc.fontSize(7).font("Helvetica").text(claveAcceso, rightBoxX + 10, yFact + 50, { width: colWidth - 20, align: 'center' });

            // ===============================
            // DATOS DEL COMPRADOR (CLIENTE)
            // ===============================
            const clientY = 310;
            const clientBoxHeight = 85;
            doc.lineWidth(0.7).strokeColor("black");
            // doc.rect(leftMargin, clientY, contentWidth, clientBoxHeight).stroke(); // Borde opcional

            let yCl = clientY + 12;
            const col1X = leftMargin + 8;
            const col3X = leftMargin + 310; // Columna para Placa/Guía

            doc.fontSize(8);

            // Fila 1: Razón Social (Etiqueta y Valor)
            doc.font("Helvetica-Bold").text("Razón Social / Nombres y Apellidos:", col1X, yCl);
            doc.font("Helvetica").text(factura.infoFactura.razonSocialComprador.toUpperCase(), col1X + 160, yCl);
            
            // Identificación (misma línea o siguiente)
            doc.font("Helvetica-Bold").text("Identificación:", col3X, yCl);
            doc.font("Helvetica").text(factura.infoFactura.identificacionComprador, col3X + 60, yCl);
            
            yCl += 18;

            // Fila 2: Fecha Emisión
            doc.font("Helvetica-Bold").text("Fecha Emisión:", col1X, yCl);
            doc.font("Helvetica").text(factura.infoFactura.fechaEmision, col1X + 160, yCl);

            // Guía de Remisión
            if (factura.infoFactura.guiaRemision) {
                doc.font("Helvetica-Bold").text("Guía Remisión:", col3X, yCl);
                doc.font("Helvetica").text(factura.infoFactura.guiaRemision, col3X + 60, yCl);
            }
            yCl += 18;

            // Fila 3: Dirección
            doc.font("Helvetica-Bold").text("Dirección:", col1X, yCl);
            doc.font("Helvetica").text(factura.infoFactura.direccionComprador || "S/N", col1X + 160, yCl);

            // --- TABLA DE DETALLES ---
            let tableY = 400;
            const colW = [50, 40, 230, 50, 50, 50, 60]; // Ajustado para que sume aprox contentWidth (535)
            // Total width = 50+40+230+50+50+50+60 = 530
            const headers = ["Cod. Principal", "Cant", "Descripción", "P. Unitario", "Descuento", "Precio Total"];
            // Ajuste manual de posiciones X
            const colX = [
                leftMargin, 
                leftMargin + 50, 
                leftMargin + 90, 
                leftMargin + 320, 
                leftMargin + 370, 
                leftMargin + 420
            ];

            const headerHeight = 20;
            doc.lineWidth(0.7).rect(leftMargin, tableY, contentWidth, headerHeight).stroke();

            let curX = leftMargin;
            doc.font("Helvetica-Bold").fontSize(7);

            // Dibujar headers
            doc.text("Cod. Principal", colX[0], tableY + 6, { width: colW[0], align: 'center' });
            doc.text("Cant", colX[1], tableY + 6, { width: colW[1], align: 'center' });
            doc.text("Descripción", colX[2], tableY + 6, { width: colW[2], align: 'center' });
            doc.text("P. Unitario", colX[3], tableY + 6, { width: colW[3], align: 'center' });
            doc.text("Descuento", colX[4], tableY + 6, { width: colW[4], align: 'center' });
            doc.text("Precio Total", colX[5], tableY + 6, { width: colW[5], align: 'center' });

            // Líneas verticales headers
            // doc.moveTo(colX[1], tableY).lineTo(colX[1], tableY + headerHeight).stroke();
            // ... (puedes agregar líneas verticales si quieres estilo rejilla completa)

            tableY += headerHeight;
            doc.font("Helvetica").fontSize(7);

            // Filas de Datos
            factura.detalles.forEach(det => {
                const rowHeight = 20; // Altura fija simple por ahora

                // Verificar nueva página
                if (tableY + rowHeight > 750) {
                    doc.addPage();
                    tableY = 30;
                }

                doc.rect(leftMargin, tableY, contentWidth, rowHeight).stroke();

                doc.text(det.codigoPrincipal, colX[0], tableY + 6, { width: colW[0], align: 'center' });
                doc.text(det.cantidad.toFixed(2), colX[1], tableY + 6, { width: colW[1], align: 'center' });
                doc.text(det.descripcion, colX[2] + 5, tableY + 6, { width: colW[2] - 10, align: 'left' });
                doc.text(det.precioUnitario.toFixed(2), colX[3], tableY + 6, { width: colW[3], align: 'right' });
                doc.text(det.descuento.toFixed(2), colX[4], tableY + 6, { width: colW[4], align: 'right' });
                doc.text(det.precioTotalSinImpuesto.toFixed(2), colX[5], tableY + 6, { width: colW[5] - 5, align: 'right' });

                tableY += rowHeight;
            });

            // --- SECCIÓN INFERIOR: INFO ADICIONAL Y TOTALES ---
            const bottomY = tableY + 15;
            
            // Info Adicional
            const infoAdjWidth = 300;
            const infoAdjHeight = 100;
            
            doc.rect(leftMargin, bottomY, infoAdjWidth, infoAdjHeight).stroke();
            doc.font("Helvetica-Bold").fontSize(8).text("Información Adicional", leftMargin + 5, bottomY + 5);
            
            let infoY = bottomY + 20;
            doc.font("Helvetica").fontSize(7);
            if (factura.infoAdicional) {
                factura.infoAdicional.forEach(item => {
                    doc.text(`${item.nombre}: ${item.valor}`, leftMargin + 5, infoY);
                    infoY += 12;
                });
            }

            // Totales
            const totalsX = leftMargin + infoAdjWidth + 10;
            const totalsWidth = contentWidth - infoAdjWidth - 10;
            let totalsY = bottomY;
            const rowH = 15;

            const addTotalRow = (label: string, value: number) => {
                doc.rect(totalsX, totalsY, totalsWidth, rowH).stroke();
                doc.font("Helvetica-Bold").text(label, totalsX + 5, totalsY + 4);
                doc.font("Helvetica").text(value.toFixed(2), totalsX, totalsY + 4, { width: totalsWidth - 5, align: 'right' });
                totalsY += rowH;
            };

            // Cálculos simples para el ejemplo
            const subtotal15 = factura.infoFactura.totalConImpuestos.find(t => t.codigoPorcentaje === "4")?.baseImponible || 0;
            const subtotal0 = factura.infoFactura.totalConImpuestos.find(t => t.codigoPorcentaje === "0")?.baseImponible || 0;
            const iva15 = factura.infoFactura.totalConImpuestos.find(t => t.codigoPorcentaje === "4")?.valor || 0;
            
            addTotalRow("SUBTOTAL 15%", subtotal15);
            addTotalRow("SUBTOTAL 0%", subtotal0);
            addTotalRow("SUBTOTAL SIN IMPUESTOS", factura.infoFactura.totalSinImpuestos);
            addTotalRow("DESCUENTO", factura.infoFactura.totalDescuento);
            addTotalRow("IVA 15%", iva15);
            addTotalRow("PROPINA", factura.infoFactura.propina);
            addTotalRow("VALOR TOTAL", factura.infoFactura.importeTotal);

            // Finalizar PDF
            doc.end();
        });

        stream.on("finish", () => {
            resolve();
        });

        stream.on("error", (err) => {
            reject(err);
        });
    });
}
