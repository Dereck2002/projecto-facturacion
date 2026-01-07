/* ===========================
 * INFO TRIBUTARIA
 * =========================== */
export interface InfoTributaria {
    ambiente: "1" | "2";
    tipoEmision: "1";
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    claveAcceso: string;
    codDoc: "01";
    estab: string;
    ptoEmi: string;
    secuencial: string;
    dirMatriz: string;
}

/* ===========================
 * INFO FACTURA
 * =========================== */
export interface InfoFactura {
    fechaEmision: string; // dd/MM/yyyy
    dirEstablecimiento?: string;
    contribuyenteEspecial?: string;
    obligadoContabilidad?: "SI" | "NO";
    tipoIdentificacionComprador:
        | "04" // RUC
        | "05" // Cédula
        | "06" // Pasaporte
        | "07"; // Consumidor final
    guiaRemision?: string;
    razonSocialComprador: string;
    identificacionComprador: string;
    direccionComprador?: string;
    totalSinImpuestos: number;
    totalDescuento: number;
    totalConImpuestos: TotalConImpuesto[];
    propina: number;
    importeTotal: number;
    moneda: "DOLAR";
    pagos?: Pago[];
    valorRetIva?: number;
    valorRetRenta?: number;
}

/* ===========================
 * PAGOS
 * =========================== */
export interface Pago {
    formaPago: string; // Conforme tabla 24
    total: number;
    plazo?: number;
    unidadTiempo?: string;
}

/* ===========================
 * IMPUESTOS TOTALES
 * =========================== */
export interface TotalConImpuesto {
    codigo: "2" | "3"; // 2: IVA, 3: ICE
    codigoPorcentaje: string;
    descuentoAdicional?: number; // Opcional, aplica para código impuesto 2
    baseImponible: number;
    valor: number;
}

/* ===========================
 * DETALLES
 * =========================== */
export interface Detalle {
    codigoPrincipal: string;
    codigoAuxiliar?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    detallesAdicionales?: DetalleAdicional[];
    impuestos: Impuesto[];
}

export interface DetalleAdicional {
    nombre: string;
    valor: string;
}

/* ===========================
 * IMPUESTOS POR DETALLE
 * =========================== */
export interface Impuesto {
    codigo: "2" | "3"; // 2: IVA, 3: ICE
    codigoPorcentaje: string;
    tarifa: number;
    baseImponible: number;
    valor: number;
}

/* ===========================
 * RETENCIONES
 * =========================== */
export interface Retencion {
    codigo: "1" | "2" | "3" | "4"; // Conforme tabla 22
    codigoPorcentaje: string; // Conforme tabla 23
    tarifa: number;
    valor: number;
}

/* ===========================
 * INFO ADICIONAL
 * =========================== */
export interface CampoAdicional {
    nombre: string;
    valor: string;
}

/* ===========================
 * FACTURA COMPLETA
 * =========================== */
export interface Factura {
    infoTributaria: InfoTributaria;
    infoFactura: InfoFactura;
    detalles: Detalle[];
    retenciones?: Retencion[];
    infoAdicional?: CampoAdicional[];
}
