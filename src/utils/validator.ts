/**
 * Validador de XML según especificaciones del SRI Ecuador
 */

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Valida que un XML cumpla con las reglas básicas del SRI
 */
export function validateFacturaXML(xml: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validación 1: Versión correcta
    if (!xml.includes('version="1.0.0"')) {
        errors.push({
            field: "factura@version",
            message: "La versión debe ser 1.0.0"
        });
    }

    // Validación 2: ID comprobante
    if (!xml.includes('id="comprobante"')) {
        errors.push({
            field: "factura@id",
            message: 'El atributo id debe ser "comprobante"'
        });
    }

    // Validación 3: Clave de acceso (49 dígitos)
    const claveMatch = xml.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
    if (!claveMatch || claveMatch[1].length !== 49) {
        errors.push({
            field: "claveAcceso",
            message: "La clave de acceso debe tener exactamente 49 dígitos"
        });
    }

    // Validación 4: RUC (13 dígitos)
    const rucMatch = xml.match(/<ruc>(\d+)<\/ruc>/);
    if (!rucMatch || rucMatch[1].length !== 13) {
        errors.push({
            field: "ruc",
            message: "El RUC debe tener exactamente 13 dígitos"
        });
    }

    // Validación 5: Ambiente válido
    const ambienteMatch = xml.match(/<ambiente>([12])<\/ambiente>/);
    if (!ambienteMatch) {
        errors.push({
            field: "ambiente",
            message: "El ambiente debe ser 1 (pruebas) o 2 (producción)"
        });
    }

    // Validación 6: Tipo de emisión
    const tipoEmisionMatch = xml.match(/<tipoEmision>1<\/tipoEmision>/);
    if (!tipoEmisionMatch) {
        errors.push({
            field: "tipoEmision",
            message: "El tipo de emisión debe ser 1 (normal)"
        });
    }

    // Validación 7: Código de documento
    const codDocMatch = xml.match(/<codDoc>01<\/codDoc>/);
    if (!codDocMatch) {
        errors.push({
            field: "codDoc",
            message: "El código de documento debe ser 01 para facturas"
        });
    }

    // Validación 8: Establecimientos (3 dígitos)
    const estabMatch = xml.match(/<estab>(\d{3})<\/estab>/);
    if (!estabMatch) {
        errors.push({
            field: "estab",
            message: "El establecimiento debe tener 3 dígitos"
        });
    }

    // Validación 9: Punto de emisión (3 dígitos)
    const ptoEmiMatch = xml.match(/<ptoEmi>(\d{3})<\/ptoEmi>/);
    if (!ptoEmiMatch) {
        errors.push({
            field: "ptoEmi",
            message: "El punto de emisión debe tener 3 dígitos"
        });
    }

    // Validación 10: Secuencial (9 dígitos)
    const secuencialMatch = xml.match(/<secuencial>(\d{9})<\/secuencial>/);
    if (!secuencialMatch) {
        errors.push({
            field: "secuencial",
            message: "El secuencial debe tener 9 dígitos"
        });
    }

    // Validación 11: Formato de fecha (dd/mm/yyyy)
    const fechaMatch = xml.match(/<fechaEmision>(\d{2}\/\d{2}\/\d{4})<\/fechaEmision>/);
    if (!fechaMatch) {
        errors.push({
            field: "fechaEmision",
            message: "La fecha debe tener formato dd/mm/yyyy"
        });
    }

    // Validación 12: Obligado a llevar contabilidad
    if (xml.includes("<obligadoContabilidad>")) {
        const contabMatch = xml.match(/<obligadoContabilidad>(SI|NO)<\/obligadoContabilidad>/);
        if (!contabMatch) {
            errors.push({
                field: "obligadoContabilidad",
                message: "El campo obligadoContabilidad debe ser SI o NO"
            });
        }
    }

    // Validación 13: Moneda
    if (xml.includes("<moneda>")) {
        const monedaMatch = xml.match(/<moneda>DOLAR<\/moneda>/);
        if (!monedaMatch) {
            errors.push({
                field: "moneda",
                message: "La moneda debe ser DOLAR"
            });
        }
    }

    // Validación 14: Pagos obligatorio
    if (!xml.includes("<pagos>")) {
        errors.push({
            field: "pagos",
            message: "El campo pagos es obligatorio"
        });
    }

    return errors;
}

/**
 * Valida longitudes de campos según SRI
 */
export function validateFieldLengths(data: any): ValidationError[] {
    const errors: ValidationError[] = [];

    const checks = [
        { field: "razonSocial", value: data.infoTributaria?.razonSocial, max: 300 },
        { field: "nombreComercial", value: data.infoTributaria?.nombreComercial, max: 300 },
        { field: "dirMatriz", value: data.infoTributaria?.dirMatriz, max: 300 },
        { field: "razonSocialComprador", value: data.infoFactura?.razonSocialComprador, max: 300 },
        { field: "identificacionComprador", value: data.infoFactura?.identificacionComprador, max: 20 },
        { field: "direccionComprador", value: data.infoFactura?.direccionComprador, max: 300 },
    ];

    for (const check of checks) {
        if (check.value && check.value.length > check.max) {
            errors.push({
                field: check.field,
                message: `El campo ${check.field} excede la longitud máxima de ${check.max} caracteres`
            });
        }
    }

    return errors;
}
