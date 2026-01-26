import 'web-streams-polyfill/ponyfill/es2018';
global.ReadableStream = global.ReadableStream || require('web-streams-polyfill/ponyfill/es2018').ReadableStream;
