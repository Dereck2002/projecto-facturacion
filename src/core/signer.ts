import { signXml } from "osodreamer-sri-xml-signer";
import * as fs from "fs";

export async function signXML(params: {
    xml: string;
    p12Path: string;
    p12Password: string;
}): Promise<string> {
    const { xml, p12Path, p12Password } = params;

    // Leer certificado y XML como buffers
    const p12Buffer = fs.readFileSync(p12Path);
    const xmlBuffer = Buffer.from(xml, 'utf-8');

    // Firmar con osodreamer-sri-xml-signer
    const signedXml = await signXml({
        p12Buffer: new Uint8Array(p12Buffer),
        password: p12Password,
        xmlBuffer: new Uint8Array(xmlBuffer)
    });

    return signedXml;
}
