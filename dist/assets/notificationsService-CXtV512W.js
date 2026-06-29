import{a as O}from"./index-BmsOxw9B.js";const pt=()=>{};var fe={};/**
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
 */const Ne=function(e){const t=[];let n=0;for(let r=0;r<e.length;r++){let a=e.charCodeAt(r);a<128?t[n++]=a:a<2048?(t[n++]=a>>6|192,t[n++]=a&63|128):(a&64512)===55296&&r+1<e.length&&(e.charCodeAt(r+1)&64512)===56320?(a=65536+((a&1023)<<10)+(e.charCodeAt(++r)&1023),t[n++]=a>>18|240,t[n++]=a>>12&63|128,t[n++]=a>>6&63|128,t[n++]=a&63|128):(t[n++]=a>>12|224,t[n++]=a>>6&63|128,t[n++]=a&63|128)}return t},gt=function(e){const t=[];let n=0,r=0;for(;n<e.length;){const a=e[n++];if(a<128)t[r++]=String.fromCharCode(a);else if(a>191&&a<224){const i=e[n++];t[r++]=String.fromCharCode((a&31)<<6|i&63)}else if(a>239&&a<365){const i=e[n++],o=e[n++],c=e[n++],u=((a&7)<<18|(i&63)<<12|(o&63)<<6|c&63)-65536;t[r++]=String.fromCharCode(55296+(u>>10)),t[r++]=String.fromCharCode(56320+(u&1023))}else{const i=e[n++],o=e[n++];t[r++]=String.fromCharCode((a&15)<<12|(i&63)<<6|o&63)}}return t.join("")},Me={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let a=0;a<e.length;a+=3){const i=e[a],o=a+1<e.length,c=o?e[a+1]:0,u=a+2<e.length,s=u?e[a+2]:0,N=i>>2,A=(i&3)<<4|c>>4;let M=(c&15)<<2|s>>6,B=s&63;u||(B=64,o||(M=64)),r.push(n[N],n[A],n[M],n[B])}return r.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(Ne(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):gt(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let a=0;a<e.length;){const i=n[e.charAt(a++)],c=a<e.length?n[e.charAt(a)]:0;++a;const s=a<e.length?n[e.charAt(a)]:64;++a;const A=a<e.length?n[e.charAt(a)]:64;if(++a,i==null||c==null||s==null||A==null)throw new mt;const M=i<<2|c>>4;if(r.push(M),s!==64){const B=c<<4&240|s>>2;if(r.push(B),A!==64){const ht=s<<6&192|A;r.push(ht)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class mt extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const bt=function(e){const t=Ne(e);return Me.encodeByteArray(t,!0)},Be=function(e){return bt(e).replace(/\./g,"")},wt=function(e){try{return Me.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
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
 */function yt(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const It=()=>yt().__FIREBASE_DEFAULTS__,Et=()=>{if(typeof process>"u"||typeof fe>"u")return;const e=fe.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},_t=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=e&&wt(e[1]);return t&&JSON.parse(t)},St=()=>{try{return pt()||It()||Et()||_t()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Re=()=>{var e;return(e=St())==null?void 0:e.config};/**
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
 */class At{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}wrapCallback(t){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(n):t(n,r))}}}function Pe(){try{return typeof indexedDB=="object"}catch{return!1}}function $e(){return new Promise((e,t)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",a=self.indexedDB.open(r);a.onsuccess=()=>{a.result.close(),n||self.indexedDB.deleteDatabase(r),e(!0)},a.onupgradeneeded=()=>{n=!1},a.onerror=()=>{var i;t(((i=a.error)==null?void 0:i.message)||"")}}catch(n){t(n)}})}function Tt(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
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
 */const vt="FirebaseError";class S extends Error{constructor(t,n,r){super(n),this.code=t,this.customData=r,this.name=vt,Object.setPrototypeOf(this,S.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,P.prototype.create)}}class P{constructor(t,n,r){this.service=t,this.serviceName=n,this.errors=r}create(t,...n){const r=n[0]||{},a=`${this.service}/${t}`,i=this.errors[t],o=i?Dt(i,r):"Error",c=`${this.serviceName}: ${o} (${a}).`;return new S(a,c,r)}}function Dt(e,t){return e.replace(Ct,(n,r)=>{const a=t[r];return a!=null?String(a):`<${r}?>`})}const Ct=/\{\$([^}]+)}/g;function J(e,t){if(e===t)return!0;const n=Object.keys(e),r=Object.keys(t);for(const a of n){if(!r.includes(a))return!1;const i=e[a],o=t[a];if(le(i)&&le(o)){if(!J(i,o))return!1}else if(i!==o)return!1}for(const a of r)if(!n.includes(a))return!1;return!0}function le(e){return e!==null&&typeof e=="object"}/**
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
 */function Fe(e){return e&&e._delegate?e._delegate:e}class b{constructor(t,n,r){this.name=t,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
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
 */const w="[DEFAULT]";/**
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
 */class kt{constructor(t,n){this.name=t,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const n=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(n)){const r=new At;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const a=this.getOrInitializeService({instanceIdentifier:n});a&&r.resolve(a)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(t){const n=this.normalizeInstanceIdentifier(t==null?void 0:t.identifier),r=(t==null?void 0:t.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(a){if(r)return null;throw a}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(Nt(t))try{this.getOrInitializeService({instanceIdentifier:w})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:a});r.resolve(i)}catch{}}}}clearInstance(t=w){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...t.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=w){return this.instances.has(t)}getOptions(t=w){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:n={}}=t,r=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const a=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[i,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(i);r===c&&o.resolve(a)}return a}onInit(t,n){const r=this.normalizeInstanceIdentifier(n),a=this.onInitCallbacks.get(r)??new Set;a.add(t),this.onInitCallbacks.set(r,a);const i=this.instances.get(r);return i&&t(i,r),()=>{a.delete(t)}}invokeOnInitCallbacks(t,n){const r=this.onInitCallbacks.get(n);if(r)for(const a of r)try{a(t,n)}catch{}}getOrInitializeService({instanceIdentifier:t,options:n={}}){let r=this.instances.get(t);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Ot(t),options:n}),this.instances.set(t,r),this.instancesOptions.set(t,n),this.invokeOnInitCallbacks(r,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,r)}catch{}return r||null}normalizeInstanceIdentifier(t=w){return this.component?this.component.multipleInstances?t:w:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Ot(e){return e===w?void 0:e}function Nt(e){return e.instantiationMode==="EAGER"}/**
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
 */class Mt{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const n=this.getProvider(t.name);if(n.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);n.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const n=new kt(t,this);return this.providers.set(t,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var d;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(d||(d={}));const Bt={debug:d.DEBUG,verbose:d.VERBOSE,info:d.INFO,warn:d.WARN,error:d.ERROR,silent:d.SILENT},Rt=d.INFO,Pt={[d.DEBUG]:"log",[d.VERBOSE]:"log",[d.INFO]:"info",[d.WARN]:"warn",[d.ERROR]:"error"},$t=(e,t,...n)=>{if(t<e.logLevel)return;const r=new Date().toISOString(),a=Pt[t];if(a)console[a](`[${r}]  ${e.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class Ft{constructor(t){this.name=t,this._logLevel=Rt,this._logHandler=$t,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in d))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?Bt[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,d.DEBUG,...t),this._logHandler(this,d.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,d.VERBOSE,...t),this._logHandler(this,d.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,d.INFO,...t),this._logHandler(this,d.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,d.WARN,...t),this._logHandler(this,d.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,d.ERROR,...t),this._logHandler(this,d.ERROR,...t)}}const Lt=(e,t)=>t.some(n=>e instanceof n);let he,pe;function Ht(){return he||(he=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function xt(){return pe||(pe=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Le=new WeakMap,Y=new WeakMap,He=new WeakMap,H=new WeakMap,ne=new WeakMap;function Vt(e){const t=new Promise((n,r)=>{const a=()=>{e.removeEventListener("success",i),e.removeEventListener("error",o)},i=()=>{n(h(e.result)),a()},o=()=>{r(e.error),a()};e.addEventListener("success",i),e.addEventListener("error",o)});return t.then(n=>{n instanceof IDBCursor&&Le.set(n,e)}).catch(()=>{}),ne.set(t,e),t}function jt(e){if(Y.has(e))return;const t=new Promise((n,r)=>{const a=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",o),e.removeEventListener("abort",o)},i=()=>{n(),a()},o=()=>{r(e.error||new DOMException("AbortError","AbortError")),a()};e.addEventListener("complete",i),e.addEventListener("error",o),e.addEventListener("abort",o)});Y.set(e,t)}let X={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return Y.get(e);if(t==="objectStoreNames")return e.objectStoreNames||He.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return h(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Kt(e){X=e(X)}function Ut(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const r=e.call(x(this),t,...n);return He.set(r,t.sort?t.sort():[t]),h(r)}:xt().includes(e)?function(...t){return e.apply(x(this),t),h(Le.get(this))}:function(...t){return h(e.apply(x(this),t))}}function Wt(e){return typeof e=="function"?Ut(e):(e instanceof IDBTransaction&&jt(e),Lt(e,Ht())?new Proxy(e,X):e)}function h(e){if(e instanceof IDBRequest)return Vt(e);if(H.has(e))return H.get(e);const t=Wt(e);return t!==e&&(H.set(e,t),ne.set(t,e)),t}const x=e=>ne.get(e);function $(e,t,{blocked:n,upgrade:r,blocking:a,terminated:i}={}){const o=indexedDB.open(e,t),c=h(o);return r&&o.addEventListener("upgradeneeded",u=>{r(h(o.result),u.oldVersion,u.newVersion,h(o.transaction),u)}),n&&o.addEventListener("blocked",u=>n(u.oldVersion,u.newVersion,u)),c.then(u=>{i&&u.addEventListener("close",()=>i()),a&&u.addEventListener("versionchange",s=>a(s.oldVersion,s.newVersion,s))}).catch(()=>{}),c}function V(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",r=>t(r.oldVersion,r)),h(n).then(()=>{})}const qt=["get","getKey","getAll","getAllKeys","count"],zt=["put","add","delete","clear"],j=new Map;function ge(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(j.get(t))return j.get(t);const n=t.replace(/FromIndex$/,""),r=t!==n,a=zt.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(a||qt.includes(n)))return;const i=async function(o,...c){const u=this.transaction(o,a?"readwrite":"readonly");let s=u.store;return r&&(s=s.index(c.shift())),(await Promise.all([s[n](...c),a&&u.done]))[0]};return j.set(t,i),i}Kt(e=>({...e,get:(t,n,r)=>ge(t,n)||e.get(t,n,r),has:(t,n)=>!!ge(t,n)||e.has(t,n)}));/**
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
 */class Gt{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Jt(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function Jt(e){const t=e.getComponent();return(t==null?void 0:t.type)==="VERSION"}const Z="@firebase/app",me="0.14.12";/**
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
 */const p=new Ft("@firebase/app"),Yt="@firebase/app-compat",Xt="@firebase/analytics-compat",Zt="@firebase/analytics",Qt="@firebase/app-check-compat",en="@firebase/app-check",tn="@firebase/auth",nn="@firebase/auth-compat",rn="@firebase/database",an="@firebase/data-connect",on="@firebase/database-compat",sn="@firebase/functions",cn="@firebase/functions-compat",un="@firebase/installations",dn="@firebase/installations-compat",fn="@firebase/messaging",ln="@firebase/messaging-compat",hn="@firebase/performance",pn="@firebase/performance-compat",gn="@firebase/remote-config",mn="@firebase/remote-config-compat",bn="@firebase/storage",wn="@firebase/storage-compat",yn="@firebase/firestore",In="@firebase/ai",En="@firebase/firestore-compat",_n="firebase";/**
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
 */const Q="[DEFAULT]",Sn={[Z]:"fire-core",[Yt]:"fire-core-compat",[Zt]:"fire-analytics",[Xt]:"fire-analytics-compat",[en]:"fire-app-check",[Qt]:"fire-app-check-compat",[tn]:"fire-auth",[nn]:"fire-auth-compat",[rn]:"fire-rtdb",[an]:"fire-data-connect",[on]:"fire-rtdb-compat",[sn]:"fire-fn",[cn]:"fire-fn-compat",[un]:"fire-iid",[dn]:"fire-iid-compat",[fn]:"fire-fcm",[ln]:"fire-fcm-compat",[hn]:"fire-perf",[pn]:"fire-perf-compat",[gn]:"fire-rc",[mn]:"fire-rc-compat",[bn]:"fire-gcs",[wn]:"fire-gcs-compat",[yn]:"fire-fst",[En]:"fire-fst-compat",[In]:"fire-vertex","fire-js":"fire-js",[_n]:"fire-js-all"};/**
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
 */const v=new Map,An=new Map,ee=new Map;function be(e,t){try{e.container.addComponent(t)}catch(n){p.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function I(e){const t=e.name;if(ee.has(t))return p.debug(`There were multiple attempts to register component ${t}.`),!1;ee.set(t,e);for(const n of v.values())be(n,e);for(const n of An.values())be(n,e);return!0}function re(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}/**
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
 */const Tn={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},g=new P("app","Firebase",Tn);/**
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
 */class vn{constructor(t,n,r){this._isDeleted=!1,this._options={...t},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new b("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw g.create("app-deleted",{appName:this._name})}}function xe(e,t={}){let n=e;typeof t!="object"&&(t={name:t});const r={name:Q,automaticDataCollectionEnabled:!0,...t},a=r.name;if(typeof a!="string"||!a)throw g.create("bad-app-name",{appName:String(a)});if(n||(n=Re()),!n)throw g.create("no-options");const i=v.get(a);if(i){if(J(n,i.options)&&J(r,i.config))return i;throw g.create("duplicate-app",{appName:a})}const o=new Mt(a);for(const u of ee.values())o.addComponent(u);const c=new vn(n,r,o);return v.set(a,c),c}function Dn(e=Q){const t=v.get(e);if(!t&&e===Q&&Re())return xe();if(!t)throw g.create("no-app",{appName:e});return t}function Cn(){return Array.from(v.values())}function m(e,t,n){let r=Sn[e]??e;n&&(r+=`-${n}`);const a=r.match(/\s|\//),i=t.match(/\s|\//);if(a||i){const o=[`Unable to register library "${r}" with version "${t}":`];a&&o.push(`library name "${r}" contains illegal characters (whitespace or "/")`),a&&i&&o.push("and"),i&&o.push(`version name "${t}" contains illegal characters (whitespace or "/")`),p.warn(o.join(" "));return}I(new b(`${r}-version`,()=>({library:r,version:t}),"VERSION"))}/**
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
 */const kn="firebase-heartbeat-database",On=1,D="firebase-heartbeat-store";let K=null;function Ve(){return K||(K=$(kn,On,{upgrade:(e,t)=>{switch(t){case 0:try{e.createObjectStore(D)}catch(n){console.warn(n)}}}}).catch(e=>{throw g.create("idb-open",{originalErrorMessage:e.message})})),K}async function Nn(e){try{const n=(await Ve()).transaction(D),r=await n.objectStore(D).get(je(e));return await n.done,r}catch(t){if(t instanceof S)p.warn(t.message);else{const n=g.create("idb-get",{originalErrorMessage:t==null?void 0:t.message});p.warn(n.message)}}}async function we(e,t){try{const r=(await Ve()).transaction(D,"readwrite");await r.objectStore(D).put(t,je(e)),await r.done}catch(n){if(n instanceof S)p.warn(n.message);else{const r=g.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});p.warn(r.message)}}}function je(e){return`${e.name}!${e.options.appId}`}/**
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
 */const Mn=1024,Bn=30;class Rn{constructor(t){this.container=t,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new $n(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var t,n;try{const a=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),i=ye();if(((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===i||this._heartbeatsCache.heartbeats.some(o=>o.date===i))return;if(this._heartbeatsCache.heartbeats.push({date:i,agent:a}),this._heartbeatsCache.heartbeats.length>Bn){const o=Fn(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){p.warn(r)}}async getHeartbeatsHeader(){var t;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=ye(),{heartbeatsToSend:r,unsentEntries:a}=Pn(this._heartbeatsCache.heartbeats),i=Be(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,a.length>0?(this._heartbeatsCache.heartbeats=a,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),i}catch(n){return p.warn(n),""}}}function ye(){return new Date().toISOString().substring(0,10)}function Pn(e,t=Mn){const n=[];let r=e.slice();for(const a of e){const i=n.find(o=>o.agent===a.agent);if(i){if(i.dates.push(a.date),Ie(n)>t){i.dates.pop();break}}else if(n.push({agent:a.agent,dates:[a.date]}),Ie(n)>t){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class $n{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Pe()?$e().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await Nn(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return we(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return we(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...t.heartbeats]})}else return}}function Ie(e){return Be(JSON.stringify({version:2,heartbeats:e})).length}function Fn(e){if(e.length===0)return-1;let t=0,n=e[0].date;for(let r=1;r<e.length;r++)e[r].date<n&&(n=e[r].date,t=r);return t}/**
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
 */function Ln(e){I(new b("platform-logger",t=>new Gt(t),"PRIVATE")),I(new b("heartbeat",t=>new Rn(t),"PRIVATE")),m(Z,me,e),m(Z,me,"esm2020"),m("fire-js","")}Ln("");var Hn="firebase",xn="12.13.0";/**
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
 */m(Hn,xn,"app");const Ke="@firebase/installations",ae="0.6.22";/**
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
 */const Ue=1e4,We=`w:${ae}`,qe="FIS_v2",Vn="https://firebaseinstallations.googleapis.com/v1",jn=3600*1e3,Kn="installations",Un="Installations";/**
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
 */const Wn={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},E=new P(Kn,Un,Wn);function ze(e){return e instanceof S&&e.code.includes("request-failed")}/**
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
 */function Ge({projectId:e}){return`${Vn}/projects/${e}/installations`}function Je(e){return{token:e.token,requestStatus:2,expiresIn:zn(e.expiresIn),creationTime:Date.now()}}async function Ye(e,t){const r=(await t.json()).error;return E.create("request-failed",{requestName:e,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Xe({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function qn(e,{refreshToken:t}){const n=Xe(e);return n.append("Authorization",Gn(t)),n}async function Ze(e){const t=await e();return t.status>=500&&t.status<600?e():t}function zn(e){return Number(e.replace("s","000"))}function Gn(e){return`${qe} ${e}`}/**
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
 */async function Jn({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const r=Ge(e),a=Xe(e),i=t.getImmediate({optional:!0});if(i){const s=await i.getHeartbeatsHeader();s&&a.append("x-firebase-client",s)}const o={fid:n,authVersion:qe,appId:e.appId,sdkVersion:We},c={method:"POST",headers:a,body:JSON.stringify(o)},u=await Ze(()=>fetch(r,c));if(u.ok){const s=await u.json();return{fid:s.fid||n,registrationStatus:2,refreshToken:s.refreshToken,authToken:Je(s.authToken)}}else throw await Ye("Create Installation",u)}/**
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
 */function Qe(e){return new Promise(t=>{setTimeout(t,e)})}/**
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
 */function Yn(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
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
 */const Xn=/^[cdef][\w-]{21}$/,te="";function Zn(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Qn(e);return Xn.test(n)?n:te}catch{return te}}function Qn(e){return Yn(e).substr(0,22)}/**
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
 */function F(e){return`${e.appName}!${e.appId}`}/**
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
 */const et=new Map;function tt(e,t){const n=F(e);nt(n,t),er(n,t)}function nt(e,t){const n=et.get(e);if(n)for(const r of n)r(t)}function er(e,t){const n=tr();n&&n.postMessage({key:e,fid:t}),nr()}let y=null;function tr(){return!y&&"BroadcastChannel"in self&&(y=new BroadcastChannel("[Firebase] FID Change"),y.onmessage=e=>{nt(e.data.key,e.data.fid)}),y}function nr(){et.size===0&&y&&(y.close(),y=null)}/**
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
 */const rr="firebase-installations-database",ar=1,_="firebase-installations-store";let U=null;function ie(){return U||(U=$(rr,ar,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(_)}}})),U}async function R(e,t){const n=F(e),a=(await ie()).transaction(_,"readwrite"),i=a.objectStore(_),o=await i.get(n);return await i.put(t,n),await a.done,(!o||o.fid!==t.fid)&&tt(e,t.fid),t}async function rt(e){const t=F(e),r=(await ie()).transaction(_,"readwrite");await r.objectStore(_).delete(t),await r.done}async function L(e,t){const n=F(e),a=(await ie()).transaction(_,"readwrite"),i=a.objectStore(_),o=await i.get(n),c=t(o);return c===void 0?await i.delete(n):await i.put(c,n),await a.done,c&&(!o||o.fid!==c.fid)&&tt(e,c.fid),c}/**
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
 */async function oe(e){let t;const n=await L(e.appConfig,r=>{const a=ir(r),i=or(e,a);return t=i.registrationPromise,i.installationEntry});return n.fid===te?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function ir(e){const t=e||{fid:Zn(),registrationStatus:0};return at(t)}function or(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const a=Promise.reject(E.create("app-offline"));return{installationEntry:t,registrationPromise:a}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},r=sr(e,n);return{installationEntry:n,registrationPromise:r}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:cr(e)}:{installationEntry:t}}async function sr(e,t){try{const n=await Jn(e,t);return R(e.appConfig,n)}catch(n){throw ze(n)&&n.customData.serverCode===409?await rt(e.appConfig):await R(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function cr(e){let t=await Ee(e.appConfig);for(;t.registrationStatus===1;)await Qe(100),t=await Ee(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:r}=await oe(e);return r||n}return t}function Ee(e){return L(e,t=>{if(!t)throw E.create("installation-not-found");return at(t)})}function at(e){return ur(e)?{fid:e.fid,registrationStatus:0}:e}function ur(e){return e.registrationStatus===1&&e.registrationTime+Ue<Date.now()}/**
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
 */async function dr({appConfig:e,heartbeatServiceProvider:t},n){const r=fr(e,n),a=qn(e,n),i=t.getImmediate({optional:!0});if(i){const s=await i.getHeartbeatsHeader();s&&a.append("x-firebase-client",s)}const o={installation:{sdkVersion:We,appId:e.appId}},c={method:"POST",headers:a,body:JSON.stringify(o)},u=await Ze(()=>fetch(r,c));if(u.ok){const s=await u.json();return Je(s)}else throw await Ye("Generate Auth Token",u)}function fr(e,{fid:t}){return`${Ge(e)}/${t}/authTokens:generate`}/**
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
 */async function se(e,t=!1){let n;const r=await L(e.appConfig,i=>{if(!it(i))throw E.create("not-registered");const o=i.authToken;if(!t&&pr(o))return i;if(o.requestStatus===1)return n=lr(e,t),i;{if(!navigator.onLine)throw E.create("app-offline");const c=mr(i);return n=hr(e,c),c}});return n?await n:r.authToken}async function lr(e,t){let n=await _e(e.appConfig);for(;n.authToken.requestStatus===1;)await Qe(100),n=await _e(e.appConfig);const r=n.authToken;return r.requestStatus===0?se(e,t):r}function _e(e){return L(e,t=>{if(!it(t))throw E.create("not-registered");const n=t.authToken;return br(n)?{...t,authToken:{requestStatus:0}}:t})}async function hr(e,t){try{const n=await dr(e,t),r={...t,authToken:n};return await R(e.appConfig,r),n}catch(n){if(ze(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await rt(e.appConfig);else{const r={...t,authToken:{requestStatus:0}};await R(e.appConfig,r)}throw n}}function it(e){return e!==void 0&&e.registrationStatus===2}function pr(e){return e.requestStatus===2&&!gr(e)}function gr(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+jn}function mr(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function br(e){return e.requestStatus===1&&e.requestTime+Ue<Date.now()}/**
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
 */async function wr(e){const t=e,{installationEntry:n,registrationPromise:r}=await oe(t);return r?r.catch(console.error):se(t).catch(console.error),n.fid}/**
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
 */async function yr(e,t=!1){const n=e;return await Ir(n),(await se(n,t)).token}async function Ir(e){const{registrationPromise:t}=await oe(e);t&&await t}/**
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
 */function Er(e){if(!e||!e.options)throw W("App Configuration");if(!e.name)throw W("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw W(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function W(e){return E.create("missing-app-config-values",{valueName:e})}/**
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
 */const ot="installations",_r="installations-internal",Sr=e=>{const t=e.getProvider("app").getImmediate(),n=Er(t),r=re(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},Ar=e=>{const t=e.getProvider("app").getImmediate(),n=re(t,ot).getImmediate();return{getId:()=>wr(n),getToken:a=>yr(n,a)}};function Tr(){I(new b(ot,Sr,"PUBLIC")),I(new b(_r,Ar,"PRIVATE"))}Tr();m(Ke,ae);m(Ke,ae,"esm2020");/**
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
 */const vr="/firebase-messaging-sw.js",Dr="/firebase-cloud-messaging-push-scope",st="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",Cr="https://fcmregistrations.googleapis.com/v1",ct="google.c.a.c_id",kr="google.c.a.c_l",Or="google.c.a.ts",Nr="google.c.a.e",Se=1e4;var Ae;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Ae||(Ae={}));/**
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
 */var C;(function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"})(C||(C={}));/**
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
 */function l(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function Mr(e){const t="=".repeat((4-e.length%4)%4),n=(e+t).replace(/\-/g,"+").replace(/_/g,"/"),r=atob(n),a=new Uint8Array(r.length);for(let i=0;i<r.length;++i)a[i]=r.charCodeAt(i);return a}/**
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
 */const q="fcm_token_details_db",Br=5,Te="fcm_token_object_Store";async function Rr(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(q))return null;let t=null;return(await $(q,Br,{upgrade:async(r,a,i,o)=>{if(a<2||!r.objectStoreNames.contains(Te))return;const c=o.objectStore(Te),u=await c.index("fcmSenderId").get(e);if(await c.clear(),!!u){if(a===2){const s=u;if(!s.auth||!s.p256dh||!s.endpoint)return;t={token:s.fcmToken,createTime:s.createTime??Date.now(),subscriptionOptions:{auth:s.auth,p256dh:s.p256dh,endpoint:s.endpoint,swScope:s.swScope,vapidKey:typeof s.vapidKey=="string"?s.vapidKey:l(s.vapidKey)}}}else if(a===3){const s=u;t={token:s.fcmToken,createTime:s.createTime,subscriptionOptions:{auth:l(s.auth),p256dh:l(s.p256dh),endpoint:s.endpoint,swScope:s.swScope,vapidKey:l(s.vapidKey)}}}else if(a===4){const s=u;t={token:s.fcmToken,createTime:s.createTime,subscriptionOptions:{auth:l(s.auth),p256dh:l(s.p256dh),endpoint:s.endpoint,swScope:s.swScope,vapidKey:l(s.vapidKey)}}}}}})).close(),await V(q),await V("fcm_vapid_details_db"),await V("undefined"),Pr(t)?t:null}function Pr(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof t.auth=="string"&&t.auth.length>0&&typeof t.p256dh=="string"&&t.p256dh.length>0&&typeof t.endpoint=="string"&&t.endpoint.length>0&&typeof t.swScope=="string"&&t.swScope.length>0&&typeof t.vapidKey=="string"&&t.vapidKey.length>0}/**
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
 */const $r="firebase-messaging-database",Fr=1,k="firebase-messaging-store";let z=null;function ut(){return z||(z=$($r,Fr,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(k)}}})),z}async function Lr(e){const t=dt(e),r=await(await ut()).transaction(k).objectStore(k).get(t);if(r)return r;{const a=await Rr(e.appConfig.senderId);if(a)return await ce(e,a),a}}async function ce(e,t){const n=dt(e),a=(await ut()).transaction(k,"readwrite");return await a.objectStore(k).put(t,n),await a.done,t}function dt({appConfig:e}){return e.appId}/**
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
 */const Hr={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},f=new P("messaging","Messaging",Hr);/**
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
 */async function xr(e,t){const n=await de(e),r=ft(t),a={method:"POST",headers:n,body:JSON.stringify(r)};let i;try{i=await(await fetch(ue(e.appConfig),a)).json()}catch(o){throw f.create("token-subscribe-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw f.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw f.create("token-subscribe-no-token");return i.token}async function Vr(e,t){const n=await de(e),r=ft(t.subscriptionOptions),a={method:"PATCH",headers:n,body:JSON.stringify(r)};let i;try{i=await(await fetch(`${ue(e.appConfig)}/${t.token}`,a)).json()}catch(o){throw f.create("token-update-failed",{errorInfo:o==null?void 0:o.toString()})}if(i.error){const o=i.error.message;throw f.create("token-update-failed",{errorInfo:o})}if(!i.token)throw f.create("token-update-no-token");return i.token}async function jr(e,t){const r={method:"DELETE",headers:await de(e)};try{const i=await(await fetch(`${ue(e.appConfig)}/${t}`,r)).json();if(i.error){const o=i.error.message;throw f.create("token-unsubscribe-failed",{errorInfo:o})}}catch(a){throw f.create("token-unsubscribe-failed",{errorInfo:a==null?void 0:a.toString()})}}function ue({projectId:e}){return`${Cr}/projects/${e}/registrations`}async function de({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function ft({p256dh:e,auth:t,endpoint:n,vapidKey:r}){const a={web:{endpoint:n,auth:t,p256dh:e}};return r!==st&&(a.web.applicationPubKey=r),a}/**
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
 */const Kr=10080*60*1e3;async function Ur(e){const t=await qr(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:l(t.getKey("auth")),p256dh:l(t.getKey("p256dh"))},r=await Lr(e.firebaseDependencies);if(r){if(zr(r.subscriptionOptions,n))return Date.now()>=r.createTime+Kr?Wr(e,{token:r.token,createTime:Date.now(),subscriptionOptions:n}):r.token;try{await jr(e.firebaseDependencies,r.token)}catch(a){console.warn(a)}return ve(e.firebaseDependencies,n)}else return ve(e.firebaseDependencies,n)}async function Wr(e,t){try{const n=await Vr(e.firebaseDependencies,t),r={...t,token:n,createTime:Date.now()};return await ce(e.firebaseDependencies,r),n}catch(n){throw n}}async function ve(e,t){const r={token:await xr(e,t),createTime:Date.now(),subscriptionOptions:t};return await ce(e,r),r.token}async function qr(e,t){const n=await e.pushManager.getSubscription();return n||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:Mr(t)})}function zr(e,t){const n=t.vapidKey===e.vapidKey,r=t.endpoint===e.endpoint,a=t.auth===e.auth,i=t.p256dh===e.p256dh;return n&&r&&a&&i}/**
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
 */function De(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Gr(t,e),Jr(t,e),Yr(t,e),t}function Gr(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const r=t.notification.body;r&&(e.notification.body=r);const a=t.notification.image;a&&(e.notification.image=a);const i=t.notification.icon;i&&(e.notification.icon=i)}function Jr(e,t){t.data&&(e.data=t.data)}function Yr(e,t){var a,i,o,c;if(!t.fcmOptions&&!((a=t.notification)!=null&&a.click_action))return;e.fcmOptions={};const n=((i=t.fcmOptions)==null?void 0:i.link)??((o=t.notification)==null?void 0:o.click_action);n&&(e.fcmOptions.link=n);const r=(c=t.fcmOptions)==null?void 0:c.analytics_label;r&&(e.fcmOptions.analyticsLabel=r)}/**
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
 */function Xr(e){return typeof e=="object"&&!!e&&ct in e}/**
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
 */function Zr(e){if(!e||!e.options)throw G("App Configuration Object");if(!e.name)throw G("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const r of t)if(!n[r])throw G(r);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}function G(e){return f.create("missing-app-config-values",{valueName:e})}/**
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
 */class Qr{constructor(t,n,r){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const a=Zr(t);this.firebaseDependencies={app:t,appConfig:a,installations:n,analyticsProvider:r}}_delete(){return Promise.resolve()}}/**
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
 */async function ea(e){try{e.swRegistration=await navigator.serviceWorker.register(vr,{scope:Dr}),e.swRegistration.update().catch(()=>{}),await ta(e.swRegistration)}catch(t){throw f.create("failed-service-worker-registration",{browserErrorMessage:t==null?void 0:t.message})}}async function ta(e){return new Promise((t,n)=>{const r=setTimeout(()=>n(new Error(`Service worker not registered after ${Se} ms`)),Se),a=e.installing||e.waiting;e.active?(clearTimeout(r),t()):a?a.onstatechange=i=>{var o;((o=i.target)==null?void 0:o.state)==="activated"&&(a.onstatechange=null,clearTimeout(r),t())}:(clearTimeout(r),n(new Error("No incoming service worker found.")))})}/**
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
 */async function na(e,t){if(!t&&!e.swRegistration&&await ea(e),!(!t&&e.swRegistration)){if(!(t instanceof ServiceWorkerRegistration))throw f.create("invalid-sw-registration");e.swRegistration=t}}/**
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
 */async function ra(e,t){t?e.vapidKey=t:e.vapidKey||(e.vapidKey=st)}/**
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
 */async function aa(e,t){if(!navigator)throw f.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw f.create("permission-blocked");return await ra(e,t==null?void 0:t.vapidKey),await na(e,t==null?void 0:t.serviceWorkerRegistration),Ur(e)}/**
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
 */async function ia(e,t,n){const r=oa(t);(await e.firebaseDependencies.analyticsProvider.get()).logEvent(r,{message_id:n[ct],message_name:n[kr],message_time:n[Or],message_device_time:Math.floor(Date.now()/1e3)})}function oa(e){switch(e){case C.NOTIFICATION_CLICKED:return"notification_open";case C.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
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
 */async function sa(e,t){const n=t.data;if(!n.isFirebaseMessaging)return;e.onMessageHandler&&n.messageType===C.PUSH_RECEIVED&&(typeof e.onMessageHandler=="function"?e.onMessageHandler(De(n)):e.onMessageHandler.next(De(n)));const r=n.data;Xr(r)&&r[Nr]==="1"&&await ia(e,n.messageType,r)}const Ce="@firebase/messaging",ke="0.12.26";/**
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
 */const ca=e=>{const t=new Qr(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",n=>sa(t,n)),t},ua=e=>{const t=e.getProvider("messaging").getImmediate();return{getToken:r=>aa(t,r)}};function da(){I(new b("messaging",ca,"PUBLIC")),I(new b("messaging-internal",ua,"PRIVATE")),m(Ce,ke),m(Ce,ke,"esm2020")}/**
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
 */async function lt(){try{await $e()}catch{return!1}return typeof window<"u"&&Pe()&&Tt()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
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
 */function fa(e,t){if(!navigator)throw f.create("only-available-in-window");return e.onMessageHandler=t,()=>{e.onMessageHandler=null}}/**
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
 */function la(e=Dn()){return lt().then(t=>{if(!t)throw f.create("unsupported-browser")},t=>{throw f.create("indexed-db-unsupported")}),re(Fe(e),"messaging").getImmediate()}function ha(e,t){return e=Fe(e),fa(e,t)}da();const T={apiKey:"AIzaSyAR7TmlpO7mjky9JDgtLzukMFd5f0lyRiI",authDomain:"ali-compras-a45b5.firebaseapp.com",projectId:"ali-compras-a45b5",storageBucket:"ali-compras-a45b5.firebasestorage.app",messagingSenderId:"437941991960",appId:"1:437941991960:web:3c1d6c89cff718e815e16d",measurementId:"G-ZV43RFEWZP"},Oe="admin_notification_fcm_token",pa=()=>!!(T.apiKey&&T.projectId&&T.messagingSenderId&&T.appId);async function ga(){if(!pa()||!await lt())return null;const e=Cn()[0]||xe(T);return la(e)}async function ba(){throw!("Notification"in window)||!("serviceWorker"in navigator)?new Error("Este navegador não suporta notificações push."):new Error("A chave VITE_FIREBASE_VAPID_KEY não foi incluída no build do painel admin.")}async function wa(){const e=localStorage.getItem(Oe);if(e)try{await O.post("/notifications/deactivate-device",{fcm_token:e})}finally{localStorage.removeItem(Oe)}}async function ya(e){const t=await ga();return t?ha(t,n=>{window.dispatchEvent(new CustomEvent("notification-received",{detail:n.data})),e(n)}):()=>{}}async function Ia(){return(await O.get("/notifications")).data.data||[]}async function Ea(e){return(await O.patch(`/notifications/${e}/read`)).data.data}async function _a(){return(await O.get("/tenant/notifications/campaigns")).data.data||[]}async function Sa(e){return(await O.post("/tenant/notifications/campaigns",e)).data.data}export{Sa as createCampaign,wa as disableAdminPush,ba as enableAdminPush,_a as fetchCampaigns,Ia as fetchNotifications,ya as listenForAdminPush,Ea as readNotification};
