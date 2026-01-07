export interface MensajeSRI {
    identificador?: string;
    mensaje: string;
    informacionAdicional?: string;
}

export interface RespuestaRecepcion {
    estado: string;
    mensajes: MensajeSRI[];
}

export interface RespuestaAutorizacion {
    estado: string;
    mensajes: MensajeSRI[];
    xmlAutorizado?: string;
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    autorizacion?: any;
}
