const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict'),test=require('node:test');
const compiled=ts.transpileModule(fs.readFileSync('components/chatbot/Chatbot.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function setup(initialStatus = 'signed-in') {
 const states=[],listeners=new Map(),calls=[];let status=initialStatus,expires=false;
 class E {constructor(type,options={}){this.type=type;this.detail=options.detail;}}
 class AuthError extends Error {}
 const window={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(){},dispatchEvent(event){listeners.get(event.type)?.(event);}};
 const ctx=vm.createContext({exports:{},crypto:require("node:crypto"),window,Event:E,CustomEvent:E,queueMicrotask,require(name){
  if(name==='react')return {useState(initial){const i=states.length;states.push(initial);return [initial,value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef:current=>({current}),useEffect:fn=>fn()};
  if(name==='next/navigation')return {usePathname:()=>'/'};
  if(name==='@/public/tnb-logo.png')return '/tnb-logo.png';
  if(name==='next/image')return ({src,alt,width,height})=>require('react').createElement('img',{src,alt,width,height});
  if(name==='@/lib/use-copilot-auth')return {useCopilotAuth:()=>({status})};
  if(name.endsWith('.css'))return {};
  if(name==='@/services/chatbot-service')return {CopilotAuthRequiredError:AuthError,checkCopilotAuth:async()=>({status}),sendChatMessage:async(text)=>{calls.push(text);if(expires){status='session-expired';throw new AuthError();}return {text:'Reply'};},requestCopilotRecommendations:async()=>{calls.push("get_recommendation");return {text:"Background reply",recommendationsPayload:{recommendations:[]}};},signInToCopilot:async()=>{},submitChatConsent:async()=>({text:'Consent reply'})};
  return require(name);
 }});
 vm.runInContext(compiled,ctx);const tree=ctx.exports.default({});
 return {tree,states,calls,window,E,setStatus:value=>status=value,setExpiry:value=>expires=value,messages:()=>states.find(Array.isArray)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('expired foreground message is shown once and resumed once after explicit sign-in',async()=>{
 const env=setup();env.setExpiry(true);env.window.dispatchEvent(new env.E('energy-chatbot-send',{detail:'Question'}));await tick();
 assert.equal(env.messages().filter(m=>m.sender==='user').length,1);assert.equal(env.messages().filter(m=>m.sender==='assistant').length,0);
 env.setStatus('signed-in');env.setExpiry(false);env.window.dispatchEvent(new env.E('copilot-authenticated'));await tick();
 assert.equal(env.calls.length,2);assert.equal(env.messages().filter(m=>m.sender==='user').length,1);assert.equal(env.messages().filter(m=>m.sender==='assistant').length,1);
 env.window.dispatchEvent(new env.E('copilot-authenticated'));await tick();assert.equal(env.calls.length,2);
});
test('background requests wait for authentication and stay out of chat history',async()=>{
 const env=setup();env.setStatus('signed-out');env.window.dispatchEvent(new env.E('energy-chatbot-send',{detail:{message:'get_recommendation',background:true}}));await tick();
 assert.equal(env.calls.length,0);assert.equal(env.messages().length,0);
 env.setStatus('signed-in');env.window.dispatchEvent(new env.E('copilot-authenticated'));await tick();
 assert.equal(env.calls.length,1);assert.equal(env.messages().length,0);
});
test('server markup excludes the composer until authentication is verified',()=>{
 const {renderToStaticMarkup}=require('react-dom/server');
 for(const status of ['checking','signed-out','session-expired','signing-in','error']) {
  const html=renderToStaticMarkup(setup(status).tree);
  assert.ok(!html.includes('<textarea'));
  assert.equal(html.includes('Sign in with Microsoft'), status !== 'checking' && status !== 'signing-in');
 }
 const authenticated=renderToStaticMarkup(setup('signed-in').tree);
 assert.ok(authenticated.includes('<textarea'));
 assert.ok(!authenticated.includes('Sign in with Microsoft'));
});
