const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min,max)));

// Viewport coordinates only: usable independently of the DOM.
export function placeTourBubble(anchor, bubble, viewport, preferred = 'bottom') {
  const margin = 12, gap = 16;
  const centerX = anchor.left + anchor.width/2;
  const centerY = anchor.top + anchor.height/2;
  const candidates = {
    bottom: {x:centerX-bubble.width/2,y:anchor.bottom+gap},
    top: {x:centerX-bubble.width/2,y:anchor.top-gap-bubble.height},
    right: {x:anchor.right+gap,y:centerY-bubble.height/2},
    left: {x:anchor.left-gap-bubble.width,y:centerY-bubble.height/2}
  };
  const order = [...new Set([preferred,'bottom','top','right','left'])];
  const options = order.map(side => {
    const point = candidates[side];
    const x = clamp(point.x,margin,viewport.width-bubble.width-margin);
    const y = clamp(point.y,margin,viewport.height-bubble.height-margin);
    const overlapX = Math.max(0,Math.min(x+bubble.width,anchor.right)-Math.max(x,anchor.left));
    const overlapY = Math.max(0,Math.min(y+bubble.height,anchor.bottom)-Math.max(y,anchor.top));
    const displacement = Math.abs(x-point.x)+Math.abs(y-point.y);
    return {side,x,y,cost:overlapX*overlapY*100+displacement};
  });
  // Prefer a fitting side, allowing sideways shifts near the viewport's edges.
  const fits = option => option.side === 'bottom' ? option.y >= anchor.bottom+gap :
    option.side === 'top' ? option.y+bubble.height <= anchor.top-gap :
    option.side === 'right' ? option.x >= anchor.right+gap : option.x+bubble.width <= anchor.left-gap;
  const chosen = options.find(fits) ?? options.sort((a,b)=>a.cost-b.cost)[0];
  const horizontal = chosen.side === 'bottom' || chosen.side === 'top';
  const arrow = clamp(horizontal ? centerX-chosen.x : centerY-chosen.y,20,
    (horizontal ? bubble.width : bubble.height)-20);
  return {side:chosen.side,x:chosen.x,y:chosen.y,arrow};
}
