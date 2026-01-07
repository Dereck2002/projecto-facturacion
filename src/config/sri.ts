export enum SRI_AMBIENTE {
    PRUEBAS = "1",
    PRODUCCION = "2"
}

export const SRI_CONFIG = {
    ambiente: SRI_AMBIENTE.PRUEBAS,

    wsdl: {
        recepcion: {
            pruebas:
                "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
            produccion:
                "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl"
        },
        autorizacion: {
            pruebas:
                "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl",
            produccion:
                "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
        }
    },

    timeout: 15000,
    versionFactura: "1.0.0"
};
