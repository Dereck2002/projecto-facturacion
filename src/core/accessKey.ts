/**
 * Genera el dígito verificador usando el algoritmo Módulo 11 (SRI Ecuador)
 */
export function calcularDigitoVerificador(cadena: string): number {
    const factores = [2, 3, 4, 5, 6, 7];
    let suma = 0;
    let factorIndex = 0;

    for (let i = cadena.length - 1; i >= 0; i--) {
        const digito = Number(cadena[i]);
        suma += digito * factores[factorIndex];
        factorIndex = (factorIndex + 1) % factores.length;
    }

    const modulo = 11 - (suma % 11);

    if (modulo === 11) return 0;
    if (modulo === 10) return 1;
    return modulo;
}

/**
 * Genera la clave de acceso completa (49 dígitos)
 */
export function generarClaveAcceso(params: {
    fechaEmision: string;   // ddMMyyyy
    tipoComprobante: string; // 01 factura
    ruc: string;
    ambiente: string;       // 1 pruebas, 2 producción
    serie: string;          // 001001
    secuencial: string;     // 000000001
    codigoNumerico: string; // 8 dígitos
    tipoEmision: string;    // 1 normal
}): string {
    const {
        fechaEmision,
        tipoComprobante,
        ruc,
        ambiente,
        serie,
        secuencial,
        codigoNumerico,
        tipoEmision
    } = params;

    const cadena =
        fechaEmision +
        tipoComprobante +
        ruc +
        ambiente +
        serie +
        secuencial +
        codigoNumerico +
        tipoEmision;

    const digitoVerificador = calcularDigitoVerificador(cadena);

    return cadena + digitoVerificador.toString();
}
