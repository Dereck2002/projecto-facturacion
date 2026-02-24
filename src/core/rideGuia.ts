import PDFDocument from "pdfkit";
import * as bwipjs from "bwip-js";
import * as fs from "fs";
import { GuiaRemision } from "./guiaRemision.model";

interface RideGuiaParams {
    guia: GuiaRemision;
    claveAcceso: string;
    numeroAutorizacion: string;
    fechaAutorizacion: string;
    outputPath: string;
    logoUrl?: string;
}

export async function generarRideGuia(params: RideGuiaParams): Promise<void> {
    const { guia, claveAcceso, numeroAutorizacion, fechaAutorizacion, outputPath, logoUrl } = params;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 30 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        const leftMargin = 30;
        const pageWidth = 595.28;
        const contentWidth = pageWidth - 60;
        const colWidth = (contentWidth / 2) - 5;

        // --- BLOQUE IZQUIERDO: LOGO Y EMISOR ---
        if (logoUrl && fs.existsSync(logoUrl)) {
            doc.image(logoUrl, leftMargin, 30, { width: 150 });
        }

        const emisorY = 150;
        doc.roundedRect(leftMargin, emisorY, colWidth, 180, 10).stroke();

        let yE = emisorY + 15;
        doc.font("Helvetica-Bold").fontSize(9).text(guia.infoTributaria.razonSocial.toUpperCase(), leftMargin + 10, yE, { width: colWidth - 20 });

        doc.font("Helvetica").fontSize(8);
        yE += 45;
        doc.text("Dirección Matriz:", leftMargin + 10, yE);
        doc.text(guia.infoTributaria.dirMatriz, leftMargin + 85, yE, { width: colWidth - 100 });

        yE += 30;
        doc.text("Dirección Sucursal:", leftMargin + 10, yE);
        doc.text(guia.infoGuiaRemision.dirEstablecimiento || guia.infoTributaria.dirMatriz, leftMargin + 85, yE, { width: colWidth - 100 });

        yE += 40;
        doc.font("Helvetica-Bold").text("OBLIGADO A LLEVAR CONTABILIDAD", leftMargin + 10, yE);
        doc.font("Helvetica").text(guia.infoGuiaRemision.obligadoContabilidad || "NO", leftMargin + 200, yE);

        // --- BLOQUE DERECHO: DATOS FISCALES ---
        const rightX = leftMargin + colWidth + 10;
        const boxWidth = colWidth;
        doc.roundedRect(rightX, 30, boxWidth, 300, 10).stroke();

// RUC y Título
        doc.fontSize(12).font("Helvetica").text(`R.U.C.:`, rightX + 15, 45);
        doc.fontSize(12).font("Helvetica-Bold").text(guia.infoTributaria.ruc, rightX + 70, 45);

        doc.fontSize(14).font("Helvetica-Bold").text("G U I A   D E   R E M I S I Ó N", rightX + 15, 70);

        doc.fontSize(10).font("Helvetica").text(`No.    ${guia.infoTributaria.estab}-${guia.infoTributaria.ptoEmi}-${guia.infoTributaria.secuencial}`, rightX + 15, 95);

// Número de Autorización
        doc.fontSize(8).font("Helvetica").text("NÚMERO DE AUTORIZACIÓN", rightX + 15, 120);
        doc.fontSize(8).text(numeroAutorizacion, rightX + 15, 132, {
            width: boxWidth - 30,
            lineGap: 2
        });

// --- DIVISIÓN DE FECHA Y HORA EN 2 LÍNEAS ---
        let currentRightY = 165;
        doc.fontSize(8).font("Helvetica");
        doc.text("FECHA Y HORA DE", rightX + 15, currentRightY);
        doc.text("AUTORIZACIÓN:", rightX + 15, currentRightY + 10); // Segunda línea justo abajo

// El valor de la fecha lo alineamos con la segunda línea del título
        doc.font("Helvetica").text(fechaAutorizacion, rightX + 100, currentRightY + 10);

// --- AMBIENTE Y EMISIÓN ---
        currentRightY += 35; // Bajamos un poco más para dar respiro
        doc.text("AMBIENTE:", rightX + 15, currentRightY);
        doc.font("Helvetica-Bold").text(guia.infoTributaria.ambiente === "2" ? "PRODUCCIÓN" : "PRUEBAS", rightX + 100, currentRightY);

        currentRightY += 15;
        doc.font("Helvetica").text("EMISIÓN:", rightX + 15, currentRightY);
        doc.font("Helvetica-Bold").text("NORMAL", rightX + 100, currentRightY);

        currentRightY += 25;
        doc.font("Helvetica-Bold").text("CLAVE DE ACCESO", rightX + 15, currentRightY);

// Código de barras (se mantiene igual, usando el nuevo currentRightY)
        bwipjs.toBuffer({ bcid: 'code128', text: claveAcceso, scale: 2, height: 12, includetext: false }, (err, png) => {
            if (!err) {
                doc.image(png, rightX + 10, currentRightY + 12, { width: boxWidth - 20, height: 35 });
                doc.fontSize(7).font("Helvetica").text(claveAcceso, rightX + 10, currentRightY + 50, {
                    width: boxWidth - 20,
                    align: 'center'
                });
            }


            // --- TABLA 1: DATOS TRANSPORTISTA ---
            const transY = 345;
            const transHeight = 80;

            doc.rect(leftMargin, transY, contentWidth, transHeight).stroke();

            doc.fontSize(8).font("Helvetica");

// Línea 1
            doc.text("Identificación (Transportista):", leftMargin + 8, transY + 10);
            doc.text(guia.infoGuiaRemision.rucTransportista, leftMargin + 210, transY + 10);

// Línea 2
            doc.text("Razón Social / Nombres y Apellidos:", leftMargin + 8, transY + 25);
            doc.text(
                guia.infoGuiaRemision.razonSocialTransportista.toUpperCase(),
                leftMargin + 210,
                transY + 25
            );

// Línea 3
            doc.text("Placa:", leftMargin + 8, transY + 40);
            doc.text(guia.infoGuiaRemision.placa, leftMargin + 210, transY + 40);

// Línea 4
            doc.text("Punto de Partida:", leftMargin + 8, transY + 55);
            doc.text(guia.infoGuiaRemision.dirPartida, leftMargin + 210, transY + 55);

// Línea 5 (Fechas en la misma fila)
            doc.text("Fecha Inicio:", leftMargin + 8, transY + 70);
            doc.text(guia.infoGuiaRemision.fechaIniTransporte, leftMargin + 95, transY + 70);

            doc.text("Fecha Fin Transporte:", leftMargin + 260, transY + 70);
            doc.text(guia.infoGuiaRemision.fechaFinTransporte, leftMargin + 380, transY + 70);

            // --- SECCIÓN DESTINATARIOS ---
            let currentY = transY + transHeight + 10;

            guia.destinatarios.forEach((dest) => {
                const colW = [60, 170, 110, 90, 90];
                const totalTableWidth = colW.reduce((a, b) => a + b, 0); // 520 pts

                // Calculamos el margen para centrar la tabla (aprox 7.64 pts)
                const tableCenterX = leftMargin + (contentWidth - totalTableWidth) / 2;

                const headerHeight = 18;

                // 1. Cálculo de alturas dinámicas para los productos
                const detallesConAltura = dest.detalles.map(det => {
                    const h = Math.max(22, doc.heightOfString(det.descripcion, { width: colW[1] - 4 }) + 10);
                    return { ...det, rowHeight: h };
                });

                const tableContentHeight = detallesConAltura.reduce((acc, curr) => acc + curr.rowHeight, 0);
                const totalTableHeight = headerHeight + tableContentHeight;

                const infoHeight = 160;
                const boxHeight = infoHeight + totalTableHeight + 10;

                // Salto de página preventivo
                if (currentY + boxHeight > 780) {
                    doc.addPage();
                    currentY = 30;
                }

                // 🔲 RECTÁNGULO ÚNICO (Contenedor principal)
                doc.rect(leftMargin, currentY, contentWidth, boxHeight).stroke();

                let dY = currentY + 10;
                doc.font("Helvetica").fontSize(8);

                // ----- DATOS TEXTUALES (Se mantienen alineados al margen izquierdo del box) -----
                doc.text("Comprobante de Venta:", leftMargin + 8, dY);
                doc.text(dest.numDocSustento || "", leftMargin + 150, dY);
                doc.text("Fecha de Emisión:", leftMargin + 320, dY);
                doc.text(dest.fechaEmisionDocSustento || "", leftMargin + 420, dY);

                dY += 15;
                doc.text("Número de Autorización:", leftMargin + 8, dY);
                doc.text(dest.numAutDocSustento || "", leftMargin + 150, dY, { width: 380 });

                dY += 20;
                doc.text("Motivo Traslado:", leftMargin + 8, dY);
                doc.text(dest.motivoTraslado.toUpperCase(), leftMargin + 150, dY, { width: 380 });

                dY += 15;
                doc.text("Destino(Punto de llegada):", leftMargin + 8, dY);
                doc.text(dest.dirDestinatario, leftMargin + 150, dY, { width: 380 });

                dY += 15;
                doc.text("Identificación (Destinatario):", leftMargin + 8, dY);
                doc.text(dest.identificacionDestinatario, leftMargin + 150, dY);

                dY += 15;
                doc.text("Razón Social/Nombres Apellidos:", leftMargin + 8, dY);
                doc.text(dest.razonSocialDestinatario.toUpperCase(), leftMargin + 150, dY, { width: 380 });

                dY += 15;
                doc.text("Documento Aduanero:", leftMargin + 8, dY);
                doc.text("Código Establecimiento Destino:", leftMargin + 8, dY + 12);
                doc.text("Ruta:", leftMargin + 8, dY + 24);

                // ----- TABLA PRODUCTOS (CENTRADA) -----
                let tableY = currentY + infoHeight;

                const headers = ["Cantidad", "Descripción", "Detalle Adicional", "Código Principal", "Código Auxiliar"];

                // Cabecera de tabla
                doc.font("Helvetica-Bold").fontSize(7);
                let colX = tableCenterX; // Iniciamos en la posición centrada
                headers.forEach((h, i) => {
                    doc.rect(colX, tableY, colW[i], headerHeight).stroke();
                    doc.text(h, colX, tableY + 5, { width: colW[i], align: "center" });
                    colX += colW[i];
                });

                tableY += headerHeight;

                // Filas de productos
                doc.font("Helvetica").fontSize(7);
                detallesConAltura.forEach(det => {
                    let colXRow = tableCenterX; // Iniciamos cada fila en la posición centrada
                    const rowData = [
                        det.cantidad.toFixed(2),
                        det.descripcion,
                        "",
                        det.codigoInterno,
                        det.codigoAdicional || ""
                    ];

                    rowData.forEach((data, i) => {
                        doc.rect(colXRow, tableY, colW[i], det.rowHeight).stroke();

                        const textPadding = (det.rowHeight / 2) - 4;

                        doc.text(data, colXRow + 2, tableY + textPadding, {
                            width: colW[i] - 4,
                            align: i === 1 ? "left" : "center"
                        });
                        colXRow += colW[i];
                    });
                    tableY += det.rowHeight;
                });

                currentY += boxHeight + 10;
            });

            // --- INFORMACIÓN ADICIONAL ---
            currentY += 20;

            const infoBoxWidth = 350; // Reducimos el ancho para que no sea tan largo (estilo SRI)
            const infoBoxX = leftMargin;
            const rowPadding = 12; // Espacio entre líneas
            const colLabelWidth = 100;

// Calcular altura total necesaria dinámicamente
            const filasAdicionales = (guia.infoAdicional || []).map(item => {
                const textHeight = doc.heightOfString(item.valor, {
                    width: infoBoxWidth - colLabelWidth - 20
                });
                return { ...item, rowHeight: Math.max(15, textHeight) };
            });

            const totalContentHeight = filasAdicionales.reduce((acc, curr) => acc + curr.rowHeight + 5, 0);
            const boxHeight = totalContentHeight + 25; // +25 para el título y márgenes

// Salto de página preventivo
            if (currentY + boxHeight > 780) {
                doc.addPage();
                currentY = 30;
            }

// 🔲 Caja exterior única (Sin líneas internas, igual a la imagen)
            doc.rect(infoBoxX, currentY, infoBoxWidth, boxHeight).stroke();

// Título de la sección
            doc.font("Helvetica-Bold")
                .fontSize(9)
                .text("Información Adicional", infoBoxX + 10, currentY + 8);

            let adicY = currentY + 25;

// ----- Listado de información (Sin bordes de tabla) -----
            doc.font("Helvetica").fontSize(8);

            filasAdicionales.forEach(item => {
                // Nombre del campo (ej: Email, Teléfono)
                doc.font("Helvetica-Bold").text(
                    `${item.nombre}:`,
                    infoBoxX + 10,
                    adicY,
                    { width: colLabelWidth }
                );

                // Valor del campo (con soporte para texto muy largo)
                doc.font("Helvetica").text(
                    item.valor,
                    infoBoxX + colLabelWidth + 5,
                    adicY,
                    {
                        width: infoBoxWidth - colLabelWidth - 20,
                        align: 'left'
                    }
                );

                adicY += item.rowHeight + 5; // Salto proporcional al contenido
            });

            doc.end();
        });

        stream.on("finish", () => resolve());
        stream.on("error", (err) => reject(err));
    });
}
