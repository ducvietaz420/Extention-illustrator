(function (toolkit) {
  'use strict';

  const {h,grid,details,hint,anchors} = toolkit;
  const example = 'CO-CHAIR\nMALAYSIA;\nCO-CHAIR\nCHINA;\nCHINA;\nASEAN\nSECRETARIAT';
  let draft = '';

  function fillList(view) {
    const input = h('textarea',{
      id:'fill-list-entries',rows:6,spellcheck:false,placeholder:'Dán danh sách của bạn',
      'aria-describedby':'fill-list-directions'
    });
    input.value = draft;
    input.addEventListener('input',() => {
      draft = input.value;
      view.invalidate();
    });

    const body = h('div',{},
      h('p',{className:'workflow'},h('strong',{},'Cách dùng'),
        'Dùng mũi tên đen (V), giữ Shift để chọn các khung chữ cần điền trên cùng một artboard mẫu. Dán danh sách, bấm Xem trước rồi Tạo artboard. Chữ tràn ở bản mới sẽ tự co cỡ.'),
      h('div',{className:'field'},
        h('label',{for:input.id},'Danh sách tên hoặc nội dung'),input,
        h('p',{className:'hint',id:'fill-list-directions'},'Dùng dấu ',h('code',{},';'),
          ' để tách các mục. Nhấn Enter để xuống dòng trong cùng một mục. Mỗi mục tạo một artboard và được điền vào mọi khung đã chọn.')),
      details('Ví dụ danh sách',
        h('pre',{className:'fill-example'},example),
        hint('Ví dụ này tạo 4 artboard. Bản mới đầu tiên có hai dòng CO-CHAIR và MALAYSIA.')),
      details('Thiết lập dàn trang',grid(
        view.field('columns','Số cột',{type:'number',value:4,props:{min:1,max:24,step:1}}),
        view.field('gapMm','Khoảng cách (mm)',{type:'number',value:5,props:{min:0,max:1000,step:'any'}}),
        view.field('anchor','Giữ điểm neo của chữ',{
          options:anchors,value:'mc',full:true,
          help:'Chọn Tâm để giữ tâm của từng khung chữ điểm theo mẫu. Chữ vùng giữ vị trí khung.'
        })
      )),
      hint('Với biển gấp, chọn chữ ở cả hai mặt. Mỗi khung giữ định dạng và góc xoay riêng. Trong từng khung, dùng một font, một cỡ chữ và cách căn thống nhất.'));

    return toolkit.setupPlan(view,body,{
      scan:'scanFill',apply:'applyFill',cancel:'cancelFill',batch:1,
      scanLabel:'Xem trước',applyLabel:'Tạo artboard',options:{fill:true,item:'artboard sẽ tạo'},
      payload:() => {
        if (!input.value.trim()) throw new Error('Dán danh sách tên hoặc nội dung trước khi xem.');
        const columns = Number(view.get('columns'));
        if (!Number.isInteger(columns) || columns < 1 || columns > 24) throw new Error('Nhập số cột từ 1 đến 24.');
        const gap = view.get('gapMm').trim();
        const gapMm = Number(gap);
        if (!gap || !Number.isFinite(gapMm) || gapMm < 0 || gapMm > 1000) throw new Error('Nhập khoảng cách từ 0 đến 1000 mm.');
        return {list:input.value,columns,gapMm,anchor:view.get('anchor')};
      }
    });
  }

  toolkit.tools.push({id:'fill-list',label:'Điền theo danh sách',render:fillList});
}(window.EventToolkit));
