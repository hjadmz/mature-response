// The API is bound to loopback, which stops other machines — but not the
// user's own browser. A page on any domain can point DNS at 127.0.0.1 and
// then read our responses as same-origin (DNS rebinding), which would hand
// over every stored message in a single GET of /api/entries?export=1.
// Requests are only served when the Host header is genuinely local.
// (Next 16 deprecates middleware.js in favour of this proxy convention.)
import { NextResponse } from 'next/server';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export default function proxy(request) {
  const host = request.headers.get('host') || '';
  const hostname = host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)   // bracketed IPv6 literal
    : host.split(':')[0];                    // strip the port, whatever it is
  if (!LOCAL_HOSTS.has(hostname)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
