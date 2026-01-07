import { XMLBuilder } from "fast-xml-parser";
import { Factura } from "./invoice.model";

export function buildFacturaXML(factura: Factura): string {
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: false,
        suppressEmptyNode: true,
        attributeNamePrefix: "@_",
    });

    // Construir infoFactura con campos opcionales
    const infoFactura: any = {
        fechaEmision: factura.infoFactura.fechaEmision,
    };

    // Campos opcionales
    if (factura.infoFactura.dirEstablecimiento) {
        infoFactura.dirEstablecimiento = factura.infoFactura.dirEstablecimiento;
    }
    if (factura.infoFactura.contribuyenteEspecial) {
        infoFactura.contribuyenteEspecial = factura.infoFactura.contribuyenteEspecial;
    }
    if (factura.infoFactura.obligadoContabilidad) {
        infoFactura.obligadoContabilidad = factura.infoFactura.obligadoContabilidad;
    }

    // Datos del comprador
    infoFactura.tipoIdentificacionComprador = factura.infoFactura.tipoIdentificacionComprador;

    if (factura.infoFactura.guiaRemision) {
        infoFactura.guiaRemision = factura.infoFactura.guiaRemision;
    }

    infoFactura.razonSocialComprador = factura.infoFactura.razonSocialComprador;
    infoFactura.identificacionComprador = factura.infoFactura.identificacionComprador;

    if (factura.infoFactura.direccionComprador) {
        infoFactura.direccionComprador = factura.infoFactura.direccionComprador;
    }

    // Totales
    infoFactura.totalSinImpuestos = factura.infoFactura.totalSinImpuestos.toFixed(2);
    infoFactura.totalDescuento = factura.infoFactura.totalDescuento.toFixed(2);

    infoFactura.totalConImpuestos = {
        totalImpuesto: factura.infoFactura.totalConImpuestos.map((t) => {
            const impuesto: any = {
                codigo: t.codigo,
                codigoPorcentaje: t.codigoPorcentaje,
            };
            if (t.descuentoAdicional !== undefined) {
                impuesto.descuentoAdicional = t.descuentoAdicional.toFixed(2);
            }
            impuesto.baseImponible = t.baseImponible.toFixed(2);
            impuesto.valor = t.valor.toFixed(2);
            return impuesto;
        })
    };

    infoFactura.propina = factura.infoFactura.propina.toFixed(2);
    infoFactura.importeTotal = factura.infoFactura.importeTotal.toFixed(2);
    infoFactura.moneda = factura.infoFactura.moneda;

    // Pagos (obligatorio)
    infoFactura.pagos = {
        pago: factura.infoFactura.pagos || [{
            formaPago: "01",
            total: factura.infoFactura.importeTotal.toFixed(2)
        }]
    };

    // Retenciones opcionales
    if (factura.infoFactura.valorRetIva !== undefined) {
        infoFactura.valorRetIva = factura.infoFactura.valorRetIva.toFixed(2);
    }
    if (factura.infoFactura.valorRetRenta !== undefined) {
        infoFactura.valorRetRenta = factura.infoFactura.valorRetRenta.toFixed(2);
    }

    const xmlObject = {
        "?xml": {
            "@_version": "1.0",
            "@_encoding": "UTF-8"
        },
        factura: {
            "@_id": "comprobante",
            "@_version": "1.0.0",

            infoTributaria: factura.infoTributaria,
            infoFactura,

            detalles: {
                detalle: factura.detalles.map((d) => {
                    const detalle: any = {
                        codigoPrincipal: d.codigoPrincipal,
                    };

                    if (d.codigoAuxiliar) {
                        detalle.codigoAuxiliar = d.codigoAuxiliar;
                    }

                    detalle.descripcion = d.descripcion;
                    detalle.cantidad = Number(d.cantidad.toFixed(2)).toString();
                    detalle.precioUnitario = Number(d.precioUnitario.toFixed(2)).toString();
                    detalle.descuento = Number(d.descuento.toFixed(2)).toString();
                    detalle.precioTotalSinImpuesto = Number(d.precioTotalSinImpuesto.toFixed(2)).toString();

                    // Detalles adicionales
                    if (d.detallesAdicionales && d.detallesAdicionales.length > 0) {
                        detalle.detallesAdicionales = {
                            detAdicional: d.detallesAdicionales.map(da => ({
                                "@_nombre": da.nombre,
                                "@_valor": da.valor
                            }))
                        };
                    }

                    detalle.impuestos = {
                        impuesto: d.impuestos.map((i) => ({
                            codigo: i.codigo,
                            codigoPorcentaje: i.codigoPorcentaje,
                            tarifa: i.tarifa.toFixed(2),
                            baseImponible: i.baseImponible.toFixed(2),
                            valor: i.valor.toFixed(2)
                        }))
                    };

                    return detalle;
                })
            }
        }
    };

    // Agregar retenciones si existen
    if (factura.retenciones && factura.retenciones.length > 0) {
        (xmlObject.factura as any).retenciones = {
            retencion: factura.retenciones.map(r => ({
                codigo: r.codigo,
                codigoPorcentaje: r.codigoPorcentaje,
                tarifa: r.tarifa.toFixed(2),
                valor: r.valor.toFixed(2)
            }))
        };
    }

    // Agregar info adicional si existe
    if (factura.infoAdicional && factura.infoAdicional.length > 0) {
        (xmlObject.factura as any).infoAdicional = {
            campoAdicional: factura.infoAdicional.map(campo => ({
                "@_nombre": campo.nombre,
                "#text": campo.valor
            }))
        };
    }

    return builder.build(xmlObject);
}
