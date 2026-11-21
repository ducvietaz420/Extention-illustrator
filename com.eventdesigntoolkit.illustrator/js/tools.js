(function (toolkit) {
  'use strict';

  const {h,grid,details,hint,button,anchors} = toolkit;
  const sizeKinds = [['absolute','Đặt cỡ chữ'],['delta','Tăng hoặc giảm theo pt'],['percent','Nhân theo phần trăm'],['sample','Dùng cỡ của mẫu']];
  const sizeModes = [['bothProportional','Rộng × Cao, giữ tỷ lệ'],['width','Theo chiều rộng, giữ tỷ lệ'],['height','Theo chiều cao, giữ tỷ lệ'],['exact','Khớp chính xác Rộng × Cao']];
  const positions = [['distance','Giữ khoảng cách từ mốc'],['ratio','Giữ tỷ lệ theo artboard'],['anchor','Độ lệch nhập tay']];
  let textSample;
  let syncSample;

  const group = (...children) => h('div',{},...children);
  const workflow = (text) => h('p',{className:'workflow'},h('strong',{},'Cách dùng'),text);
  const textModeHelp = {
    absolute:'Ví dụ nhập 36 để đặt mọi ký tự trong phạm vi về 36 pt.',
    delta:'Ví dụ nhập 2 để tăng 2 pt, hoặc nhập -2 để giảm 2 pt.',
    percent:'Ví dụ nhập 150 để tăng cỡ lên 1,5 lần. Chữ 24 pt thành 36 pt.',
    sample:'Chọn một khung chữ có cùng cỡ, bấm Lấy cỡ chữ mẫu rồi chọn các khung cần đổi.'
  };
  const sizeModeHelp = {
    bothProportional:'Ví dụ mẫu Rộng 10 × Cao 9 cm. Đối tượng cùng tỷ lệ sẽ khớp cả hai chiều. Đối tượng khác tỷ lệ sẽ được báo trong kế hoạch.',
    width:'Chỉ khớp chiều rộng. Chiều cao thay đổi theo cùng tỷ lệ để giữ dáng.',
    height:'Chỉ khớp chiều cao. Chiều rộng thay đổi theo cùng tỷ lệ để giữ dáng.',
    exact:'Khớp cả hai chiều của mẫu. Khác tỷ lệ có thể làm hình hoặc chữ bị bè hay dẹt.'
  };
  const positionHelp = {
    distance:'Ví dụ chọn Trên trái cho cả hai mốc. Nếu logo mẫu cách trái 2 cm và cách trên 3 cm, logo đích cũng cách hai mép đúng 2 cm và 3 cm.',
    ratio:'Giữ vị trí tương đối khi artboard có kích thước khác nhau. Ví dụ chọn mốc artboard Trên trái. Điểm neo của mẫu ở 50% chiều ngang và 15% từ mép trên sẽ tới cùng tỷ lệ trên artboard đích.',
    anchor:'Đặt điểm neo của đối tượng theo mốc artboard và hai số bạn nhập. Cả hai số bằng 0 sẽ đưa hai điểm trùng nhau.'
  };
  const matchModeHelp = {
    sample:'Ưu tiên vai trò đã gán trên mẫu. Nếu mẫu chưa có vai trò, dùng tên đối tượng trong bảng Layers.',
    role:'Tìm đối tượng có đúng vai trò bạn nhập. Để trống ô vai trò nếu muốn dùng vai trò có sẵn của mẫu.',
    name:'Tìm theo tên đối tượng trong bảng Layers. Để trống ô tên nếu muốn dùng tên của mẫu.'
  };
  const sampleTypes = {
    GroupItem:'Nhóm', TextFrame:'Khung chữ', PathItem:'Hình vector',
    CompoundPathItem:'Hình vector ghép', PlacedItem:'Ảnh hoặc tệp liên kết', RasterItem:'Ảnh raster'
  };

  function numberField(view,key,label,value,options = {}) {
    const props = Object.assign({step:'any'}, options.props);
    return view.field(key,label,Object.assign({type:'number',value}, options, {props}));
  }

  function numberValue(view,key) {
    const value = view.get(key).trim();
    if (!value || !Number.isFinite(Number(value))) throw new Error('Nhập một giá trị số hợp lệ.');
    return Number(value);
  }

  function current(captured) {
    return captured && captured.document === toolkit.docKey() ? captured : null;
  }

  function textSize(view) {
    const visible = value => () => view.get('kind') === value;
    const sampleCaption = hint('');
    const sampleBox = group(button('Lấy cỡ chữ mẫu',() => toolkit.execute(view,async () => {
      const {data} = await toolkit.request('captureTextStyle');
      textSample = Object.assign({}, data, {document:toolkit.docKey()});
      view.invalidate();
      view.update();
    })),sampleCaption);
    view.conditions.push([sampleBox,() => {
      const captured = current(textSample);
      sampleCaption.textContent = captured ? `${captured.name || 'Mẫu'} · ${captured.size} pt` : 'Chọn một khung chữ trong Illustrator để lấy mẫu.';
      return visible('sample')();
    }]);
    const body = group(
      workflow('Dùng mũi tên đen (V) để chọn một hoặc nhiều khung chữ, rồi chọn phạm vi và cách đổi cỡ. Bấm Xem kế hoạch để kiểm tra, sau đó bấm Áp dụng.'),
      view.scope('text'),grid(
      view.field('kind','Cách đổi cỡ',{options:sizeKinds,full:true,help:() => textModeHelp[view.get('kind')]}),
      numberField(view,'absolute','Cỡ mới (pt)',36,{props:{min:0.1,max:1296},visibleWhen:visible('absolute')}),
      numberField(view,'delta','Tăng hoặc giảm (pt)',2,{visibleWhen:visible('delta')}),
      numberField(view,'percent','Tỷ lệ (%)',150,{props:{min:0.01},visibleWhen:visible('percent')}),
      view.field('anchor','Giữ điểm neo',{options:anchors,value:'tc',full:true,
        help:'Điểm neo là điểm đứng yên khi chữ to hoặc nhỏ đi. Chọn Trên giữa để giữ giữa mép trên, như khi tăng cỡ tên đã căn giữa trên biển.'})
    ),sampleBox);
    return toolkit.setupPlan(view,body,{
      scan:'scanText',apply:'applyText',cancel:'cancelText',batch:25,
      options:{item:'khung chữ'},
      payload:() => {
        const kind = view.get('kind');
        if (kind === 'sample' && !current(textSample)) throw new Error('Chọn một khung chữ rồi bấm Lấy cỡ chữ mẫu.');
        const operation = kind === 'sample' ? {kind} : {kind,value:numberValue(view,kind)};
        return {scope:view.scopePayload(),operation,anchor:view.get('anchor'),boundsMode:'geometric'};
      }
    });
  }

  function capturedMatch(view, sample) {
    const mode = view.get('matchMode');
    const explicit = view.get(mode === 'name' ? 'name' : 'role').trim();
    if (mode === 'role') return {matchMode:'role',role:explicit || sample.role};
    if (mode === 'name') return {matchMode:'name',name:explicit || sample.objectName};
    return sample.role ? {matchMode:'role',role:sample.role} : {matchMode:'name',name:sample.objectName};
  }

  function syncMatch(view) {
    const role = view.field('role','Vai trò của đối tượng',{
      namespace:'sync',full:true,props:{placeholder:'Ví dụ ten_dai_bieu'},
      help:'Vai trò là nhãn chung do bạn đặt. Ví dụ hai khung chữ ghi “An” và “Bình” có thể cùng mang vai trò ten_dai_bieu.'
    });
    const name = view.field('name','Tên trong bảng Layers',{
      namespace:'sync',full:true,props:{placeholder:'Tên đối tượng mẫu'},visibleWhen:() => view.get('matchMode') === 'name',
      help:'Trong Illustrator, mở Window → Layers (Cửa sổ → Lớp) và đặt cùng tên cho các đối tượng cần ghép.'
    });
    return details('Nhận diện và gán vai trò',
      hint('Phần này giúp Toolkit tìm đúng đối tượng tương ứng với mẫu trên từng trang.'),
      grid(view.field('matchMode','Ghép đối tượng',{namespace:'sync',full:true,help:() => matchModeHelp[view.get('matchMode')],options:[
        ['sample','Dùng vai trò hoặc tên của mẫu'],['role','Theo vai trò'],['name','Theo tên đối tượng']
      ]}),role,name),
      button('Gán vai trò cho đối tượng đang chọn',() => toolkit.execute(view,async () => {
        const roleName = view.get('role').trim();
        if (!roleName) throw new Error('Nhập vai trò và chọn các đối tượng cần gán trong Illustrator.');
        const {data} = await toolkit.request('roleAssign',{role:roleName});
        view.invalidate();
        if (data.count > 0) syncSample = null;
        view.update();
        const count = data.count || 0;
        const skipped = (data.skipped || []).length;
        const message = count > 0 ? `Đã gán vai trò cho ${count} đối tượng. Chọn lại đối tượng mẫu.` : 'Không có đối tượng nào được gán vai trò mới.';
        toolkit.notify(view,message + (skipped ? ` Bỏ qua ${skipped} đối tượng.` : ''));
      })),
      hint('Để gán vai trò, chọn cả mẫu lẫn các đối tượng tương ứng bằng mũi tên đen (V), nhập cùng một nhãn rồi bấm nút trên. Chọn riêng mẫu và bấm Lấy làm mẫu lại.'),
      hint('Mỗi artboard đích cần đúng một đối tượng khớp. Nếu thiếu hoặc trùng, Xem kế hoạch sẽ cho biết artboard cần kiểm tra.'));
  }

  function syncOptions(view, isSize) {
    const anchor = view.field('objectAnchor',isSize ? 'Giữ điểm neo' : 'Điểm neo đối tượng',{
      options:anchors,value:'mc',full:true,
      help:isSize
        ? 'Đây là điểm đứng yên trên khung bao khi đổi kích thước. Chọn Tâm để đối tượng lớn lên quanh tâm hoặc Trên trái để giữ góc trên bên trái.'
        : 'Chọn điểm trên khung bao của đối tượng dùng để đo vị trí. Ví dụ chọn Tâm để căn theo giữa đối tượng, hoặc Trên giữa để căn theo giữa mép trên.'
    });
    if (isSize) {
      return grid(view.field('sizeMode','Cách khớp kích thước',{
        options:sizeModes,full:true,help:() => sizeModeHelp[view.get('sizeMode')]
      }),anchor);
    }
    const manual = () => view.get('mode') === 'anchor';
    return details('Điểm neo và cách căn',grid(
      view.field('mode','Cách tính vị trí',{options:positions,full:true,help:() => positionHelp[view.get('mode')]}),
      view.field('artboardAnchor','Mốc artboard',{options:anchors,value:'tl',full:true,
        help:'Chọn điểm trên trang dùng làm gốc đo. Ví dụ Trên trái đo từ góc trên bên trái của mỗi artboard.'}),
      anchor,
      numberField(view,'offsetX','Độ lệch ngang (cm)',0,{visibleWhen:manual,help:'Số dương sang phải, số âm sang trái.'}),
      numberField(view,'offsetY','Độ lệch dọc (cm)',0,{visibleWhen:manual,help:'Số dương đi xuống, số âm đi lên.'})
    ));
  }

  function sync(view,isSize) {
    const sampleName = h('p',{className:'sample-name'});
    const measurement = h('p',{className:'sample-measurement'});
    const sample = h('section',{className:'sample'},
      button('Lấy làm mẫu',() => toolkit.execute(view,async () => {
        const response = await toolkit.request('captureSample',{boundsMode:'geometric',unit:'cm'});
        syncSample = Object.assign({}, response.data, {document:toolkit.docKey()});
        view.invalidate();
        view.update();
        if (response.warnings.length) toolkit.notify(view,response.warnings.join('\n'),'warn');
      })),sampleName,measurement);
    view.conditions.push([sample,() => {
      const captured = current(syncSample);
      sampleName.textContent = captured
        ? `${captured.objectName || sampleTypes[captured.typename] || 'Đối tượng mẫu'} · Artboard ${captured.boardNumber}${captured.role ? ' · ' + captured.role : ''}`
        : 'Chọn đúng một đối tượng để làm mẫu.';
      const valid = captured && Number.isFinite(captured.width) && Number.isFinite(captured.height);
      measurement.textContent = valid ? toolkit.readDimension(captured.width,captured.height,captured.unit || 'cm') : '';
      measurement.hidden = !valid;
      return true;
    }]);
    const matchControls = syncMatch(view);
    view.conditions.push([matchControls,() => view.get('scope') !== 'selection']);
    const intro = isSize
      ? 'Dùng mũi tên đen (V) chọn logo, nhóm vector hoặc khung chữ vừa ý rồi bấm Lấy làm mẫu. Chọn các đối tượng đích, cách khớp Rộng × Cao và điểm neo. Bấm Xem kế hoạch rồi Áp dụng.'
      : 'Chọn một đối tượng đã đặt đúng chỗ bằng mũi tên đen (V) rồi bấm Lấy làm mẫu. Chọn artboard đích (trang thiết kế), cách căn và cách nhận diện. Bấm Xem kế hoạch rồi Áp dụng.';
    const body = group(workflow(intro),sample,view.scope(isSize ? 'size' : 'position'),syncOptions(view,isSize),
      isSize ? hint('Cả nhóm được đo như một khối. Chữ điểm và chữ vùng độc lập vẫn sửa được sau khi đổi kích thước. Để nhập cỡ font theo pt, mở tab Đổi cỡ chữ.') : null,
      matchControls);
    return toolkit.setupPlan(view,body,{
      scan:'scanSync',apply:'applySync',cancel:'cancelSync',batch:16,
      options:{size:isSize,position:!isSize,select:true,item:'đối tượng sẵn sàng'},
      payload:() => {
        const captured = current(syncSample);
        if (!captured) throw new Error('Chọn đối tượng nguồn rồi bấm Lấy làm mẫu.');
        const scope = view.scopePayload();
        const match = scope.kind === 'selection' ? {} : capturedMatch(view,captured);
        if (scope.kind !== 'selection' && !match.role && !match.name) {
          throw new Error('Đặt tên đối tượng mẫu hoặc gán cùng vai trò cho các đối tượng cần ghép.');
        }
        const common = Object.assign(match, {scope,objectAnchor:view.get('objectAnchor'),boundsMode:'geometric',unit:'cm'});
        if (isSize) return Object.assign(common, {purpose:'size',sizeMode:view.get('sizeMode')});
        const mode = view.get('mode');
        const offsets = mode === 'anchor' ? {offsetX:numberValue(view,'offsetX'),offsetY:numberValue(view,'offsetY')} : {};
        return Object.assign(common, offsets, {purpose:'position',mode,artboardAnchor:view.get('artboardAnchor')});
      }
    });
  }

  toolkit.tools.push(
    {id:'text-size',label:'Đổi cỡ chữ',render:textSize},
    {id:'sync-position',label:'Đồng bộ vị trí',render:view => sync(view,false)},
    {id:'sync-size',label:'Đồng bộ kích thước',render:view => sync(view,true)}
  );
}(window.EventToolkit));
