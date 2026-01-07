import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as bwipjs from "bwip-js";
import { Factura } from "./invoice.model";

interface RIDEParams {
    factura: Factura;
    claveAcceso: string;
    numeroAutorizacion: string;
    fechaAutorizacion: string;
    outputPath: string;
}

export async function generarRIDE(params: RIDEParams): Promise<void> {
    const { factura, claveAcceso, numeroAutorizacion, fechaAutorizacion, outputPath } = params;

    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = 595.28; // Ancho página A4
    const leftMargin = 30;
    const rightMargin = pageWidth - 30;
    const contentWidth = rightMargin - leftMargin;

    // ===============================
    // ENCABEZADO - SECCIÓN SUPERIOR
    // ===============================

    // Recuadro superior izquierdo - Información del emisor
    const topBoxHeight = 100;
    const leftBoxWidth = contentWidth * 0.58;
    const rightBoxWidth = contentWidth * 0.42;

    doc.lineWidth(1);
    doc.rect(leftMargin, 30, leftBoxWidth, topBoxHeight).stroke();

    let y = 38;
    doc.fontSize(11).font("Helvetica-Bold").text(factura.infoTributaria.razonSocial, leftMargin + 8, y, {
        width: leftBoxWidth - 16
    });
    y += 20;

    doc.fontSize(8).font("Helvetica");
    doc.text(`Dirección Matriz:`, leftMargin + 8, y);
    doc.text(factura.infoTributaria.dirMatriz, leftMargin + 8, y + 10, {
        width: leftBoxWidth - 16
    });
    y += 28;

    doc.text(`Dirección Sucursal:`, leftMargin + 8, y);
    doc.text(factura.infoTributaria.dirMatriz, leftMargin + 8, y + 10, {
        width: leftBoxWidth - 16
    });

    const rightBoxX = leftMargin + leftBoxWidth;
    doc.rect(rightBoxX, 30, rightBoxWidth, topBoxHeight).stroke();

    y = 38;
    doc.fontSize(8).font("Helvetica");
    doc.text("R.U.C.:", rightBoxX + 8, y);
    doc.font("Helvetica-Bold").text(factura.infoTributaria.ruc, rightBoxX + 45, y);

    y += 16;
    doc.font("Helvetica-Bold").fontSize(11).text("FACTURA", rightBoxX + 8, y, {
        width: rightBoxWidth - 16,
        align: "center"
    });

    y += 16;
    doc.fontSize(8).font("Helvetica").text(
        `No. ${factura.infoTributaria.estab}-${factura.infoTributaria.ptoEmi}-${factura.infoTributaria.secuencial}`,
        rightBoxX + 8,
        y,
        { width: rightBoxWidth - 16, align: "center" }
    );

    y += 16;
    doc.fontSize(7).text("NÚMERO DE AUTORIZACIÓN", rightBoxX + 8, y);
    doc.text(numeroAutorizacion, rightBoxX + 8, y + 9, {
        width: rightBoxWidth - 16,
        lineBreak: true
    });

    y += 24;
    doc.text("FECHA Y HORA DE AUTORIZACIÓN:", rightBoxX + 8, y);
    doc.text(fechaAutorizacion, rightBoxX + 8, y + 9);

    // ===============================
    // BARRA DE INFORMACIÓN
    // ===============================
    y = 145;
    doc.rect(leftMargin, y, contentWidth, 26).stroke();

    doc.fontSize(8).font("Helvetica-Bold");
    doc.text("OBLIGADO A LLEVAR CONTABILIDAD:", leftMargin + 8, y + 6);
    doc.font("Helvetica").text(factura.infoFactura.obligadoContabilidad || "NO", leftMargin + 180, y + 6);

    doc.font("Helvetica-Bold").text("AMBIENTE:", leftMargin + 240, y + 6);
    doc.font("Helvetica").text(
        factura.infoTributaria.ambiente === "1" ? "PRUEBAS" : "PRODUCCIÓN",
        leftMargin + 295,
        y + 6
    );

    doc.font("Helvetica-Bold").text("EMISIÓN:", leftMargin + 400, y + 6);
    doc.font("Helvetica").text("NORMAL", leftMargin + 445, y + 6);

    y += 15;
    doc.fontSize(7).font("Helvetica-Bold");
    doc.text("CLAVE DE ACCESO", leftMargin + 8, y);
    doc.font("Helvetica").fontSize(9).text(claveAcceso, leftMargin + 95, y);

    // ===============================
    // DATOS DEL COMPRADOR Y CÓDIGO DE BARRAS
    // ===============================
    y = 186;
    const buyerBoxHeight = 70;
    doc.rect(leftMargin, y, contentWidth, buyerBoxHeight).stroke();

    const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: claveAcceso,
        scale: 3,
        height: 10,
        includetext: false,
        textxalign: 'center',
    });

    const barcodeWidth = 200;
    const barcodeHeight = 35;
    const barcodeX = rightBoxX + (rightBoxWidth - barcodeWidth) / 2;

    doc.image(barcodeBuffer, barcodeX, y + 10, { width: barcodeWidth, height: barcodeHeight });

    doc.fontSize(7).font("Helvetica").text(claveAcceso, barcodeX, y + 48, {
        width: barcodeWidth,
        align: "center"
    });

    let yBuyer = y + 8;
    doc.fontSize(8).font("Helvetica-Bold");
    doc.text("Razón Social / Nombres y Apellidos:", leftMargin + 8, yBuyer, { continued: true });
    doc.font("Helvetica").text(`  ${factura.infoFactura.razonSocialComprador}`);

    yBuyer += 14;
    doc.font("Helvetica-Bold").text("Identificación:", leftMargin + 8, yBuyer, { continued: true });
    doc.font("Helvetica").text(`  ${factura.infoFactura.identificacionComprador}`);

    yBuyer += 14;
    doc.font("Helvetica-Bold").text("Fecha Emisión:", leftMargin + 8, yBuyer, { continued: true });
    doc.font("Helvetica").text(`  ${factura.infoFactura.fechaEmision}`);

    yBuyer += 14;
    doc.font("Helvetica-Bold").text("Dirección:", leftMargin + 8, yBuyer, { continued: true });
    doc.font("Helvetica").text(`  ${factura.infoFactura.direccionComprador || "-"}`);

    // ===============================
    // TABLA DE DETALLES
    // ===============================
    y = 271;

    const tableHeaderHeight = 18;
    doc.rect(leftMargin, y, contentWidth, tableHeaderHeight).fillAndStroke("#E8E8E8", "#000000");

    const colCodPrincipal = leftMargin + 5;
    const colCantidad = leftMargin + 65;
    const colDescripcion = leftMargin + 115;
    const colPrecioUnitario = leftMargin + 335;
    const colDescuento = leftMargin + 415;
    const colPrecioTotal = leftMargin + 475;

    doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
    doc.text("Cod. Principal", colCodPrincipal, y + 5, { width: 55 });
    doc.text("Cantidad", colCantidad, y + 5, { width: 45 });
    doc.text("Descripción", colDescripcion, y + 5, { width: 215 });
    doc.text("Precio Unitario", colPrecioUnitario, y + 5, { width: 75 });
    doc.text("Descuento", colDescuento, y + 5, { width: 55 });
    doc.text("Precio Total", colPrecioTotal, y + 5, { width: 60 });

    y += tableHeaderHeight;

    doc.font("Helvetica").fontSize(8);
    factura.detalles.forEach((detalle) => {
        if (y > 680) {
            doc.addPage();
            y = 60;
        }

        let rowHeight = 30;

        const descHeight = doc.heightOfString(detalle.descripcion, { width: 215 });
        if (descHeight > 20) {
            rowHeight = descHeight + 15;
        }

        doc.rect(leftMargin, y, contentWidth, rowHeight).stroke();

        doc.text(detalle.codigoPrincipal || "", colCodPrincipal, y + 8, { width: 55 });
        doc.text(detalle.cantidad.toFixed(2), colCantidad, y + 8, { width: 45, align: "center" });
        doc.text(detalle.descripcion, colDescripcion, y + 8, { width: 215 });
        doc.text(`$${detalle.precioUnitario.toFixed(2)}`, colPrecioUnitario, y + 8, { width: 70, align: "right" });
        doc.text(`$${detalle.descuento.toFixed(2)}`, colDescuento, y + 8, { width: 50, align: "right" });
        doc.text(`$${detalle.precioTotalSinImpuesto.toFixed(2)}`, colPrecioTotal, y + 8, { width: 55, align: "right" });

        y += rowHeight;
    });

    // ===============================
    // INFORMACIÓN ADICIONAL Y TOTALES
    // ===============================
    y += 8;

    const infoBoxWidth = leftBoxWidth;
    const totalesBoxWidth = rightBoxWidth;
    const boxesHeight = 140;

    doc.rect(leftMargin, y, infoBoxWidth, boxesHeight).stroke();
    doc.fontSize(9).font("Helvetica-Bold").text("Información Adicional", leftMargin + 8, y + 8);

    let yInfo = y + 24;
    doc.fontSize(8).font("Helvetica");
    doc.text("Teléfono: 0998092279", leftMargin + 8, yInfo);
    yInfo += 12;
    doc.text("Email: contabilidad@papagayodev.com", leftMargin + 8, yInfo);
    yInfo += 12;

    if (factura.infoAdicional && factura.infoAdicional.length > 0) {
        factura.infoAdicional.forEach(campo => {
            if (yInfo < y + boxesHeight - 15) {
                doc.text(`${campo.nombre}: ${campo.valor}`, leftMargin + 8, yInfo, {
                    width: infoBoxWidth - 16
                });
                yInfo += 12;
            }
        });
    }

    const totalesX = leftMargin + infoBoxWidth;
    doc.rect(totalesX, y, totalesBoxWidth, boxesHeight).stroke();

    let yTotales = y + 8;
    doc.fontSize(8).font("Helvetica");

    const labelWidth = 140;
    const valueWidth = 70;
    const valueX = totalesX + totalesBoxWidth - valueWidth - 8;

    const addTotalLine = (label: string, value: number, bold: boolean = false) => {
        if (bold) {
            doc.font("Helvetica-Bold");
        }
        doc.text(label, totalesX + 8, yTotales, { width: labelWidth });
        doc.text(`$${value.toFixed(2)}`, valueX, yTotales, { width: valueWidth, align: "right" });
        if (bold) {
            doc.font("Helvetica");
        }
        yTotales += 12;
    };

    addTotalLine("SUBTOTAL SIN IMPUESTOS", factura.infoFactura.totalSinImpuestos);
    addTotalLine("TOTAL DESCUENTO", factura.infoFactura.totalDescuento);

    const tarifaMap: { [key: string]: string } = {
        "0": "0%",
        "2": "12%",
        "3": "14%",
        "4": "15%",
        "5": "5%",
        "6": "NO OBJETO DE IVA",
        "7": "EXENTO DE IVA",
        "8": "IVA DIFERENCIADO",
        "10": "13%"
    };

    if (factura.infoFactura.totalConImpuestos) {
        factura.infoFactura.totalConImpuestos
            .filter(imp => imp.codigo === "2")
            .forEach((imp) => {
                const tarifaLabel = tarifaMap[imp.codigoPorcentaje] || "";
                addTotalLine(`SUBTOTAL ${tarifaLabel}`, imp.baseImponible);
                addTotalLine(`IVA ${tarifaLabel}`, imp.valor);
            });
    }

    // ICE
    const totalICE = factura.infoFactura.totalConImpuestos
        ? factura.infoFactura.totalConImpuestos
            .filter(t => t.codigo === "3")
            .reduce((acc, curr) => acc + curr.valor, 0)
        : 0;
    
    addTotalLine("ICE", totalICE);
    addTotalLine("IRBPNR", 0);
    addTotalLine("PROPINA", factura.infoFactura.propina);

    yTotales += 4;
    addTotalLine("VALOR TOTAL", factura.infoFactura.importeTotal, true);

    // ===============================
    // FORMA DE PAGO
    // ===============================
    y = y + boxesHeight + 8;
    const paymentBoxHeight = 50;
    doc.rect(leftMargin, y, contentWidth, paymentBoxHeight).stroke();

    doc.fontSize(9).font("Helvetica-Bold").text("Forma de pago", leftMargin + 8, y + 8);
    doc.fontSize(8).font("Helvetica");

    let yPago = y + 24;
    if (factura.infoFactura.pagos) {
        factura.infoFactura.pagos.forEach((pago) => {
            const formasPago: { [key: string]: string } = {
                "01": "SIN UTILIZACION DEL SISTEMA FINANCIERO",
                "15": "COMPENSACIÓN DE DEUDAS",
                "16": "TARJETA DE DÉBITO",
                "17": "DINERO ELECTRÓNICO",
                "18": "TARJETA PREPAGO",
                "19": "TARJETA DE CRÉDITO",
                "20": "OTROS CON UTILIZACION DEL SISTEMA FINANCIERO",
                "21": "ENDOSO DE TÍTULOS"
            };

            const nombreFormaPago = formasPago[pago.formaPago] || `FORMA ${pago.formaPago}`;
            doc.text(`${pago.formaPago} - ${nombreFormaPago}`, leftMargin + 8, yPago, {
                width: contentWidth - valueWidth - 24
            });
            doc.text(`$${pago.total.toFixed(2)}`, valueX, yPago, {
                width: valueWidth,
                align: "right"
            });
            yPago += 14;
        });
    }

    doc.end();

    await new Promise((resolve) => stream.on("finish", resolve));
}
