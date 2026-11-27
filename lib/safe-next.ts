/** Only same-site relative paths are allowed as post-sign-in destinations (no open redirect). */
export function safeNext(raw:unknown,fallback='/account'){
 const v=typeof raw==='string'?raw:'';
 return /^\/(?![\/\\])[\w\-./?=&%#]*$/.test(v)?v:fallback;
}
