const ft=()=>{};var pe={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke=function(e){const t=[];let n=0;for(let r=0;r<e.length;r++){let i=e.charCodeAt(r);i<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,t[n++]=i&63|128):(i&64512)===55296&&r+1<e.length&&(e.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(e.charCodeAt(++r)&1023),t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=i&63|128):(t[n++]=i>>12|224,t[n++]=i>>6&63|128,t[n++]=i&63|128)}return t},ht=function(e){const t=[];let n=0,r=0;for(;n<e.length;){const i=e[n++];if(i<128)t[r++]=String.fromCharCode(i);else if(i>191&&i<224){const o=e[n++];t[r++]=String.fromCharCode((i&31)<<6|o&63)}else if(i>239&&i<365){const o=e[n++],s=e[n++],c=e[n++],u=((i&7)<<18|(o&63)<<12|(s&63)<<6|c&63)-65536;t[r++]=String.fromCharCode(55296+(u>>10)),t[r++]=String.fromCharCode(56320+(u&1023))}else{const o=e[n++],s=e[n++];t[r++]=String.fromCharCode((i&15)<<12|(o&63)<<6|s&63)}}return t.join("")},Oe={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<e.length;i+=3){const o=e[i],s=i+1<e.length,c=s?e[i+1]:0,u=i+2<e.length,a=u?e[i+2]:0,v=o>>2,T=(o&3)<<4|c>>4;let k=(c&15)<<2|a>>6,O=a&63;u||(O=64,s||(k=64)),r.push(n[v],n[T],n[k],n[O])}return r.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(ke(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):ht(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<e.length;){const o=n[e.charAt(i++)],c=i<e.length?n[e.charAt(i)]:0;++i;const a=i<e.length?n[e.charAt(i)]:64;++i;const T=i<e.length?n[e.charAt(i)]:64;if(++i,o==null||c==null||a==null||T==null)throw new pt;const k=o<<2|c>>4;if(r.push(k),a!==64){const O=c<<4&240|a>>2;if(r.push(O),T!==64){const dt=a<<6&192|T;r.push(dt)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class pt extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const gt=function(e){const t=ke(e);return Oe.encodeByteArray(t,!0)},Me=function(e){return gt(e).replace(/\./g,"")},mt=function(e){try{return Oe.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bt(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wt=()=>bt().__FIREBASE_DEFAULTS__,yt=()=>{if(typeof process>"u"||typeof pe>"u")return;const e=pe.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},It=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=e&&mt(e[1]);return t&&JSON.parse(t)},Et=()=>{try{return ft()||wt()||yt()||It()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Ne=()=>{var e;return(e=Et())==null?void 0:e.config};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _t{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}wrapCallback(t){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(n):t(n,r))}}}function Be(){try{return typeof indexedDB=="object"}catch{return!1}}function Re(){return new Promise((e,t)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),n||self.indexedDB.deleteDatabase(r),e(!0)},i.onupgradeneeded=()=>{n=!1},i.onerror=()=>{var o;t(((o=i.error)==null?void 0:o.message)||"")}}catch(n){t(n)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const St="FirebaseError";class A extends Error{constructor(t,n,r){super(n),this.code=t,this.customData=r,this.name=St,Object.setPrototypeOf(this,A.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,$.prototype.create)}}class ${constructor(t,n,r){this.service=t,this.serviceName=n,this.errors=r}create(t,...n){const r=n[0]||{},i=`${this.service}/${t}`,o=this.errors[t],s=o?At(o,r):"Error",c=`${this.serviceName}: ${s} (${i}).`;return new A(i,c,r)}}function At(e,t){return e.replace(Tt,(n,r)=>{const i=t[r];return i!=null?String(i):`<${r}?>`})}const Tt=/\{\$([^}]+)}/g;function J(e,t){if(e===t)return!0;const n=Object.keys(e),r=Object.keys(t);for(const i of n){if(!r.includes(i))return!1;const o=e[i],s=t[i];if(ge(o)&&ge(s)){if(!J(o,s))return!1}else if(o!==s)return!1}for(const i of r)if(!n.includes(i))return!1;return!0}function ge(e){return e!==null&&typeof e=="object"}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $e(e){return e&&e._delegate?e._delegate:e}class w{constructor(t,n,r){this.name=t,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const m="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dt{constructor(t,n){this.name=t,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const n=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(n)){const r=new _t;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:n});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(t){const n=this.normalizeInstanceIdentifier(t==null?void 0:t.identifier),r=(t==null?void 0:t.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(i){if(r)return null;throw i}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(vt(t))try{this.getOrInitializeService({instanceIdentifier:m})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(n);try{const o=this.getOrInitializeService({instanceIdentifier:i});r.resolve(o)}catch{}}}}clearInstance(t=m){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...t.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=m){return this.instances.has(t)}getOptions(t=m){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:n={}}=t,r=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[o,s]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(o);r===c&&s.resolve(i)}return i}onInit(t,n){const r=this.normalizeInstanceIdentifier(n),i=this.onInitCallbacks.get(r)??new Set;i.add(t),this.onInitCallbacks.set(r,i);const o=this.instances.get(r);return o&&t(o,r),()=>{i.delete(t)}}invokeOnInitCallbacks(t,n){const r=this.onInitCallbacks.get(n);if(r)for(const i of r)try{i(t,n)}catch{}}getOrInitializeService({instanceIdentifier:t,options:n={}}){let r=this.instances.get(t);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Ct(t),options:n}),this.instances.set(t,r),this.instancesOptions.set(t,n),this.invokeOnInitCallbacks(r,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,r)}catch{}return r||null}normalizeInstanceIdentifier(t=m){return this.component?this.component.multipleInstances?t:m:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Ct(e){return e===m?void 0:e}function vt(e){return e.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const n=this.getProvider(t.name);if(n.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);n.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const n=new Dt(t,this);return this.providers.set(t,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var l;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(l||(l={}));const Ot={debug:l.DEBUG,verbose:l.VERBOSE,info:l.INFO,warn:l.WARN,error:l.ERROR,silent:l.SILENT},Mt=l.INFO,Nt={[l.DEBUG]:"log",[l.VERBOSE]:"log",[l.INFO]:"info",[l.WARN]:"warn",[l.ERROR]:"error"},Bt=(e,t,...n)=>{if(t<e.logLevel)return;const r=new Date().toISOString(),i=Nt[t];if(i)console[i](`[${r}]  ${e.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class Rt{constructor(t){this.name=t,this._logLevel=Mt,this._logHandler=Bt,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in l))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?Ot[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,l.DEBUG,...t),this._logHandler(this,l.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,l.VERBOSE,...t),this._logHandler(this,l.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,l.INFO,...t),this._logHandler(this,l.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,l.WARN,...t),this._logHandler(this,l.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,l.ERROR,...t),this._logHandler(this,l.ERROR,...t)}}const $t=(e,t)=>t.some(n=>e instanceof n);let me,be;function Pt(){return me||(me=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Lt(){return be||(be=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Pe=new WeakMap,Y=new WeakMap,Le=new WeakMap,x=new WeakMap,ne=new WeakMap;function Ft(e){const t=new Promise((n,r)=>{const i=()=>{e.removeEventListener("success",o),e.removeEventListener("error",s)},o=()=>{n(h(e.result)),i()},s=()=>{r(e.error),i()};e.addEventListener("success",o),e.addEventListener("error",s)});return t.then(n=>{n instanceof IDBCursor&&Pe.set(n,e)}).catch(()=>{}),ne.set(t,e),t}function xt(e){if(Y.has(e))return;const t=new Promise((n,r)=>{const i=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",s),e.removeEventListener("abort",s)},o=()=>{n(),i()},s=()=>{r(e.error||new DOMException("AbortError","AbortError")),i()};e.addEventListener("complete",o),e.addEventListener("error",s),e.addEventListener("abort",s)});Y.set(e,t)}let X={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Y.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Le.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return h(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Ht(e){X=e(X)}function jt(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(H(this),t,...n);return Le.set(r,t.sort?t.sort():[t]),h(r)}:Lt().includes(e)?function(...t){return e.apply(H(this),t),h(Pe.get(this))}:function(...t){return h(e.apply(H(this),t))}}function Vt(e){return typeof e=="function"?jt(e):(e instanceof IDBTransaction&&xt(e),$t(e,Pt())?new Proxy(e,X):e)}function h(e){if(e instanceof IDBRequest)return Ft(e);if(x.has(e))return x.get(e);const t=Vt(e);return t!==e&&(x.set(e,t),ne.set(t,e)),t}const H=e=>ne.get(e);function P(e,t,{blocked:n,upgrade:r,blocking:i,terminated:o}={}){const s=indexedDB.open(e,t),c=h(s);return r&&s.addEventListener("upgradeneeded",u=>{r(h(s.result),u.oldVersion,u.newVersion,h(s.transaction),u)}),n&&s.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),c.then(u=>{o&&u.addEventListener("close",()=>o()),i&&u.addEventListener("versionchange",a=>i(a.oldVersion,a.newVersion,a))}).catch(()=>{}),c}function j(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",r=>t(r.oldVersion,r)),h(n).then(()=>{})}const Ut=["get","getKey","getAll","getAllKeys","count"],Kt=["put","add","delete","clear"],V=new Map;function we(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(V.get(t))return V.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,i=Kt.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(i||Ut.includes(n)))return;const o=async function(s,...c){const u=this.transaction(s,i?"readwrite":"readonly");let a=u.store;return r&&(a=a.index(c.shift())),(await Promise.all([a[n](...c),i&&u.done]))[0]};return V.set(t,o),o}Ht(e=>({...e,get:(t,n,r)=>we(t,n)||e.get(t,n,r),has:(t,n)=>!!we(t,n)||e.has(t,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wt{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(qt(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function qt(e){const t=e.getComponent();return(t==null?void 0:t.type)==="VERSION"}const Z="@firebase/app",ye="0.14.12";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const p=new Rt("@firebase/app"),zt="@firebase/app-compat",Gt="@firebase/analytics-compat",Jt="@firebase/analytics",Yt="@firebase/app-check-compat",Xt="@firebase/app-check",Zt="@firebase/auth",Qt="@firebase/auth-compat",en="@firebase/database",tn="@firebase/data-connect",nn="@firebase/database-compat",rn="@firebase/functions",on="@firebase/functions-compat",sn="@firebase/installations",an="@firebase/installations-compat",cn="@firebase/messaging",un="@firebase/messaging-compat",ln="@firebase/performance",dn="@firebase/performance-compat",fn="@firebase/remote-config",hn="@firebase/remote-config-compat",pn="@firebase/storage",gn="@firebase/storage-compat",mn="@firebase/firestore",bn="@firebase/ai",wn="@firebase/firestore-compat",yn="firebase";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Q="[DEFAULT]",In={[Z]:"fire-core",[zt]:"fire-core-compat",[Jt]:"fire-analytics",[Gt]:"fire-analytics-compat",[Xt]:"fire-app-check",[Yt]:"fire-app-check-compat",[Zt]:"fire-auth",[Qt]:"fire-auth-compat",[en]:"fire-rtdb",[tn]:"fire-data-connect",[nn]:"fire-rtdb-compat",[rn]:"fire-fn",[on]:"fire-fn-compat",[sn]:"fire-iid",[an]:"fire-iid-compat",[cn]:"fire-fcm",[un]:"fire-fcm-compat",[ln]:"fire-perf",[dn]:"fire-perf-compat",[fn]:"fire-rc",[hn]:"fire-rc-compat",[pn]:"fire-gcs",[gn]:"fire-gcs-compat",[mn]:"fire-fst",[wn]:"fire-fst-compat",[bn]:"fire-vertex","fire-js":"fire-js",[yn]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const M=new Map,En=new Map,ee=new Map;function Ie(e,t){try{e.container.addComponent(t)}catch(n){p.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function S(e){const t=e.name;if(ee.has(t))return p.debug(`There were multiple attempts to register component ${t}.`),!1;ee.set(t,e);for(const n of M.values())Ie(n,e);for(const n of En.values())Ie(n,e);return!0}function re(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _n={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},g=new $("app","Firebase",_n);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(t,n,r){this._isDeleted=!1,this._options={...t},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new w("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw g.create("app-deleted",{appName:this._name})}}function Fe(e,t={}){let n=e;typeof t!="object"&&(t={name:t});const r={name:Q,automaticDataCollectionEnabled:!0,...t},i=r.name;if(typeof i!="string"||!i)throw g.create("bad-app-name",{appName:String(i)});if(n||(n=Ne()),!n)throw g.create("no-options");const o=M.get(i);if(o){if(J(n,o.options)&&J(r,o.config))return o;throw g.create("duplicate-app",{appName:i})}const s=new kt(i);for(const u of ee.values())s.addComponent(u);const c=new Sn(n,r,s);return M.set(i,c),c}function An(e=Q){const t=M.get(e);if(!t&&e===Q&&Ne())return Fe();if(!t)throw g.create("no-app",{appName:e});return t}function _(e,t,n){let r=In[e]??e;n&&(r+=`-${n}`);const i=r.match(/\s|\//),o=t.match(/\s|\//);if(i||o){const s=[`Unable to register library "${r}" with version "${t}":`];i&&s.push(`library name "${r}" contains illegal characters (whitespace or "/")`),i&&o&&s.push("and"),o&&s.push(`version name "${t}" contains illegal characters (whitespace or "/")`),p.warn(s.join(" "));return}S(new w(`${r}-version`,()=>({library:r,version:t}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tn="firebase-heartbeat-database",Dn=1,C="firebase-heartbeat-store";let U=null;function xe(){return U||(U=P(Tn,Dn,{upgrade:(e,t)=>{switch(t){case 0:try{e.createObjectStore(C)}catch(n){console.warn(n)}}}}).catch(e=>{throw g.create("idb-open",{originalErrorMessage:e.message})})),U}async function Cn(e){try{const n=(await xe()).transaction(C),r=await n.objectStore(C).get(He(e));return await n.done,r}catch(t){if(t instanceof A)p.warn(t.message);else{const n=g.create("idb-get",{originalErrorMessage:t==null?void 0:t.message});p.warn(n.message)}}}async function Ee(e,t){try{const r=(await xe()).transaction(C,"readwrite");await r.objectStore(C).put(t,He(e)),await r.done}catch(n){if(n instanceof A)p.warn(n.message);else{const r=g.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});p.warn(r.message)}}}function He(e){return`${e.name}!${e.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vn=1024,kn=30;class On{constructor(t){this.container=t,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new Nn(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var t,n;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),o=_e();if(((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===o||this._heartbeatsCache.heartbeats.some(s=>s.date===o))return;if(this._heartbeatsCache.heartbeats.push({date:o,agent:i}),this._heartbeatsCache.heartbeats.length>kn){const s=Bn(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){p.warn(r)}}async getHeartbeatsHeader(){var t;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=_e(),{heartbeatsToSend:r,unsentEntries:i}=Mn(this._heartbeatsCache.heartbeats),o=Me(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),o}catch(n){return p.warn(n),""}}}function _e(){return new Date().toISOString().substring(0,10)}function Mn(e,t=vn){const n=[];let r=e.slice();for(const i of e){const o=n.find(s=>s.agent===i.agent);if(o){if(o.dates.push(i.date),Se(n)>t){o.dates.pop();break}}else if(n.push({agent:i.agent,dates:[i.date]}),Se(n)>t){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class Nn{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Be()?Re().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await Cn(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return Ee(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return Ee(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...t.heartbeats]})}else return}}function Se(e){return Me(JSON.stringify({version:2,heartbeats:e})).length}function Bn(e){if(e.length===0)return-1;let t=0,n=e[0].date;for(let r=1;r<e.length;r++)e[r].date<n&&(n=e[r].date,t=r);return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rn(e){S(new w("platform-logger",t=>new Wt(t),"PRIVATE")),S(new w("heartbeat",t=>new On(t),"PRIVATE")),_(Z,ye,e),_(Z,ye,"esm2020"),_("fire-js","")}Rn("");var $n="firebase",Pn="12.13.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */_($n,Pn,"app");const je="@firebase/installations",ie="0.6.22";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ve=1e4,Ue=`w:${ie}`,Ke="FIS_v2",Ln="https://firebaseinstallations.googleapis.com/v1",Fn=3600*1e3,xn="installations",Hn="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jn={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},y=new $(xn,Hn,jn);function We(e){return e instanceof A&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qe({projectId:e}){return`${Ln}/projects/${e}/installations`}function ze(e){return{token:e.token,requestStatus:2,expiresIn:Un(e.expiresIn),creationTime:Date.now()}}async function Ge(e,t){const r=(await t.json()).error;return y.create("request-failed",{requestName:e,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Je({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Vn(e,{refreshToken:t}){const n=Je(e);return n.append("Authorization",Kn(t)),n}async function Ye(e){const t=await e();return t.status>=500&&t.status<600?e():t}function Un(e){return Number(e.replace("s","000"))}function Kn(e){return`${Ke} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wn({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const r=qe(e),i=Je(e),o=t.getImmediate({optional:!0});if(o){const a=await o.getHeartbeatsHeader();a&&i.append("x-firebase-client",a)}const s={fid:n,authVersion:Ke,appId:e.appId,sdkVersion:Ue},c={method:"POST",headers:i,body:JSON.stringify(s)},u=await Ye(()=>fetch(r,c));if(u.ok){const a=await u.json();return{fid:a.fid||n,registrationStatus:2,refreshToken:a.refreshToken,authToken:ze(a.authToken)}}else throw await Ge("Create Installation",u)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xe(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qn(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zn=/^[cdef][\w-]{21}$/,te="";function Gn(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Jn(e);return zn.test(n)?n:te}catch{return te}}function Jn(e){return qn(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function L(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ze=new Map;function Qe(e,t){const n=L(e);et(n,t),Yn(n,t)}function et(e,t){const n=Ze.get(e);if(n)for(const r of n)r(t)}function Yn(e,t){const n=Xn();n&&n.postMessage({key:e,fid:t}),Zn()}let b=null;function Xn(){return!b&&"BroadcastChannel"in self&&(b=new BroadcastChannel("[Firebase] FID Change"),b.onmessage=e=>{et(e.data.key,e.data.fid)}),b}function Zn(){Ze.size===0&&b&&(b.close(),b=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qn="firebase-installations-database",er=1,I="firebase-installations-store";let K=null;function oe(){return K||(K=P(Qn,er,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(I)}}})),K}async function N(e,t){const n=L(e),i=(await oe()).transaction(I,"readwrite"),o=i.objectStore(I),s=await o.get(n);return await o.put(t,n),await i.done,(!s||s.fid!==t.fid)&&Qe(e,t.fid),t}async function tt(e){const t=L(e),r=(await oe()).transaction(I,"readwrite");await r.objectStore(I).delete(t),await r.done}async function F(e,t){const n=L(e),i=(await oe()).transaction(I,"readwrite"),o=i.objectStore(I),s=await o.get(n),c=t(s);return c===void 0?await o.delete(n):await o.put(c,n),await i.done,c&&(!s||s.fid!==c.fid)&&Qe(e,c.fid),c}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function se(e){let t;const n=await F(e.appConfig,r=>{const i=tr(r),o=nr(e,i);return t=o.registrationPromise,o.installationEntry});return n.fid===te?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function tr(e){const t=e||{fid:Gn(),registrationStatus:0};return nt(t)}function nr(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const i=Promise.reject(y.create("app-offline"));return{installationEntry:t,registrationPromise:i}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},r=rr(e,n);return{installationEntry:n,registrationPromise:r}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:ir(e)}:{installationEntry:t}}async function rr(e,t){try{const n=await Wn(e,t);return N(e.appConfig,n)}catch(n){throw We(n)&&n.customData.serverCode===409?await tt(e.appConfig):await N(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function ir(e){let t=await Ae(e.appConfig);for(;t.registrationStatus===1;)await Xe(100),t=await Ae(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:r}=await se(e);return r||n}return t}function Ae(e){return F(e,t=>{if(!t)throw y.create("installation-not-found");return nt(t)})}function nt(e){return or(e)?{fid:e.fid,registrationStatus:0}:e}function or(e){return e.registrationStatus===1&&e.registrationTime+Ve<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function sr({appConfig:e,heartbeatServiceProvider:t},n){const r=ar(e,n),i=Vn(e,n),o=t.getImmediate({optional:!0});if(o){const a=await o.getHeartbeatsHeader();a&&i.append("x-firebase-client",a)}const s={installation:{sdkVersion:Ue,appId:e.appId}},c={method:"POST",headers:i,body:JSON.stringify(s)},u=await Ye(()=>fetch(r,c));if(u.ok){const a=await u.json();return ze(a)}else throw await Ge("Generate Auth Token",u)}function ar(e,{fid:t}){return`${qe(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ae(e,t=!1){let n;const r=await F(e.appConfig,o=>{if(!rt(o))throw y.create("not-registered");const s=o.authToken;if(!t&&lr(s))return o;if(s.requestStatus===1)return n=cr(e,t),o;{if(!navigator.onLine)throw y.create("app-offline");const c=fr(o);return n=ur(e,c),c}});return n?await n:r.authToken}async function cr(e,t){let n=await Te(e.appConfig);for(;n.authToken.requestStatus===1;)await Xe(100),n=await Te(e.appConfig);const r=n.authToken;return r.requestStatus===0?ae(e,t):r}function Te(e){return F(e,t=>{if(!rt(t))throw y.create("not-registered");const n=t.authToken;return hr(n)?{...t,authToken:{requestStatus:0}}:t})}async function ur(e,t){try{const n=await sr(e,t),r={...t,authToken:n};return await N(e.appConfig,r),n}catch(n){if(We(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await tt(e.appConfig);else{const r={...t,authToken:{requestStatus:0}};await N(e.appConfig,r)}throw n}}function rt(e){return e!==void 0&&e.registrationStatus===2}function lr(e){return e.requestStatus===2&&!dr(e)}function dr(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Fn}function fr(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function hr(e){return e.requestStatus===1&&e.requestTime+Ve<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function pr(e){const t=e,{installationEntry:n,registrationPromise:r}=await se(t);return r?r.catch(console.error):ae(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gr(e,t=!1){const n=e;return await mr(n),(await ae(n,t)).token}async function mr(e){const{registrationPromise:t}=await se(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function br(e){if(!e||!e.options)throw W("App Configuration");if(!e.name)throw W("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw W(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function W(e){return y.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const it="installations",wr="installations-internal",yr=e=>{const t=e.getProvider("app").getImmediate(),n=br(t),r=re(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},Ir=e=>{const t=e.getProvider("app").getImmediate(),n=re(t,it).getImmediate();return{getId:()=>pr(n),getToken:i=>gr(n,i)}};function Er(){S(new w(it,yr,"PUBLIC")),S(new w(wr,Ir,"PRIVATE"))}Er();_(je,ie);_(je,ie,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ot="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",_r="https://fcmregistrations.googleapis.com/v1",st="FCM_MSG",Sr="google.c.a.c_id",Ar=3,Tr=1;var B;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(B||(B={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var R;(function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"})(R||(R={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function f(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function Dr(e){const t="=".repeat((4-e.length%4)%4),n=(e+t).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(n),i=new Uint8Array(r.length);for(let o=0;o<r.length;++o)i[o]=r.charCodeAt(o);return i}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const q="fcm_token_details_db",Cr=5,De="fcm_token_object_Store";async function vr(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(o=>o.name).includes(q))return null;let t=null;return(await P(q,Cr,{upgrade:async(r,i,o,s)=>{if(i<2||!r.objectStoreNames.contains(De))return;const c=s.objectStore(De),u=await c.index("fcmSenderId").get(e);if(await c.clear(),!!u){if(i===2){const a=u;if(!a.auth||!a.p256dh||!a.endpoint)return;t={token:a.fcmToken,createTime:a.createTime??Date.now(),subscriptionOptions:{auth:a.auth,p256dh:a.p256dh,endpoint:a.endpoint,swScope:a.swScope,vapidKey:typeof a.vapidKey=="string"?a.vapidKey:f(a.vapidKey)}}}else if(i===3){const a=u;t={token:a.fcmToken,createTime:a.createTime,subscriptionOptions:{auth:f(a.auth),p256dh:f(a.p256dh),endpoint:a.endpoint,swScope:a.swScope,vapidKey:f(a.vapidKey)}}}else if(i===4){const a=u;t={token:a.fcmToken,createTime:a.createTime,subscriptionOptions:{auth:f(a.auth),p256dh:f(a.p256dh),endpoint:a.endpoint,swScope:a.swScope,vapidKey:f(a.vapidKey)}}}}}})).close(),await j(q),await j("fcm_vapid_details_db"),await j("undefined"),kr(t)?t:null}function kr(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof t.auth=="string"&&t.auth.length>0&&typeof t.p256dh=="string"&&t.p256dh.length>0&&typeof t.endpoint=="string"&&t.endpoint.length>0&&typeof t.swScope=="string"&&t.swScope.length>0&&typeof t.vapidKey=="string"&&t.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Or="firebase-messaging-database",Mr=1,E="firebase-messaging-store";let z=null;function ce(){return z||(z=P(Or,Mr,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(E)}}})),z}async function ue(e){const t=de(e),r=await(await ce()).transaction(E).objectStore(E).get(t);if(r)return r;{const i=await vr(e.appConfig.senderId);if(i)return await le(e,i),i}}async function le(e,t){const n=de(e),i=(await ce()).transaction(E,"readwrite");return await i.objectStore(E).put(t,n),await i.done,t}async function Nr(e){const t=de(e),r=(await ce()).transaction(E,"readwrite");await r.objectStore(E).delete(t),await r.done}function de({appConfig:e}){return e.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Br={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},d=new $("messaging","Messaging",Br);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rr(e,t){const n=await he(e),r=ct(t),i={method:"POST",headers:n,body:JSON.stringify(r)};let o;try{o=await(await fetch(fe(e.appConfig),i)).json()}catch(s){throw d.create("token-subscribe-failed",{errorInfo:s==null?void 0:s.toString()})}if(o.error){const s=o.error.message;throw d.create("token-subscribe-failed",{errorInfo:s})}if(!o.token)throw d.create("token-subscribe-no-token");return o.token}async function $r(e,t){const n=await he(e),r=ct(t.subscriptionOptions),i={method:"PATCH",headers:n,body:JSON.stringify(r)};let o;try{o=await(await fetch(`${fe(e.appConfig)}/${t.token}`,i)).json()}catch(s){throw d.create("token-update-failed",{errorInfo:s==null?void 0:s.toString()})}if(o.error){const s=o.error.message;throw d.create("token-update-failed",{errorInfo:s})}if(!o.token)throw d.create("token-update-no-token");return o.token}async function at(e,t){const r={method:"DELETE",headers:await he(e)};try{const o=await(await fetch(`${fe(e.appConfig)}/${t}`,r)).json();if(o.error){const s=o.error.message;throw d.create("token-unsubscribe-failed",{errorInfo:s})}}catch(i){throw d.create("token-unsubscribe-failed",{errorInfo:i==null?void 0:i.toString()})}}function fe({projectId:e}){return`${_r}/projects/${e}/registrations`}async function he({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function ct({p256dh:e,auth:t,endpoint:n,vapidKey:r}){const i={web:{endpoint:n,auth:t,p256dh:e}};return r!==ot&&(i.web.applicationPubKey=r),i}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pr=10080*60*1e3;async function Lr(e){const t=await xr(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:f(t.getKey("auth")),p256dh:f(t.getKey("p256dh"))},r=await ue(e.firebaseDependencies);if(r){if(Hr(r.subscriptionOptions,n))return Date.now()>=r.createTime+Pr?Fr(e,{token:r.token,createTime:Date.now(),subscriptionOptions:n}):r.token;try{await at(e.firebaseDependencies,r.token)}catch(i){console.warn(i)}return ve(e.firebaseDependencies,n)}else return ve(e.firebaseDependencies,n)}async function Ce(e){const t=await ue(e.firebaseDependencies);t&&(await at(e.firebaseDependencies,t.token),await Nr(e.firebaseDependencies));const n=await e.swRegistration.pushManager.getSubscription();return n?n.unsubscribe():!0}async function Fr(e,t){try{const n=await $r(e.firebaseDependencies,t),r={...t,token:n,createTime:Date.now()};return await le(e.firebaseDependencies,r),n}catch(n){throw n}}async function ve(e,t){const r={token:await Rr(e,t),createTime:Date.now(),subscriptionOptions:t};return await le(e,r),r.token}async function xr(e,t){const n=await e.pushManager.getSubscription();return n||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Dr(t)})}function Hr(e,t){const n=t.vapidKey===e.vapidKey,r=t.endpoint===e.endpoint,i=t.auth===e.auth,o=t.p256dh===e.p256dh;return n&&r&&i&&o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jr(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Vr(t,e),Ur(t,e),Kr(t,e),t}function Vr(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const r=t.notification.body;r&&(e.notification.body=r);const i=t.notification.image;i&&(e.notification.image=i);const o=t.notification.icon;o&&(e.notification.icon=o)}function Ur(e,t){t.data&&(e.data=t.data)}function Kr(e,t){var i,o,s,c;if(!t.fcmOptions&&!((i=t.notification)!=null&&i.click_action))return;e.fcmOptions={};const n=((o=t.fcmOptions)==null?void 0:o.link)??((s=t.notification)==null?void 0:s.click_action);n&&(e.fcmOptions.link=n);const r=(c=t.fcmOptions)==null?void 0:c.analytics_label;r&&(e.fcmOptions.analyticsLabel=r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wr(e){return typeof e=="object"&&!!e&&Sr in e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qr(e){return new Promise(t=>{setTimeout(t,e)})}async function zr(e,t){const n=Gr(t,await e.firebaseDependencies.installations.getId());Jr(e,n,t.productId)}function Gr(e,t){var r,i;const n={};return e.from&&(n.project_number=e.from),e.fcmMessageId&&(n.message_id=e.fcmMessageId),n.instance_id=t,e.notification?n.message_type=B.DISPLAY_NOTIFICATION.toString():n.message_type=B.DATA_MESSAGE.toString(),n.sdk_platform=Ar.toString(),n.package_name=self.origin.replace(/(^\w+:|^)\/\//,""),e.collapse_key&&(n.collapse_key=e.collapse_key),n.event=Tr.toString(),(r=e.fcmOptions)!=null&&r.analytics_label&&(n.analytics_label=(i=e.fcmOptions)==null?void 0:i.analytics_label),n}function Jr(e,t,n){const r={};r.event_time_ms=Math.floor(Date.now()).toString(),r.source_extension_json_proto3=JSON.stringify({messaging_client_event:t}),n&&(r.compliance_data=Yr(n)),e.logEvents.push(r)}function Yr(e){return{privacy_context:{prequest:{origin_associated_product_id:e}}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xr(e,t){var i;const{newSubscription:n}=e;if(!n){await Ce(t);return}const r=await ue(t.firebaseDependencies);await Ce(t),t.vapidKey=((i=r==null?void 0:r.subscriptionOptions)==null?void 0:i.vapidKey)??ot,await Lr(t)}async function Zr(e,t){const n=ti(e);if(!n)return;t.deliveryMetricsExportedToBigQueryEnabled&&await zr(t,n);const r=await ut();if(ri(r))return ii(r,n);if(n.notification&&await oi(ei(n)),!!t&&t.onBackgroundMessageHandler){const i=jr(n);typeof t.onBackgroundMessageHandler=="function"?await t.onBackgroundMessageHandler(i):t.onBackgroundMessageHandler.next(i)}}async function Qr(e){var s,c;const t=(c=(s=e.notification)==null?void 0:s.data)==null?void 0:c[st];if(t){if(e.action)return}else return;e.stopImmediatePropagation(),e.notification.close();const n=si(t);if(!n)return;const r=new URL(n,self.location.href),i=new URL(self.location.origin);if(r.host!==i.host)return;let o=await ni(r);if(o?o=await o.focus():(o=await self.clients.openWindow(n),await qr(3e3)),!!o)return t.messageType=R.NOTIFICATION_CLICKED,t.isFirebaseMessaging=!0,o.postMessage(t)}function ei(e){const t={...e.notification};return t.data={[st]:e},t}function ti({data:e}){if(!e)return null;try{return e.json()}catch{return null}}async function ni(e){const t=await ut();for(const n of t){const r=new URL(n.url,self.location.href);if(e.host===r.host)return n}return null}function ri(e){return e.some(t=>t.visibilityState==="visible"&&!t.url.startsWith("chrome-extension://"))}function ii(e,t){t.isFirebaseMessaging=!0,t.messageType=R.PUSH_RECEIVED;for(const n of e)n.postMessage(t)}function ut(){return self.clients.matchAll({type:"window",includeUncontrolled:!0})}function oi(e){const{actions:t}=e,{maxActions:n}=Notification;return t&&n&&t.length>n&&console.warn(`This browser only supports ${n} actions. The remaining actions will not be displayed.`),self.registration.showNotification(e.title??"",e)}function si(e){var n,r;const t=((n=e.fcmOptions)==null?void 0:n.link)??((r=e.notification)==null?void 0:r.click_action);return t||(Wr(e.data)?self.location.origin:null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ai(e){if(!e||!e.options)throw G("App Configuration Object");if(!e.name)throw G("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const r of t)if(!n[r])throw G(r);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}function G(e){return d.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ci{constructor(t,n,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const i=ai(t);this.firebaseDependencies={app:t,appConfig:i,installations:n,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ui=e=>{const t=new ci(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return self.addEventListener("push",n=>{n.waitUntil(Zr(n,t))}),self.addEventListener("pushsubscriptionchange",n=>{n.waitUntil(Xr(n,t))}),self.addEventListener("notificationclick",n=>{n.waitUntil(Qr(n))}),t};function li(){S(new w("messaging-sw",ui,"PUBLIC"))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function di(){return Be()&&await Re()&&"PushManager"in self&&"Notification"in self&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fi(e,t){if(self.document!==void 0)throw d.create("only-available-in-sw");return e.onBackgroundMessageHandler=t,()=>{e.onBackgroundMessageHandler=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hi(e=An()){return di().then(t=>{if(!t)throw d.create("unsupported-browser")},t=>{throw d.create("indexed-db-unsupported")}),re($e(e),"messaging-sw").getImmediate()}function pi(e,t){return e=$e(e),fi(e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */li();const D={apiKey:"AIzaSyAR7TmlpO7mjky9JDgtLzukMFd5f0lyRiI",authDomain:"ali-compras-a45b5.firebaseapp.com",projectId:"ali-compras-a45b5",storageBucket:"ali-compras-a45b5.firebasestorage.app",messagingSenderId:"437941991960",appId:"1:437941991960:web:3c1d6c89cff718e815e16d",measurementId:"G-ZV43RFEWZP"},lt="admin-delivery-push-v1",gi=[{"revision":"2f6bd6f1feb04dee50a613c8bcc68150","url":"offline.html"},{"revision":"f7654f76a5c347ff2ebabffe8a33cff2","url":"manifest.webmanifest"},{"revision":"c824caad4d2991901a0bee787bf8fd7d","url":"index.html"},{"revision":"a2b1b48474908a1739aba3cb1bdcb459","url":"icons/maskable-512x512.png"},{"revision":"8a13468f86d27326ee99425a41daa5b9","url":"icons/maskable-192x192.png"},{"revision":"1e01ca630779bb874a4a3de3e8761142","url":"icons/image.png"},{"revision":"0af328c04575d03d55fcc1eaf0d70468","url":"icons/icon-96x96.png"},{"revision":"b81f0934e5a5eb7d3f3a731d983136f4","url":"icons/icon-72x72.png"},{"revision":"b88244b236ae5b32d418dbff3d58040a","url":"icons/icon-512x512.png"},{"revision":"78544fb345bdf1afa96fd8806e157c39","url":"icons/icon-384x384.png"},{"revision":"d580d1e287fda06a62e00c506deaa957","url":"icons/icon-192x192.png"},{"revision":"2c95ff24d0fa43bf03ab4004d6a9b01c","url":"icons/icon-180x180.png"},{"revision":"5a71f5159fea7b88be38e74410950afe","url":"icons/icon-152x152.png"},{"revision":"cca7d2564a1aa36c37975438aaa11445","url":"icons/icon-144x144.png"},{"revision":"80fbffde59eaef42b0ffbc1f247ba116","url":"icons/icon-128x128.png"},{"revision":null,"url":"assets/notificationsService-BbzzFmJa.js"},{"revision":null,"url":"assets/index-IWKp4xWx.js"},{"revision":null,"url":"assets/index-BrCkNvX4.css"},{"revision":null,"url":"assets/NotificationsPage-D2JonXsc.js"}].map(e=>e.url);self.addEventListener("install",e=>{e.waitUntil(caches.open(lt).then(t=>t.addAll(gi)).then(()=>self.skipWaiting()))});self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(t=>Promise.all(t.filter(n=>n!==lt).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});self.addEventListener("fetch",e=>{e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin||e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(t=>t||caches.match("/index.html"))))});if(D.apiKey&&D.projectId&&D.messagingSenderId&&D.appId){const e=hi(Fe(D));pi(e,t=>{const n=t.data||{},r=n.title||"Nova notificação";self.registration.showNotification(r,{body:n.body,image:n.image_url||void 0,icon:"/icons/icon-192x192.png",data:n})})}self.addEventListener("notificationclick",e=>{var r;e.notification.close();const t=String(((r=e.notification.data)==null?void 0:r.route)||"/notifications"),n=new URL(t,self.location.origin).href;e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(async i=>{const o=i[0];return o?(await o.navigate(n),o.focus()):self.clients.openWindow(n)}))});
