const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict'),test=require('node:test');
const compiled=ts.transpileModule(fs.readFileSync('components/chatbot/Chatbot.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function setup(initialStatus = 'signed-in', initialMessages = [], initialFiles = []) {
 const states=[],listeners=new Map(),calls=[],fileCalls=[];let status=initialStatus,expires=false,arrayIndex=0;
 class E {constructor(type,options={}){this.type=type;this.detail=options.detail;}}
 class AuthError extends Error {}
 const window={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(){},dispatchEvent(event){listeners.get(event.type)?.(event);}};
 const ctx=vm.createContext({exports:{},crypto:require("node:crypto"),window,Event:E,CustomEvent:E,queueMicrotask,require(name){
  if(name==='react')return {Fragment:require('react').Fragment,useState(initial){const i=states.length;states.push(Array.isArray(initial) ? (arrayIndex++ === 0 ? initialMessages : initialFiles) : initial);return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef:current=>({current}),useEffect:fn=>fn(),useLayoutEffect:fn=>fn()};
  if(name==='next/navigation')return {usePathname:()=>'/'};
  if(name==='@/public/tnb-logo.png')return '/tnb-logo.png';
  if(name==='next/image')return ({src,alt,width,height})=>require('react').createElement('img',{src,alt,width,height});
  if(name==='@/lib/use-copilot-auth')return {useCopilotAuth:()=>({status})};
  if(name.endsWith('.css'))return {};
  if(name==='@/lib/chat-attachments')return {CHAT_FILE_ACCEPT:'.pdf,.txt',validateChatFiles:()=>{}};
  if(name==='@/services/chatbot-service') {
   // Choice replies must share the same request guard and auth-resume path as text.
   const submitChatChoice=async choice=>{calls.push(choice);if(expires){status='session-expired';throw new AuthError();}return {text:'Choice accepted'};};
   return {CopilotAuthRequiredError:AuthError,checkCopilotAuth:async()=>({status}),submitChatChoice,sendChatMessage:async(text,_context,files)=>{calls.push(text);fileCalls.push(files);if(expires){status='session-expired';throw new AuthError();}return {text:'Reply'};},requestCopilotRecommendations:async()=>{calls.push('get_recommendation');return {text:'Background reply',recommendationsPayload:{recommendations:[]}};},signInToCopilot:async()=>{},submitChatConsent:async()=>({text:'Consent reply'})};
  }
  return require(name);
 }});
 vm.runInContext(compiled,ctx);const tree=ctx.exports.default({});
 return {tree,states,calls,fileCalls,window,E,setStatus:value=>status=value,setExpiry:value=>expires=value,messages:()=>states.find(Array.isArray)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function choiceButton(tree, title) {
 if (!tree || typeof tree !== 'object') return null;
 if (Array.isArray(tree)) return tree.map(child=>choiceButton(child,title)).find(Boolean);
 if (tree.type==='button' && tree.props?.children===title) return tree;
 return choiceButton(tree.props?.children,title);
}
function findElement(tree, predicate) {
 if (!tree || typeof tree !== 'object') return null;
 if (Array.isArray(tree)) return tree.map(child=>findElement(child,predicate)).find(Boolean);
 if (predicate(tree)) return tree;
 return findElement(tree.props?.children,predicate);
}

test('file-only submission sends all files once and clears the queue after success',async()=>{
 const files=[{name:'January.pdf',size:100},{name:'February.pdf',size:200}];
 const env=setup('signed-in',[],files);
 const form=findElement(env.tree,node=>node.type==='form');
 form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});await tick();
 assert.equal(env.calls.length,1);assert.equal(env.fileCalls[0].length,2);
 assert.equal(env.messages().find(message=>message.sender==='user').attachments.length,2);
 assert.equal(env.states.filter(Array.isArray)[1].length,0);
});

test('draft cards sit in the composer and sent cards remain outside the user text bubble',()=>{
 const file={name:'Billing.pdf',size:138240};
 const env=setup('signed-in',[{id:'upload-1',sender:'user',text:'Review this bill',attachments:[{...file,file}]}],[file]);
 const form=findElement(env.tree,node=>node.type==='form');
 const bubble=findElement(env.tree,node=>node.type==='article');
 const isCard=node=>typeof node.type==='function' && node.type.name==='AttachmentCard';
 assert.ok(findElement(env.tree,isCard));
 assert.ok(findElement(form,isCard));
 assert.ok(!findElement(bubble,isCard));
 assert.ok(!findElement(form,node=>node.props?.['aria-label']==='Message attachments'));
 assert.ok(findElement(env.tree,node=>node.props?.['aria-label']==='Message attachments'));
 assert.ok(findElement(env.tree,node=>node.props?.['aria-label']==='Selected attachments'));
});

test('queued file bytes survive explicit sign-in without a duplicate user message',async()=>{
 const files=[{name:'January.pdf',size:100}];const env=setup('signed-in',[],files);
 env.setExpiry(true);findElement(env.tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});await tick();
 assert.equal(env.states.filter(Array.isArray)[1].length,0);
 assert.equal(env.messages().find(message=>message.sender==='user').attachments[0].file,files[0]);
 env.setStatus('signed-in');env.setExpiry(false);env.window.dispatchEvent(new env.E('copilot-authenticated'));await tick();
 assert.equal(env.fileCalls.length,2);assert.equal(env.fileCalls[1][0],files[0]);
 assert.equal(env.messages().filter(message=>message.sender==='user').length,1);
});

test('choice buttons submit once, show the label and retire after a successful answer',async()=>{
 const choice={title:'Air conditioning',type:'imBack',value:'Air Conditioning',activityId:'question-1'};
 const env=setup('signed-in',[{id:'question-1',sender:'assistant',text:'Choose an issue',choices:[choice]}]);
 const button=choiceButton(env.tree,choice.title);assert.ok(button);
 button.props.onClick();button.props.onClick();await tick();
 assert.equal(env.calls.length,1);assert.equal(env.calls[0].value,'Air Conditioning');
 assert.equal(env.messages().filter(m=>m.sender==='user').length,1);
 assert.equal(env.messages().find(m=>m.sender==='user').text,choice.title);
 assert.equal(env.messages()[0].choices,undefined);
});

test('a pending choice preserves its payload through explicit authentication',async()=>{
 const choice={title:'Equipment',type:'messageBack',value:{issue:'Equipment'},activityId:'question-2'};
 const env=setup('signed-in',[{id:'question-2',sender:'assistant',text:'Choose',choices:[choice]}]);
 env.setExpiry(true);choiceButton(env.tree,choice.title).props.onClick();await tick();
 env.setStatus('signed-in');env.setExpiry(false);env.window.dispatchEvent(new env.E('copilot-authenticated'));await tick();
 assert.equal(env.calls.length,2);assert.equal(env.calls[1].value.issue,'Equipment');
 assert.equal(env.messages().filter(m=>m.sender==='user').length,1);
});
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
