/* ===========================
 * INFO TRIBUTARIA (Reutilizable o específica)
 * =========================== */
export interface InfoTributariaGuia {
    ambiente: "1" | "2";
    tipoEmision: "1";
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    claveAcceso: string;
    codDoc: "06"; // Código para Guía de Remisión
    estab: string;
    ptoEmi: string;
    secuencial: string;
    dirMatriz: string;
}

/* ===========================
 * INFO GUÍA REMISIÓN
 * =========================== */
export interface InfoGuiaRemision {
    dirEstablecimiento?: string;
    dirPartida: string;
    razonSocialTransportista: string;
    tipoIdentificacionTransportista: "04" | "05" | "06" | "07"; // RUC, Cédula, Pasaporte, Consumidor Final
    rucTransportista: string;
    rise?: string;
    obligadoContabilidad?: "SI" | "NO";
    contribuyenteEspecial?: string;
    fechaIniTransporte: string; // dd/mm/aaaa
    fechaFinTransporte: string; // dd/mm/aaaa
    placa: string;
}

/* ===========================
 * DESTINATARIOS
 * =========================== */
export interface Destinatario {
    identificacionDestinatario: string;
    razonSocialDestinatario: string;
    dirDestinatario: string;
    motivoTraslado: string;
    docAduaneroUnico?: string;
    codEstabDestino?: string;
    ruta?: string;
    codDocSustento?: string; // Ej: 01 para Factura
    numDocSustento?: string; // 001-001-000000001
    numAutDocSustento?: string;
    fechaEmisionDocSustento?: string; // dd/mm/aaaa
    detalles: DetalleGuia[];
}

/* ===========================
 * DETALLES (Productos)
 * =========================== */
export interface DetalleGuia {
    codigoInterno: string;
    codigoAdicional?: string;
    descripcion: string;
    cantidad: number;
    detallesAdicionales?: DetalleAdicionalGuia[];
}

export interface DetalleAdicionalGuia {
    nombre: string;
    valor: string;
}

/* ===========================
 * INFO ADICIONAL
 * =========================== */
export interface CampoAdicionalGuia {
    nombre: string;
    valor: string;
}

/* ===========================
 * GUÍA DE REMISIÓN COMPLETA
 * =========================== */
export interface GuiaRemision {
    infoTributaria: InfoTributariaGuia;
    infoGuiaRemision: InfoGuiaRemision;
    destinatarios: Destinatario[];
    infoAdicional?: CampoAdicionalGuia[];
}
