const key='imon-privacy-v1';
let memory=null;
export function choices(){
  try{
    const value=JSON.parse(localStorage.getItem(key));
    if(value && typeof value.weather==='boolean' && typeof value.metrics==='boolean')return value;
  }catch{}
  return memory;
}
export function saveChoices(weather,metrics){
  memory={weather,metrics};
  try{localStorage.setItem(key,JSON.stringify(memory));}catch{}
  document.dispatchEvent(new CustomEvent('imon:privacy',{detail:memory}));
}
globalThis.window?.addEventListener('storage',event=>{
  if(event.key===key||event.key===null){memory=null;document.dispatchEvent(new CustomEvent('imon:privacy',{detail:choices()}));}
});
