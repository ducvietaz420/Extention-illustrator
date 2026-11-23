'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {createPrivateKey, createPublicKey, generateKeyPairSync} = require('node:crypto');

const root = path.resolve(__dirname,'..');
const settings = process.env.LOCALAPPDATA;
const privatePath = process.argv[2] || (settings && path.join(settings,'EventDesignToolkit','Admin','EDT-signing-private.jwk.json'));
if (!privatePath) throw new Error('Provide a private key path outside the project folder.');

const target = path.resolve(privatePath);
const relative = path.relative(root,target);
if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
  throw new Error('Store the private signing key outside the project and release folders.');
}

const hostPath = path.join(root,'src','host','license-public.jsx');
const adminFolder = path.join(root,'admin');
const adminPath = path.join(adminFolder,'license-public.js');
let privateKey;
if (fs.existsSync(target)) {
  try {
    privateKey = createPrivateKey({key:JSON.parse(fs.readFileSync(target,'utf8')),format:'jwk'});
  } catch (_) {
    throw new Error('Cannot open the private signing key at the specified path.');
  }
} else {
  if (fs.existsSync(hostPath) || fs.existsSync(adminPath)) {
    throw new Error('This project already has a public key. Restore its original private key before provisioning.');
  }
  ({privateKey} = generateKeyPairSync('rsa',{modulusLength:2048,publicExponent:0x10001}));
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(privateKey.export({format:'jwk'}),null,2) + '\n',{flag:'wx',mode:0o600});
}

const publicKey = createPublicKey(privateKey).export({format:'jwk'});
if (publicKey.kty !== 'RSA' || publicKey.e !== 'AQAB' || Buffer.from(publicKey.n,'base64url').length !== 256 ||
    privateKey.asymmetricKeyDetails.modulusLength !== 2048) {
  throw new Error('The issuer must use an RSA-2048 key with exponent 65537.');
}
const publicJSON = JSON.stringify({n:publicKey.n,e:publicKey.e});
const hostSource = 'EDT.licensePublicKey = ' + publicJSON + ';\n';
const adminSource = 'window.EDT_ADMIN_PUBLIC_KEY = ' + publicJSON + ';\n';
for (const [file,source] of [[hostPath,hostSource],[adminPath,adminSource]]) {
  if (fs.existsSync(file) && fs.readFileSync(file,'utf8').trim() !== source.trim()) {
    throw new Error('The private key does not match the public key already pinned in the project.');
  }
}
fs.mkdirSync(adminFolder,{recursive:true});
fs.writeFileSync(hostPath,hostSource);
fs.writeFileSync(adminPath,adminSource);
console.log('Private key kept at ' + target);
console.log('Matching public key configured for Illustrator and the admin page.');
