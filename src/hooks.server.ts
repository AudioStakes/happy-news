import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/admin')) {
		const adminSecret = event.platform?.env?.ADMIN_SECRET;
		if (adminSecret) {
			const authHeader = event.request.headers.get('Authorization');
			const isBasic = authHeader?.startsWith('Basic ');
			if (isBasic && authHeader) {
				try {
					const decoded = atob(authHeader.slice(6));
					const password = decoded.split(':').slice(1).join(':');
					if (password === adminSecret) {
						return resolve(event);
					}
				} catch {
					// invalid base64 — fall through to 401
				}
			}
			return new Response('Unauthorized', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
			});
		}
	}
	return resolve(event);
};
