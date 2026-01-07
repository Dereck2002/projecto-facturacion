# 🇪🇨 Sistema de Facturación Electrónica SRI Ecuador - PoC

Prueba de concepto (PoC) de un sistema de facturación electrónica que cumple con las normativas del **Servicio de Rentas Internas (SRI)** de Ecuador.

## 🎯 Características

- ✅ Generación de **Clave de Acceso** (49 dígitos) con algoritmo Módulo 11
- ✅ Construcción de XML conforme a la **especificación SRI v1.0.0**
- ✅ **Firma digital XAdES-BES** con certificado .p12
- ✅ Envío a **Web Service de Recepción** del SRI
- ✅ Consulta de **Autorización** de comprobantes
- ✅ Validaciones de estructura y longitudes de campos
- ✅ Manejo robusto de errores SOAP

## 📋 Requisitos Previos

- **Node.js** >= 16.x
- **npm** >= 8.x
- **Certificado digital** `.p12` válido (emitido por CA autorizada en Ecuador)
- Conocimiento básico de facturación electrónica SRI

## 🚀 Instalación

```bash
# Clonar o descargar el proyecto
cd sri-facturacion-poc

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build
```

## 📁 Estructura del Proyecto

```
sri-facturacion-poc/
├── src/
│   ├── config/
│   │   └── sri.ts                  # Configuración de endpoints SRI
│   ├── core/
│   │   ├── accessKey.ts            # Generador de clave de acceso
│   │   ├── invoice.model.ts        # Modelos TypeScript de factura
│   │   ├── signer.ts               # Firma XAdES-BES
│   │   └── xmlBuilder.ts           # Constructor de XML
│   ├── services/
│   │   ├── sri-autorizacion.ts     # Cliente SOAP autorización
│   │   ├── sri-recepcion.ts        # Cliente SOAP recepción
│   │   └── types.ts                # Tipos de respuestas SRI
│   ├── utils/
│   │   └── validator.ts            # Validador de estructura XML
│   └── index.ts                    # Script principal
├── certs/
│   └── (Tu certificado .p12 aquí)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuración

### 1. Certificado Digital

Coloca tu certificado `.p12` en la carpeta `certs/`.

### 2. Configurar Ambiente

Edita `src/config/sri.ts`:

```typescript
export const SRI_CONFIG = {
    ambiente: SRI_AMBIENTE.PRUEBAS,  // Cambiar a PRODUCCION cuando corresponda
    // ... resto de configuración
};
```

### 3. Actualizar Datos de la Empresa

Modifica `src/index.ts` con tus datos reales:

```typescript
const factura: Factura = {
    infoTributaria: {
        razonSocial: "TU EMPRESA S.A.",
        ruc: "1234567890001",  // Tu RUC
        // ...
    },
    // ...
};
```

## 🎬 Uso

### Ejecutar la Prueba de Concepto

```bash
npm run dev
```

### Flujo de Ejecución

El script ejecuta los siguientes pasos:

1. **Generación de Clave de Acceso** (49 dígitos)
2. **Construcción del objeto Factura**
3. **Validación de longitudes de campos**
4. **Generación de XML sin firma** → `factura-sin-firma.xml`
5. **Validación de estructura XML**
6. **Firma XAdES-BES del XML** → `factura-firmada.xml`
7. **Envío al SRI (Recepción)** vía SOAP
8. **Consulta de Autorización** vía SOAP
9. **Guardado de XML autorizado** → `factura-autorizada-{claveAcceso}.xml`

### Salida Esperada

```
🚀 Iniciando PoC Facturación SRI...

✔ Clave de acceso: 0601202601099999999900110020010000000011234567813

🔍 Validando datos de la factura...
✔ Validación de campos OK
✔ XML generado: factura-sin-firma.xml
✔ Estructura XML válida
✔ XML firmado: factura-firmada.xml

📡 Enviando comprobante al SRI (Recepción)...
📥 Respuesta SRI Recepción: RECIBIDA

📨 Consultando autorización...
📜 Respuesta SRI Autorización: AUTORIZADO
✅ Comprobante AUTORIZADO por el SRI
✅ FACTURA AUTORIZADA 🎉
```

## 📖 Ejemplos de Código

### Generar Clave de Acceso

```typescript
import { generarClaveAcceso } from "./core/accessKey";

const clave = generarClaveAcceso({
    fechaEmision: "06012026",       // ddMMyyyy
    tipoComprobante: "01",          // Factura
    ruc: "0999999999001",
    ambiente: "1",                  // Pruebas
    serie: "001001",                // Estab + Pto Emisión
    secuencial: "000000001",        // 9 dígitos
    codigoNumerico: "12345678",     // 8 dígitos aleatorios
    tipoEmision: "1"                // Normal
});

console.log(clave); // 49 dígitos
```

### Construir XML de Factura

```typescript
import { buildFacturaXML } from "./core/xmlBuilder";

const xml = buildFacturaXML(factura);
```

### Firmar XML

```typescript
import { signXML } from "./core/signer";

const xmlFirmado = signXML({
    xml: xmlSinFirma,
    p12Path: "certs/TU_CERTIFICADO.p12",
    p12Password: "TU_CONTRASEÑA"
});
```

### Enviar al SRI

```typescript
import { enviarComprobanteRecepcion } from "./services/sri-recepcion";

const respuesta = await enviarComprobanteRecepcion(xmlFirmado);

if (respuesta.estado === "RECIBIDA") {
    console.log("✅ Comprobante recibido");
}
```

## 🔍 Validaciones Incluidas

### Validación de Campos

- Longitudes máximas (razonSocial: 300, RUC: 13, etc.)
- Formatos obligatorios

### Validación de XML

- Versión correcta (1.0.0)
- Clave de acceso (49 dígitos)
- RUC (13 dígitos)
- Ambiente (1 o 2)
- Establecimiento y punto de emisión (3 dígitos cada uno)
- Secuencial (9 dígitos)
- Formato de fecha (dd/mm/yyyy)

## 🐛 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| **Firma inválida** | Certificado corrupto o falta referencia SignedProperties | Verificar signer.ts:136-141 |
| **Clave de acceso inválida** | Dígito verificador incorrecto | Revisar algoritmo Módulo 11 |
| **Secuencial duplicado** | Ya existe en SRI | Incrementar secuencial |
| **DEVUELTA** | Error en estructura XML | Revisar XMLs generados |

## 📚 Documentación de Referencia

- [Ficha Técnica SRI - Facturación Electrónica](https://www.sri.gob.ec/facturacion-electronica)
- [XAdES-BES Standard (ETSI TS 101 903)](https://www.etsi.org/deliver/etsi_ts/101900_101999/101903/)
- [Resolución NAC-DGERCGC12-00105](https://www.sri.gob.ec)

## 🛠️ Tecnologías Utilizadas

- **TypeScript** 5.9+
- **Node.js** 16+
- **node-forge** - Manejo de certificados PKCS#12
- **xml-crypto** - Firma XML XAdES-BES
- **soap** - Cliente SOAP para servicios del SRI
- **fast-xml-parser** - Construcción de XML

## ⚠️ Advertencias

1. **Ambiente de Pruebas:** Por defecto está configurado para pruebas. Cambia a producción con precaución.
2. **Certificado Privado:** NUNCA subas tu certificado `.p12` a repositorios públicos.
3. **Secuenciales:** El SRI rechaza secuenciales duplicados. Implementa un sistema de control.
4. **Fecha de Emisión:** El SRI valida que la fecha esté dentro de ±5 días de la fecha actual.

## 🔐 Seguridad

- Agrega `certs/` al `.gitignore`
- No expongas passwords en código
- Usa variables de entorno para datos sensibles:

```typescript
const p12Password = process.env.P12_PASSWORD || "default";
```

## 📈 Estado del Proyecto

**Versión:** 1.0.0 (PoC)
**Estado:** ✅ Funcional para pruebas
**Cobertura:** ~90% del flujo de facturación electrónica

### Pendientes

- [ ] Generación de RIDE (PDF)
- [ ] Validación contra XSD oficiales del SRI
- [ ] Implementación de otros tipos de comprobantes (retenciones, guías, etc.)
- [ ] Sistema de persistencia de secuenciales
- [ ] API REST para integración con otros sistemas

## 🤝 Contribuciones

Este es un proyecto PoC educativo. Para producción, considera:
- Tests unitarios y de integración
- Logging estructurado
- Monitoreo de servicios SRI
- Cache de respuestas
- Reintentos automáticos

## 📝 Licencia

Este proyecto es de código abierto para fines educativos.

## 👨‍💻 Autor

Desarrollado como Prueba de Concepto para implementación de facturación electrónica SRI Ecuador.

---

**Última actualización:** 2026-01-07
**Compatible con:** SRI v1.0.0 (Factura Electrónica)
