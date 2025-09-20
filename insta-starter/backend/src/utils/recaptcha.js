import fetch from 'node-fetch';
export async function verifyRecaptcha(token, remoteip){
  const params = new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET, response: token });
  if (remoteip) params.append('remoteip', remoteip);
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', { method:'POST', body: params });
  const data = await res.json();
  return data && data.success;
}
