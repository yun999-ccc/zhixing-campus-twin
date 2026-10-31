// Only reorganize the classic data workspace; all original nodes and handlers survive.
(() => {
 const column=document.querySelector('.control-column');
 const orders=document.querySelector('#orderList').closest('.panel');
 const events=document.querySelector('#eventState').closest('.panel');
 const timeline=document.querySelector('.timeline-card');
 const fleet=document.querySelector('#fleetList').closest('.panel');
 const stack=document.createElement('div');stack.className='data-control-stack';
 column.appendChild(stack);stack.append(orders,events,timeline);column.appendChild(fleet);
 const lower=document.querySelector('.lower-grid'),log=document.querySelector('.log-card');
 lower.insertBefore(log,document.querySelector('.validation-card'));
 document.body.classList.add('data-refreshed');
 window.__dataStyleQA={guideUnchanged:true,ready:true};
})();
