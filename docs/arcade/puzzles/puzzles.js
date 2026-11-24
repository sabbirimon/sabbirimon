const words=[['signal','It carries information through a circuit.'],['pixel','One picture element.'],['router','It forwards packets between networks.'],['memory','A computer keeps working data here.'],['orbit','A satellite follows this path.'],['kernel','The core of an operating system.'],['sensor','It measures a physical quantity.'],['binary','A number system with two digits.'],['voltage','Electric potential difference.'],['cache','A fast store for frequently used data.'],['planet','A world that orbits a star.'],['forest','Many trees make one.']];
const symbols=['Moon','Star','Leaf','Wave','Sun','Bolt'];
const get=id=>document.getElementById(id),mode=get('game'),input=get('answer').querySelector('input');
function shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
let deck,round,points,target,locked,first,matches,timer,moves;
function stats(){get('stats').textContent=mode.value==='pairs'?matches+' of 6 pairs · '+moves+(moves===1?' turn':' turns'):'Puzzle '+(round+1)+' of 5 · '+points+' solved'}
function next(){
  clearTimeout(timer);locked=false;first=null;matches=0;moves=0;get('next').hidden=true;get('answer').hidden=mode.value==='pairs';get('cards').replaceChildren();get('result').textContent='';get('prompt').textContent='';input.value='';stats();
  if(mode.value==='pairs'){
    get('clue').textContent='Turn over two cards and find the six matching pairs.';
    for(const [i,word] of shuffle([...symbols,...symbols]).entries()){
      const card=document.createElement('button');card.type='button';card.textContent='?';card.setAttribute('aria-label','Face-down card '+(i+1));
      card.onclick=()=>{
        if(locked||card.disabled)return;card.textContent=word;card.setAttribute('aria-label',word);card.disabled=true;
        if(!first){first=card;return}moves++;const previous=first;first=null;
        if(previous.textContent===word){matches++;get('result').textContent=matches===6?'Board complete in '+moves+' turns.':'Pair found.'}
        else{locked=true;get('result').textContent='Try another pair.';timer=setTimeout(()=>{for(const c of [previous,card]){c.disabled=false;c.textContent='?';c.setAttribute('aria-label','Face-down card '+(Array.from(get('cards').children).indexOf(c)+1))}locked=false},850)}stats();
      };get('cards').append(card);
    }return;
  }
  if(mode.value==='pattern'){
    const start=2+Math.floor(Math.random()*8),step=2+Math.floor(Math.random()*4),kind=deck[round]%3;
    const values=Array.from({length:5},(_,i)=>kind===0?start+i*step:kind===1?start*step**i:start+step*i*(i+1)/2);
    target=String(values.pop());get('prompt').textContent=values.join(' · ')+' · ?';get('clue').textContent=['Add the same amount at each step.','Multiply by the same factor.','The gaps grow by a constant amount.'][kind];input.inputMode='numeric';
  }else{
    const [word,hint]=words[deck[round]];target=word;let letters=shuffle(word).join('');
    if(letters===word)letters=word.slice(1)+word[0];
    get('prompt').textContent=(mode.value==='scramble'?letters:word.replace(/[aeiou]/g,'_')).toUpperCase();get('clue').textContent=hint;input.inputMode='text';
  }
}
function reset(){round=0;points=0;deck=shuffle(words.map((_,i)=>i));get('title').textContent=mode.selectedOptions[0].textContent;next()}
get('answer').onsubmit = event => {
  event.preventDefault();
  if (locked) return;
  if (input.value.trim().toLowerCase() !== target) {
    get('result').textContent='Try again. Check the clue above.';
    input.select();
    input.focus();
    return;
  }
  locked=true;
  points++;
  stats();
  const finished=round===4;
  get('answer').hidden=true;
  get('result').textContent=finished?'Five solved. Round complete!':'Correct!';
  get('next').hidden=finished;
  get(finished?'restart':'next').focus();
};
get('next').onclick=()=>{round++;next();input.focus()};get('restart').onclick=mode.onchange=reset;reset();
