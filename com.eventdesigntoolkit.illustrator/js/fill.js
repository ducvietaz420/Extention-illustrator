(function (toolkit) {
  'use strict';

  const {h,grid,details,hint,anchors} = toolkit;
  const example = 'CO-CHAIR\nMALAYSIA;\nCO-CHAIR\nCHINA;\nCHINA;\nASEAN\nSECRETARIAT';
  const bilingualExample = 'ÔNG\nSHAMSUL BAHRI KAMIS | MR.\nSHAMSUL BAHRI KAMIS;\nBÀ\nNGUYỄN THỊ ANH | MS.\nNGUYỄN THỊ ANH';
  let draft = '';

  function fillList(view) {
    const bilingual = () => view.get('mode') === 'bilingual';
    const mode = view.field('mode','Cách điền',{
      value:'shared',full:true,options:[['shared','Cùng nội dung cho các khung'],['bilingual','Hai mặt Việt–Anh']]
    });
    const position = view.field('viPosition','Vị trí khung tiếng Việt',{
      value:'bottom',full:true,options:[['bottom','Ở dưới'],['top','Ở trên'],['left','Ở trái'],['right','Ở phải']],
      visibleWhen:bilingual,
      help:'Chọn vị trí của khung tiếng Việt so với khung tiếng Anh trên artboard mẫu.'
    });
    const input = h('textarea',{
      id:'fill-list-entries',rows:6,spellcheck:false,placeholder:'Dán danh sách của bạn',
      'aria-describedby':'fill-list-directions'
    });
    input.value = draft;
    input.addEventListener('input',() => {
      draft = input.value;
      view.invalidate();
    });
    const steps = h('span',{});
    const ordinaryDirections = h('span',{},'Dùng dấu ',h('code',{},';'),
      ' để tách các mục. Nhấn Enter để xuống dòng trong cùng một mục. Mỗi mục tạo một artboard và được điền vào mọi khung đã chọn.');
    const bilingualDirections = h('span',{},'Nhập tiếng Việt trước dấu ',h('code',{},'|'),
      ', tiếng Anh sau dấu ',h('code',{},'|'),'. Dùng dấu ',h('code',{},';'),
      ' để tách các biển. Nhấn Enter để xuống dòng trong từng mặt.');
    const sample = h('pre',{className:'fill-example'});
    const sampleNote = hint('');
    view.conditions.push([ordinaryDirections,() => !bilingual()],[bilingualDirections,bilingual],[steps,() => {
      const paired = bilingual();
      steps.textContent = paired
        ? 'Dùng mũi tên đen (V), giữ Shift để chọn đúng hai khung chữ trên cùng một artboard mẫu. Chọn vị trí khung tiếng Việt, dán danh sách rồi bấm Xem trước.'
        : 'Dùng mũi tên đen (V), giữ Shift để chọn các khung chữ cần điền trên cùng một artboard mẫu. Dán danh sách, bấm Xem trước rồi Tạo artboard.';
      sample.textContent = paired ? bilingualExample : example;
      sampleNote.textContent = paired
        ? 'Ví dụ này tạo 2 artboard. Ở biển đầu, mặt tiếng Việt có ÔNG và mặt tiếng Anh có MR. trên dòng đầu.'
        : 'Ví dụ này tạo 4 artboard. Bản mới đầu tiên có hai dòng CO-CHAIR và MALAYSIA.';
      return true;
    }]);

    const body = h('div',{},
      h('p',{className:'workflow'},h('strong',{},'Cách dùng'),steps),
      grid(mode,position),
      h('div',{className:'field'},
        h('label',{for:input.id},'Danh sách tên hoặc nội dung'),input,
        h('p',{className:'hint',id:'fill-list-directions'},ordinaryDirections,bilingualDirections)),
      details('Ví dụ danh sách',sample,sampleNote),
      details('Thiết lập dàn trang',grid(
        view.field('columns','Số cột',{type:'number',value:4,props:{min:1,max:24,step:1}}),
        view.field('gapMm','Khoảng cách (mm)',{type:'number',value:5,props:{min:0,max:1000,step:'any'}}),
        view.field('anchor','Giữ điểm neo của chữ',{
          options:anchors,value:'mc',full:true,
          help:'Chọn Tâm để giữ tâm của từng khung chữ điểm theo mẫu. Chữ vùng giữ vị trí khung.'
        })
      )),
      hint('Với biển gấp, chọn chữ ở cả hai mặt. Trong từng khung, dùng một font, một cỡ chữ và cách căn thống nhất. Khi tự co cỡ chữ, Toolkit giảm cả giãn dòng theo cùng tỷ lệ.'));

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
        const payload = {list:input.value,columns,gapMm,anchor:view.get('anchor')};
        if (bilingual()) {
          payload.mode = 'bilingual';
          payload.viPosition = view.get('viPosition');
        }
        return payload;
      }
    });
  }

  toolkit.tools.push({id:'fill-list',label:'Điền theo danh sách',render:fillList});
}(window.EventToolkit));
