import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';
import { error } from '@sveltejs/kit';

// Servers bands name (their WebDAV) are reached from this server: unless the herd allows it, never one on the herd's
// own network, which would let a band reach what only the server can

const LOCAL = new BlockList();
for (const [network, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16]] as const) {
    LOCAL.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10]] as const) {
    LOCAL.addSubnet(network, prefix, 'ipv6');
}

function isLocal(address: string): boolean {
    const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
    return mappedIpv4 ? LOCAL.check(mappedIpv4, 'ipv4') : LOCAL.check(address, isIP(address) == 6 ? 'ipv6' : 'ipv4');
}

/** Refuses a server address that isn't http(s), or (unless `allowLocal`) that resolves to the herd's own network */
export async function checkServerAddress(url: string, allowLocal: boolean): Promise<void> {
    const parsed = URL.canParse(url) ? new URL(url) : null;
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) error(400, 'The server address starts with https://');
    if (allowLocal) return;
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [host]
        : (await lookup(host, { all: true }).catch(() => error(400, `Can't find the server ${host}`))).map(({ address }) => address);
    if (addresses.some(isLocal)) error(400, "This server is on the herd's own network: use one on the internet");
}
