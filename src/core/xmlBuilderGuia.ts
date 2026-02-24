import { XMLBuilder } from "fast-xml-parser";
import { GuiaRemision } from "./guiaRemision.model";

export function buildGuiaRemisionXML(guia: GuiaRemision): string {
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: false, // SRI no recomienda formato indentado
        suppressEmptyNode: true,
        attributeNamePrefix: "@_",
    });

    const xmlObject = {
        "?xml": {
            "@_version": "1.0",
            "@_encoding": "UTF-8"
        },
        guiaRemision: {
            "@_id": "comprobante",
            "@_version": "1.0.0",

            infoTributaria: guia.infoTributaria,

            infoGuiaRemision: {
                dirEstablecimiento: guia.infoGuiaRemision.dirEstablecimiento,
                dirPartida: guia.infoGuiaRemision.dirPartida,
                razonSocialTransportista: guia.infoGuiaRemision.razonSocialTransportista,
                tipoIdentificacionTransportista: guia.infoGuiaRemision.tipoIdentificacionTransportista,
                rucTransportista: guia.infoGuiaRemision.rucTransportista,
                rise: guia.infoGuiaRemision.rise,
                obligadoContabilidad: guia.infoGuiaRemision.obligadoContabilidad,
                contribuyenteEspecial: guia.infoGuiaRemision.contribuyenteEspecial,
                fechaIniTransporte: guia.infoGuiaRemision.fechaIniTransporte,
                fechaFinTransporte: guia.infoGuiaRemision.fechaFinTransporte,
                placa: guia.infoGuiaRemision.placa,
            },

            destinatarios: {
                destinatario: guia.destinatarios.map(dest => {
                    const destinatario: any = {
                        identificacionDestinatario: dest.identificacionDestinatario,
                        razonSocialDestinatario: dest.razonSocialDestinatario,
                        dirDestinatario: dest.dirDestinatario,
                        motivoTraslado: dest.motivoTraslado,
                        docAduaneroUnico: dest.docAduaneroUnico,
                        codEstabDestino: dest.codEstabDestino,
                        ruta: dest.ruta,
                        codDocSustento: dest.codDocSustento,
                        numDocSustento: dest.numDocSustento,
                        numAutDocSustento: dest.numAutDocSustento,
                        fechaEmisionDocSustento: dest.fechaEmisionDocSustento,
                        detalles: {
                            detalle: dest.detalles.map(det => {
                                const detalle: any = {
                                    codigoInterno: det.codigoInterno,
                                    codigoAdicional: det.codigoAdicional,
                                    descripcion: det.descripcion,
                                    cantidad: det.cantidad.toFixed(2),
                                };
                                if (det.detallesAdicionales && det.detallesAdicionales.length > 0) {
                                    detalle.detallesAdicionales = {
                                        detAdicional: det.detallesAdicionales.map(da => ({
                                            "@_nombre": da.nombre,
                                            "@_valor": da.valor
                                        }))
                                    };
                                }
                                return detalle;
                            })
                        }
                    };
                    return destinatario;
                })
            },

            infoAdicional: guia.infoAdicional ? {
                campoAdicional: guia.infoAdicional.map(campo => ({
                    "@_nombre": campo.nombre,
                    "#text": campo.valor
                }))
            } : undefined,
        }
    };

    return builder.build(xmlObject);
}
