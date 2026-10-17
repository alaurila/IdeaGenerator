import { t } from './i18n.js';
import { placeTourBubble } from './tourPosition.js';

const STORAGE_KEY = 'gameIdeaGenerator.tour.v1';
const visible = element => element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';

export function initTour({offer, force = false, getEasyMode, setEasyMode}) {
  const root = document.getElementById('guided-tour');
  const bubble = document.getElementById('tour-bubble');
  const welcome = document.getElementById('tour-welcome');
  const help = document.getElementById('start-tour');
  const heading = document.getElementById('tour-heading');
  const copy = document.getElementById('tour-copy');
  const back = document.getElementById('tour-back');
  const next = document.getElementById('tour-next');
  let index = -1, target = null, previousDescription = null, frame = null, previousFocus = null;
  const query = selector => document.querySelector(selector);
  const steps = [
    {key:'easy',target:()=>query('#easy-mode'),action:'easyOn'},
    {key:'generate',target:()=>query('#generate-idea'),easy:true,action:'generate'},
    {key:'lock',target:()=>[...document.querySelectorAll('.card:not(.is-excluded) [data-action="lock"]')].find(visible)
      ?? query('.card[data-key="genres"]'),easy:true,action:'lock'},
    {key:'copy',target:()=>query('#copy-idea'),easy:true,action:'copy-idea'},
    {key:'prompt',target:()=>query('.prompt-section [data-copy-prompt]'),easy:true,action:'copyPrompt',
      prepare:()=>{query('.prompt-section').open=true;}},
    {key:'expand',target:()=>query('#easy-mode'),easy:true,action:'easyOff'},
    {key:'scores',target:()=>visible(query('#idea-scores')) ? query('#idea-scores .score-grid') : query('#generator-grid'),easy:false,
      prepare:()=>{query('#idea-scores').open=true;}},
    {key:'smart',target:()=>query('#smart-roll'),easy:false,action:'smart'},
    {key:'jam',target:()=>visible(query('#jam-panel')) ? query('#jam-hours') : query('#jam-toggle'),easy:false}
  ];

  function remember(value) { try { localStorage.setItem(STORAGE_KEY,value); } catch {} }

  function releaseTarget() {
    if (!target) return;
    if (previousDescription === null) target.removeAttribute('aria-describedby');
    else target.setAttribute('aria-describedby',previousDescription);
    target = null;
  }

  function setTarget(element) {
    if (element === target) return;
    releaseTarget();
    target = element;
    previousDescription = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby',[previousDescription,'tour-copy'].filter(Boolean).join(' '));
  }

  function labels() {
    const step = steps[index];
    heading.textContent = t(`tour.${step.key}.title`);
    let key = step.key;
    if (key === 'easy' && getEasyMode()) key = 'easyActive';
    if (key === 'scores' && !visible(query('#idea-scores'))) key = 'scoresEmpty';
    if (key === 'jam' && visible(query('#jam-panel'))) key = 'jamActive';
    copy.textContent = t(`tour.${key}.text`);
    document.getElementById('tour-progress').textContent = t('tour.progress',{step:index+1,total:steps.length});
    document.getElementById('tour-skip').textContent = t('tour.skip');
    back.textContent = t('tour.back');
    back.disabled = index === 0;
    next.textContent = t(index === steps.length-1 ? 'tour.done' : 'tour.next');
  }

  function refresh() {
    frame = null;
    if (index < 0) return;
    // Native dialogs must stay in charge of focus and confirmation.
    if (document.querySelector('dialog[open]')) {
      if (!root.hidden) root.hidden = true;
      return;
    }
    const element = steps[index].target();
    if (!visible(element)) {
      if (!root.hidden) root.hidden = true;
      return;
    }
    if (root.hidden) root.hidden = false;
    const changed = element !== target;
    setTarget(element);
    if (changed) element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
    labels();
    const viewport = {width:document.documentElement.clientWidth,height:window.innerHeight};
    let rect = element.getBoundingClientRect();
    if (rect.top<12 || rect.bottom>viewport.height-12 || rect.left<12 || rect.right>viewport.width-12) {
      element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
      rect = element.getBoundingClientRect();
    }
    const bounds = bubble.getBoundingClientRect();
    let placement = placeTourBubble(rect,bounds,viewport);
    const overlaps = placement.x < rect.right && placement.x+bounds.width > rect.left &&
      placement.y < rect.bottom && placement.y+bounds.height > rect.top;
    if (overlaps && rect.height+bounds.height+40 <= viewport.height) {
      window.scrollBy({top:rect.top-12,behavior:'instant'});
      rect = element.getBoundingClientRect();
      placement = placeTourBubble(rect,bounds,viewport);
    }
    bubble.style.left = `${placement.x}px`;
    bubble.style.top = `${placement.y}px`;
    bubble.dataset.side = placement.side;
    bubble.style.setProperty('--tour-arrow',`${placement.arrow}px`);
    const pad = 4;
    const left = Math.max(0,rect.left-pad), right = Math.min(viewport.width,rect.right+pad);
    const top = Math.max(0,rect.top-pad), bottom = Math.min(viewport.height,rect.bottom+pad);
    const boxes = {
      top:[0,0,viewport.width,top], bottom:[0,bottom,viewport.width,viewport.height-bottom],
      left:[0,top,left,bottom-top], right:[right,top,viewport.width-right,bottom-top],
      highlight:[left,top,right-left,bottom-top]
    };
    for (const [key,[x,y,width,height]] of Object.entries(boxes)) {
      const node = root.querySelector(`[data-tour-box="${key}"]`);
      Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${Math.max(0,width)}px`,height:`${Math.max(0,height)}px`});
    }
    if (changed) heading.focus({preventScroll:true});
  }

  function schedule() {
    if (index >= 0 && frame === null) frame = requestAnimationFrame(refresh);
  }

  function showStep(value) {
    releaseTarget();
    index = value;
    const step = steps[index];
    if (step.easy !== undefined) setEasyMode(step.easy);
    step.prepare?.();
    refresh();
    if (!root.hidden) heading.focus({preventScroll:true});
  }

  function stop(completed = false) {
    index = -1;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    root.hidden = true;
    releaseTarget();
    remember(completed ? 'completed' : 'skipped');
    const focus = visible(previousFocus) ? previousFocus : help;
    focus.focus({preventScroll:true});
    focus.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }

  function start() {
    if (index >= 0) return;
    previousFocus = document.activeElement === document.body ? help : document.activeElement;
    remember('started');
    showStep(0);
  }

  function action(name) {
    if (index >= 0 && steps[index].action === name) {
      showStep(index+1);
    } else schedule();
  }

  help.addEventListener('click',start);
  back.addEventListener('click',()=>{if(index>0)showStep(index-1);});
  next.addEventListener('click',()=>{if(index === steps.length-1)stop(true);else if(index>=0)showStep(index+1);});
  document.getElementById('tour-skip').addEventListener('click',()=>stop());
  welcome.addEventListener('close',()=>{
    const begin = welcome.returnValue === 'start';
    welcome.returnValue = '';
    remember('skipped');
    if (begin) start();
  });
  document.addEventListener('keydown',event=>{
    if (index<0 || root.hidden) return;
    if (event.key === 'Escape') {event.preventDefault();stop();}
    if (event.key !== 'Tab') return;
    const targetButtons = target.matches('button,select,input,summary,a[href]') ? [target] :
      [...target.querySelectorAll('button,select,input,summary,a[href]')];
    const focusable = [...targetButtons,...bubble.querySelectorAll('button')].filter(node=>visible(node)&&!node.disabled);
    if (!focusable.length) return;
    const current = focusable.indexOf(document.activeElement);
    const following = current < 0 ? (event.shiftKey ? focusable.length-1 : 0) :
      (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
    event.preventDefault();
    focusable[following].focus({preventScroll:true});
  });
  window.addEventListener('resize',schedule);
  document.addEventListener('scroll',schedule,true);
  window.visualViewport?.addEventListener('resize',schedule);
  const observer = new MutationObserver(records=>{
    if (index>=0 && records.some(record=>!root.contains(record.target))) schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,
    attributeFilter:['open','hidden','class','disabled','aria-pressed']});
  help.disabled = false;
  let seen = false;
  try {seen=Boolean(localStorage.getItem(STORAGE_KEY));} catch {}
  if (force) start();
  else if (offer && !seen) welcome.showModal();
  return {action,refresh:schedule};
}
